# sayCast Build Plan

## Objectives
- Capture speech only while `Fn + Shift` are held, transcribe via Wispr Flow (preferred) or OpenAI STT fallback, and surface real-time transcript feedback.
- Map utterances to Raycast commands (built-in window management plus your custom scripts) and execute through the Raycast CLI or helper scripts.
- Show a top-right HUD that streams the transcript, turning green on successful matches and red with “Unable to Map” when no match occurs.
- Run as a background helper that can eventually auto-launch, but is easy to start from the terminal during development.

## Existing Raycast Assets
- Custom scripts live in `~/raycast-scripts/`, e.g.:
  - `raycast-scripts/incognito-chrome.sh` – opens Chrome incognito to `localhost:5173`.
  - `raycast-scripts/quicktime-recording.sh` – AppleScript flow to start a new QuickTime movie recording.
  - `raycast-scripts/transcribe.sh` – wraps Whisper CLI for media transcription.
- Built-in Raycast commands you rely on (e.g., window management left/right halves, snapping, etc.) will be addressed via their Raycast command IDs using `raycast run <extension.command>`; we need to catalog the exact IDs during implementation.

## System Architecture
| Layer | Responsibilities | Stack |
| --- | --- | --- |
| Native hotkey + audio helper | Detect `Fn + Shift`, capture mono 16 kHz PCM audio chunks, forward events/audio to Node via IPC, manage mic+accessibility permissions. | Swift (menubar-less agent using `CGEventTap` + `AVAudioEngine`) |
| Core orchestration service | Maintain session state machine, manage Wispr/OpenAI clients, fuzzy-match transcripts to commands, call Raycast CLI/scripts, broker messages to HUD. | Node.js + TypeScript (ts-node during dev) |
| HUD overlay | Always-on-top frameless window in top-right, shows live transcript + status colors/icons, plays discreet cues. | Electron (or Vite + Tauri) + React/TypeScript |
| Config + logging | Command dictionaries, dictionary context, env secrets, structured logs for debugging. | YAML/JSON configs, `winston`/`pino` logs |

## Wispr Flow Integration
- Endpoint: `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer <WISPR_API_KEY>`.
- Message flow:
  1. `auth` message with `access_token`, `language: ["en"]`, and `context.dictionary_context` populated from your domain vocabulary.
  2. Repeated `append` messages containing arrays of base64-encoded mono 16-bit PCM WAV packets at 16 kHz, equal-duration (~1 s) chunks, tracking `position` offsets.
  3. `commit` message with `total_packets` when the hotkey is released.
- Responses: `status: "text"` partial/final transcripts, `status: "info"` commit ack, `status: "error"` on failure.
- Error recovery: retry auth once on transient socket failure, fall back to OpenAI STT (Realtime or `audio.transcriptions`) if Wispr is unavailable, and surface HUD messaging when offline.

## Command Mapping & Execution
1. **Command catalog**  
   - Build `config/commands.yaml` describing phrases, fuzzy synonyms, optional slots, and execution target (`raycast-cli`, `script`, `applescript`).  
   - Seed entries for `incognito chrome`, `quicktime recording`, `transcribe media`, plus Raycast window snapping commands (“left/right half”, “maximize”, etc.).  
   - Support dictionary context injection for Wispr using the same phrase list to improve accuracy.
2. **Matching pipeline**  
   - Use `Fuse.js` or custom similarity scoring to match the latest transcript (or final phrase) against known commands, with thresholds + tie-breakers.  
   - Provide partial-match hints (HUD amber state when close but uncertain).
3. **Execution adapters**  
   - `raycast run <extension.command>` via CLI for built-in Raycast actions.  
   - Direct shell execution for scripts in `~/raycast-scripts/`.  
   - Optional AppleScript fallback for actions lacking CLI/script coverage.  
   - Propagate exit status back to HUD, logging stdout/stderr for troubleshooting.

## HUD Feedback
- Layout: heading row with status dot + command name, body text streaming transcript, bottom row for errors (“Unable to Map”) or timers.
- Color states: gray `idle`, blue `listening`, green `matched/executed`, red `error`.
- Behavior: show when hotkey pressed, live-update as transcripts arrive, auto-hide (fade) 1–2 s after returning to idle. Use `electron-overlay-window` to stay above fullscreen if needed.

## Launch & Permissions
- CLI entry point (`pnpm dev`) that spawns the Swift helper and Electron HUD, wiring IPC channels.
- Helper requests microphone + accessibility permissions on first run; doc how to grant them.
- Later phase: LaunchAgent plist for auto-start; for now, `pnpm dev` from terminal suffices.

## Work Plan
1. **Repo scaffolding**
   - Initialize `pnpm` workspace with packages: `apps/core`, `apps/hud`, `packages/config`.
   - Set up ESLint/Prettier, `.env.example`, `.gitignore`, and build scripts.
2. **Native helper prototype**
   - Swift package that logs `Fn+Shift` start/stop and streams dummy audio frames.
   - JSON-over-stdio protocol for control messages; heartbeat to detect crashes.
3. **Core service MVP**
   - Implement state machine, spawn helper, forward events to HUD stub.
   - Integrate Wispr WebSocket client (using API key env), implement base64 chunk packaging, and add OpenAI stub.
   - Hook `~/raycast-scripts/*` commands via shell execution; log results.
4. **HUD implementation**
   - Electron/Vite app subscribing to IPC, showing transcript + colors.
   - Add CSS animations, success/error cues, and command name display.
5. **Command mapping + Raycast CLI**
   - Populate `config/commands.yaml` with current scripts + Raycast window management commands.  
   - Implement fuzzy matcher + threshold tuning; add dictionary context export.
6. **Polish & resilience**
   - Silence detection/timeouts, audio buffer recycling, reconnection logic.
   - Structured logging, debug overlay, unit tests for mapper and executor.
   - LaunchAgent script + documentation for startup.

## Open Questions
- Confirm desired built-in Raycast command IDs (e.g., extension slug for window snapping) so we can script them reliably.
- HUD tech preference: Electron (more control) vs. Tauri (leaner). Defaulting to Electron unless you prefer otherwise.
- Should we support hands-free mode (auto-commit after silence) later, or strictly press-and-hold?

Once you approve this plan, next step is scaffolding the repo and prototyping the Swift helper + Node core service.
