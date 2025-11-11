# sayCast Architecture Plan

## Repository status
- No existing Raycast utility code was found in `/Users/callum2/bronson/sayCast/sayCast` (only `.git` metadata), so we start from a clean slate.
- Assumption: your Raycast extensions and command dictionaries exist outside this repo; we will integrate by invoking the Raycast CLI or AppleScript hooks.

## Goals
1. While `Control + Option + S` are held, capture live microphone audio, transcribe it via Wispr Flow (preferred) or OpenAI Speech-to-Text, and stream the transcript.
2. Render the live transcript in a small HUD anchored to the top-right of the screen.  
   - Default text color = neutral.  
   - Turn green when the utterance maps to a Raycast command, red with “Unable to Map” when it does not.  
3. When the hotkey is released (or a timeout triggers), execute the mapped Raycast command with best-effort recovery and feedback.
4. Launch automatically on login eventually; during development it can be started from the terminal.

## High-level architecture
```
[Global Hotkey + Audio Helper (Swift)]  <--event/pcm-->  [Node/TS Core Service]
                                                       /         \
                                           [Wispr/OpenAI STT]   [HUD Overlay (Electron/Vite/TS)]
                                                       \
                                           [Command Mapper & Raycast Runner]
```

- **Native helper (Swift)**: a lightweight menubar-less agent that installs a CGEvent tap to watch for `Control + Option + S` and streams mic audio via `AVAudioEngine`. Communicates with the Node service over stdio/IPC (`protobuf` or `JSON lines`). Keeping this piece native ensures reliable modifier detection and low-latency audio capture, both awkward in pure Node.
- **Node/TypeScript core**: orchestrates state transitions, sends audio chunks to Wispr/OpenAI, keeps the phrase dictionary, performs fuzzy matching, and triggers Raycast commands. Bundled with `ts-node`/`esbuild` for rapid iteration.
- **HUD overlay**: a frameless always-on-top window rooted in the top-right corner (Electron + React/Vite). Receives streaming transcript updates via IPC from the Node process. Color-codes text and shows status icons (listening, success, failure).
- **Speech backend**: 
  - Primary: Wispr Flow streaming endpoint (assuming authenticated HTTP/WebSocket API; we will reuse your existing dictionary/common words prompt).
  - Fallback: OpenAI Speech-to-Text (Realtime or `audio.transcriptions`) with on-device caching to stay within model limits.
- **Command execution layer**: 
  - Preferred: `raycast run <extension.command>` via the Raycast CLI.
  - Fallback: AppleScript (`osascript -e 'tell application "Raycast" to ...'`) for commands that lack CLI hooks.
  - Support argument templates and simple slot filling (e.g., “open notion docs”).

## Core components
1. **Key & audio capture daemon**
   - Watches `kCGEventFlagsChanged` events to detect when `Control + Option` are held and `S` is pressed.
   - When pressed: starts `AVAudioEngine` → PCM16 chunks at 16 kHz, 1 channel, frames of ~20 ms.
   - Sends `{event:"start"}`, `{event:"chunk", data:base64}`, `{event:"stop"}` messages to Node.
   - On release or timeout (>8 s idle) stops capture and flushes.

2. **Speech pipeline**
   - Node service multiplexes PCM chunks to the active STT backend.
   - For Wispr Flow: maintain a long-lived streaming session, send your dictionary/context at session start.
   - Keep incremental transcript + final phrase; expose to HUD via IPC.
   - Retry with OpenAI if Wispr is unavailable; surface errors in HUD (“Transcriber offline”).

3. **Command mapper**
   - Config file `config/commands.yaml` describing:
     ```yaml
     - phrases: ["left half", "snap left"]
       raycast: "raycast-tools.window-left"
       args: {}
     ```
   - Uses fuzzy matching (`Fuse.js`) with score thresholds.
   - Supports slot extraction via regex or simple NLU templates for commands needing parameters.
   - Emits `match-none` or `match-ambiguous` events for HUD + audio cues.

4. **Raycast runner**
   - Executes `raycast run <command> --arg value` via `child_process.spawn`.
   - Times out (>3 s) and reports status back to HUD.
   - Optional AppleScript fallback when CLI fails (wrap in try/catch).

5. **HUD overlay**
   - Electron window anchored to `(screenWidth - width - margin, margin)`.
   - Displays:
     - live transcript text
     - tiny dot for `idle/listening/mapped/error`
     - optional Raycast icon + command name on success
   - Auto-hides after 1.5 s of idle.
   - Provide theme-aware colors and a “Unable to Map” message in red.

6. **State machine**
   - States: `idle -> initializing -> listening -> transcribing -> matched -> executing -> success/error -> idle`.
   - Deterministic transitions make it easier to reason about stuck hotkeys.

7. **Logging & recovery**
   - Structured logs to `~/Library/Logs/sayCast/*.log`.
   - Expose a `--debug` flag to mirror logs to stdout.
   - Add guard so releasing modifiers always cancels the session.

8. **Permissions & startup**
   - On first launch, prompt for microphone + accessibility (for CGEvent tap) via helper.
   - Provide `scripts/install-launch-agent.ts` to drop a LaunchAgent plist in `~/Library/LaunchAgents/com.saycast.agent.plist`.

## Implementation phases
1. **Phase 0 – Skeleton**
   - Initialize Node/TypeScript workspace (pnpm + ts-node), add ESLint/Prettier.
   - Scaffold Electron HUD (hidden until IPC message).
   - Build Swift helper CLI that only watches `Fn+Shift` and logs events.

2. **Phase 1 – Hotkey loop**
   - Wire helper → Node via stdio (Hotkey start/stop events).
   - Update HUD colors based on `listening` state.

3. **Phase 2 – Audio + STT**
   - Stream PCM from helper, feed into Wispr Flow.
   - Display partial transcripts in HUD.
   - Implement OpenAI fallback switch.

4. **Phase 3 – Command mapping + Raycast execution**
   - Load YAML command map, use fuzzy matching.
   - Trigger Raycast CLI, show success/failure colors.
   - Add small sound cues on success/error.

5. **Phase 4 – UX polish & resilience**
   - Timeouts, error banners, reconnection logic.
   - Logging, config hot reload, command testing harness.
   - LaunchAgent script + documentation.

6. **Phase 5 – Stretch**
   - Optional: local Whisper fallback, analytics on most-used phrases, in-app editor for command map.

## Immediate next steps
1. Initialize the monorepo structure (`packages/native-helper`, `apps/core-service`, `apps/hud`).
2. Draft the Swift helper prototype that detects `Fn+Shift` and emits start/stop JSON events.
3. Set up the Node core service scaffold with IPC subscriptions and stub Wispr/OpenAI clients.
4. Begin capturing your existing Raycast command dictionary into `config/commands.yaml`.

Let me know if you want me to start scaffolding the workspace or dive deeper into Wispr Flow integration details.

## Development setup (current status)
1. Install dependencies: `pnpm install` (installs workspace packages; Swift helper uses SwiftPM separately).
2. Copy `.env.example` → `.env` and fill `WISPR_API_KEY`, `RAYCAST_SCRIPTS_DIR` (defaults to `~/raycast-scripts`), and optional `OPENAI_API_KEY`.
3. Run the core dev harness (text-input simulation for now): `pnpm dev`.  
   - Use `SAYCAST_DRY_RUN=1 pnpm dev` to prevent actual Raycast/script execution while testing matching logic.  
   - Type a phrase like `left half` or `quicktime recording` at the `sayCast>` prompt to exercise the matcher/executor.
4. Build the native helper:
   ```bash
   cd apps/native-helper
   swift build
   ```
   Enable it from the core service with `START_NATIVE_HELPER=1 pnpm dev` once compiled; you’ll see heartbeat logs coming from the helper.
5. HUD package + full audio/IPC wiring are stubbed for now; implementation will follow after the hotkey/audio loop is ready.
6. **Experimental end-to-end loop (no HUD yet):**
   - Ensure `.env` has `WISPR_API_KEY` and that `raycast` CLI plus your scripts are accessible.
   - Build the helper (`swift build` inside `apps/native-helper`), then in repo root run `START_NATIVE_HELPER=1 pnpm dev`.
   - Hold `Control + Option` and press `S` (keep the combo held) to start streaming audio; transcripts + command matches log to the console, and matched commands will execute (disable with `SAYCAST_DRY_RUN=1` if needed).  
   - macOS will prompt for Accessibility + Microphone permissions the first time; approve them so the hotkey/audio capture works.
   - This path currently streams 16 kHz PCM chunks; HUD/visual feedback and additional error handling are still in progress.
7. Optional HUD overlay (visual mic + transcript):  
   - In a separate terminal, run `pnpm --filter saycast-hud dev`.  
   - The frameless window attaches to the top-right of your primary display and connects to the core WebSocket (`SAYCAST_HUD_PORT`, default `48123`).  
   - Keep this window open while the core service is running to see live listening/transcript/command status feedback.
