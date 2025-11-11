# sayCast Progress Log

_Last updated: 2025-11-10_

## Summary
- Bootstrapped a pnpm-based monorepo with shared TypeScript tooling, workspace wiring, and env configuration for Wispr/OpenAI credentials.
- Added typed config + command catalogs that automatically ingest your custom Raycast scripts (`~/raycast-scripts`) and seed built-in window-management commands (now including the `saycast-test` helper command).
- Implemented the core service skeleton (matcher, executor, Wispr streaming client, session state machine, audio pipeline) so we can react to the native helper hotkey lifecycle and relay PCM chunks toward Wispr.
- Swift native helper now detects `Control + Option + S`, captures mono PCM audio while pressed (with resampling to 16 kHz), and streams base64 chunks plus heartbeat/status events to the Node bridge. HUD remains a placeholder until transcript feedback is ready.

## Completed Work (2025-02-17)
1. **Repository scaffolding**
   - `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `.gitignore`.
   - Added workspace packages:
     - `packages/types` – shared TypeScript interfaces for commands, configs, Wispr streaming.
     - `packages/config` – env loader + default `VoiceCommandDefinition` builder (includes `incognito`, `quicktime`, `transcribe`, and window snapping commands).
2. **Core service (apps/core)**
   - Config loader + dependency wiring (`loadRuntimeConfig`).
   - `CommandMatcher`: normalization + lightweight fuzzy scoring.
   - `RaycastRunner`: executes `raycast run`, shell scripts, or AppleScripts (with `SAYCAST_DRY_RUN=1` support for safe testing).
   - `DevHarness`: REPL-style loop to simulate transcripts and verify command routing before audio integration.
   - `SessionStateMachine`, `NativeBridge`, and `AudioPipeline` now react to helper start/stop events and buffer PCM chunks.
   - `WisprClient` upgraded to handle full streaming lifecycle (auth, append, commit, transcript events) and is wired to the audio pipeline.
   - Build verified via `pnpm --filter core-service build`.
3. **Native helper (apps/native-helper)**
   - CGEvent tap + `AVAudioEngine` capture now listens for `Control + Option + S`, resamples to 16 kHz mono PCM, and emits `{start, stop, heartbeat, error, audioChunk}` JSON events with base64 payloads.
4. **Command catalog**
   - Added `saycast-test` so you can validate the pipeline against `~/raycast-scripts/sayCastTest.sh`.
5. **HUD overlay (apps/hud)**
   - Implemented an Electron-based top-right overlay that subscribes to the core WebSocket (`SAYCAST_HUD_PORT`, default 48123) and shows mic status, transcripts, and command execution feedback.
6. **Documentation**
   - `README.md` updated with dev setup instructions (pnpm install, env config, dev harness usage, Swift helper build notes).
   - Architecture/plan docs previously captured in `README.md` & `plan.md`.

- Added `.env` discovery that looks in both the current working directory and repo root, so `WISPR_API_KEY` can live in the root `.env` file without duplicating settings.
- Raycast CLI resolution now supports `RAYCAST_CLI_PATH` env var plus common install paths, surfacing a clear error if the binary is missing (prevents ENOENT when running window-management commands).

## Current Limitations / TODO Highlights
- Need to confirm whether Wispr expects WAV headers per chunk or raw PCM (currently sending raw PCM16 at 16 kHz).
- No HUD yet; transcripts/statuses surface only in logs.
- Command catalog is static; no dynamic reload or UI editing.
- Launch automation, logging destinations, and error recovery states remain TODO.

- **Node:** `pnpm install`
- **Node:** `pnpm --filter core-service build`
- **Dev harness:** optional (`SAYCAST_DRY_RUN=1 pnpm dev`) to exercise matcher/runner manually.
- **Swift helper:** `swift build` (fails inside sandbox due to restricted cache/toolchain access; succeeds locally as you confirmed).
- **Full pipeline (experimental):** `START_NATIVE_HELPER=1 pnpm dev` with helper built and `.env` populated; hold `Control + Option + S` to stream audio (logs show transcripts + matched commands while HUD is pending). Grant macOS Accessibility + Microphone permissions when prompted.

## Next focus (high-level)
- Confirm Wispr chunk format expectations (WAV header vs raw PCM) and harden error handling/timeouts.
- Hook Wispr transcripts into the HUD overlay for visual feedback.
- Expand command catalog + dictionary context, add launch automation + recovery tooling.
