# sayCast Progress Log

_Last updated: 2025-11-11_

## Summary
- Voice-triggered Raycast utilities and window management are stable again after reverting to the reliable shell/AppleScript helpers in `~/raycast-scripts`. Core commands (“left/right half”, “top/bottom half”, “maximize”, “larger/smaller”, etc.) now consistently resize the frontmost window without popping up Raycast.
- HUD overlay and hotkey (Control + Option + S or Control + Command) remain in place and continue to show transcript + command feedback while Wispr drives transcription.
- The experimental “next display” feature was removed for now to avoid regressions; we’ll revisit that once we have a scoped plan for multi-monitor support.

## Completed Work (2025-11-11)
1. **Window management scripts reverted to stable version**  
   - `window-manage.applescript` now uses Finder + System Events to resize windows on the current screen.
   - All `window-*.sh` wrappers call `window-manage.sh`, which invokes the AppleScript via `/usr/bin/osascript`.
2. **sayCast command map**  
   - Removed the `window-next-display` entry until we have a robust multi-monitor implementation.
   - Rebuilt the config package so the core service uses the updated command list.
3. **Hotkey & HUD**  
   - `pnpm start` builds everything (shared packages + Swift helper) and launches both the core and HUD processes; Ctrl+C now stops both cleanly.

## Current Limitations / TODO
- “Next display” is temporarily unavailable; reintroduce once we have a first-class multi-monitor plan.
- Window layouts are based on the current screen bounds from Finder; if we need pixel-perfect multi-monitor support, we should revisit NSScreen-based logic.
- Wispr integration still depends on network availability; consider adding an OpenAI or local fallback for offline use.

## How to Test / Run
1. `pnpm start` (from repo root) – builds shared packages, rebuilds the Swift helper, launches core service (`START_NATIVE_HELPER=1`) + HUD overlay.
2. Hold `Control + Option + S` or `Control + Command` and speak commands such as:
   - “left half”, “right half”, “top half”, “bottom half”, “maximize window”, “window larger”, “window smaller”, “close window”, “saycast test”.
3. HUD shows transcripts + command status; release the hotkey to end the session.

## Next Steps
- Scope a proper multi-monitor “move to next display” feature without regressing core window snaps.
- Consider reintroducing Raycast CLI support once an official binary is available again; for now, the AppleScript solution is reliable.
- Expand HUD functionality (history view, layout icons) once core voice flows are solid.
