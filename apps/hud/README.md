# sayCast HUD

Lightweight Electron overlay that connects to the core service via WebSocket
(`ws://localhost:48123` by default) and displays:
- microphone indicator (green when Control+Option+S is held, red on errors)
- live transcript text (partial + final) from Wispr
- most recent command status (“matched”, “executed”, or “failed”)

## Development

```bash
pnpm install        # already run at repo root
pnpm --filter saycast-hud dev
```

This launches a frameless window pinned to the top-right corner of the primary
display. Run it alongside `START_NATIVE_HELPER=1 pnpm dev` in the repo root.
Use `SAYCAST_HUD_PORT` to change the listening port if needed (set in both the
core service env and before running the HUD).
