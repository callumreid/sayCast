# sayCast Next Steps & Checkpoints

## Phase 1 – Native Helper ↔ Core Event Loop
1. **Hotkey detection (Fn + Shift)**
   - Build CGEvent tap and state tracker in Swift.
   - Emit `{ type: "startListening" }` when both modifiers are held for >50 ms; emit `{ type: "stopListening" }` when released.
   - **Checkpoint:** CLI dev harness logs start/stop events coming from the helper while holding Fn+Shift.
2. **Helper IPC schema**
   - Define JSON message format for lifecycle + audio chunk events.
   - Add versioning + heartbeat to detect stale helpers.
   - **Checkpoint:** Node core parses helper messages and transitions internal state machine without errors.

## Phase 2 – Audio Capture & Wispr Streaming
3. **PCM capture pipeline**
   - Start `AVAudioEngine` when listening begins, capture mono 16 kHz PCM frames.
   - Base64 encode or forward raw buffers to Node (decide best transport).
   - **Checkpoint:** Node receives base64 PCM chunks at ~1s cadence (verified via logs).
4. **Wispr client completion**
   - Implement auth/start, append (with `audio_packets`), and commit messages.
   - Surface partial/final transcript events via an internal EventEmitter.
   - **Checkpoint:** Holding Fn+Shift and speaking prints Wispr transcripts to console in ~real-time.
5. **Fallback STT stub (OpenAI)**
   - Expose config toggle and simple polling transcription for reliability.
   - **Checkpoint:** Environment variable can switch to OpenAI path; transcripts still flow.

## Phase 3 – HUD Overlay & Feedback
6. **Electron HUD scaffold**
   - Create frameless window anchored to top-right, add IPC listener for transcript/status events.
   - **Checkpoint:** Manual test broadcast updates text color/state correctly.
7. **Integration with core**
   - When transcripts arrive, update HUD; when command matches/executed, show green; failure red.
   - **Checkpoint:** Voice or dev harness triggers change the HUD state in real-time.

## Phase 4 – Command Execution Hardening
8. **Command map expansion**
   - Import remaining Raycast script metadata (Raycast built-ins, sample apps).
   - Add dictionary context injection for Wispr.
   - **Checkpoint:** Config file enumerates >90% of daily workflows, validated via dev harness tests.
9. **Execution telemetry & error handling**
   - Structured logs, HUD errors, retry/backoff for Wispr, ensure hotkey release resets state.
   - **Checkpoint:** Simulated failures surface clearly in HUD/logs without leaving helper hung.

## Phase 5 – Packaging & Startup
10. **Launch script + docs**
    - Add `scripts/dev.ts` to spawn core + HUD + helper together.
    - Document permissions (mic + accessibility) and add LaunchAgent installer.
    - **Checkpoint:** `pnpm dev` launches the full stack; optional plist enables auto-start on login.

> We’ll tackle phases sequentially, but can overlap HUD work with audio once transcripts are flowing.
