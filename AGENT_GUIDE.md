# sayCast Agent Guide

A comprehensive reference for AI agents working in this codebase.

## What is sayCast?

sayCast is a **macOS voice command system** that lets users execute Raycast commands and shell scripts via voice. Users hold a hotkey combination (`Ctrl+Option+S` or `Ctrl+Cmd`), speak a command, and the system transcribes their speech in real-time, matches it to predefined commands, and executes the corresponding action.

### Core Value Proposition
- **Hands-free automation**: Control window management, launch apps, run scripts with voice
- **Real-time feedback**: HUD overlay shows transcription and execution status
- **Raycast integration**: Seamlessly triggers Raycast commands and user scripts in `~/raycast-scripts/`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                                │
│                      Hold Ctrl+Option+S or Ctrl+Cmnd → Speak → Release                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NATIVE HELPER (Swift)                                    │
│                     apps/native-helper/                                      │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │ CGEventTap      │  │ AVAudioEngine  │  │ JSON-over-stdio IPC         │  │
│  │ (Hotkey detect) │──│ (16kHz PCM)    │──│ events: start/stop/audio    │  │
│  └─────────────────┘  └────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │ stdio
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CORE SERVICE (Node.js/TypeScript)                        │
│                     apps/core/                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ NativeBridge │  │ AudioPipeline │  │ SessionState  │  │ CommandMatcher│  │
│  │ (IPC handler)│──│ (buffer/chunk)│──│ (state machine│──│ (fuzzy match) │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  └───────────────┘  │
│          │                │                                      │          │
│          │                ▼                                      ▼          │
│          │    ┌──────────────────┐               ┌───────────────────────┐  │
│          │    │ WisprClient      │               │ RaycastRunner         │  │
│          │    │ (STT via WebSocket)              │ (execute commands)    │  │
│          │    └──────────────────┘               └───────────────────────┘  │
│          │                │                                                  │
│          │                ▼ transcripts                                      │
│          │    ┌──────────────────┐                                          │
│          └───▶│ HudServer        │◀─────────────────────────────────────────│
│               │ (WebSocket:48123)│                                          │
│               └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │ WebSocket
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HUD OVERLAY (Electron)                                   │
│                     apps/hud/                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Frameless, always-on-top window (top-right corner)                  │   │
│  │ • Shows live transcript                                              │   │
│  │ • Status indicator: idle (gray), listening (blue), success (green)  │   │
│  │ • Displays matched command and execution result                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
sayCast/
├── apps/
│   ├── core/                    # Node.js orchestration service
│   │   ├── src/
│   │   │   ├── index.ts         # Main entry point, bootstraps all services
│   │   │   ├── logger.ts        # Pino-based structured logging
│   │   │   └── services/
│   │   │       ├── audioPipeline.ts    # Buffers audio chunks from native helper
│   │   │       ├── commandMatcher.ts   # Fuzzy phrase → command matching
│   │   │       ├── devHarness.ts       # CLI for testing commands without voice
│   │   │       ├── hudServer.ts        # WebSocket server for HUD communication
│   │   │       ├── nativeBridge.ts     # Spawns/communicates with Swift helper
│   │   │       ├── raycastRunner.ts    # Executes matched commands
│   │   │       ├── sessionState.ts     # State machine (idle→listening→executing)
│   │   │       └── wisprClient.ts      # Wispr Flow STT WebSocket client
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── hud/                     # Electron HUD overlay application
│   │   ├── main.js              # Electron main process
│   │   ├── preload.js           # Context bridge for renderer
│   │   ├── renderer.js          # WebSocket client, UI updates
│   │   ├── index.html           # HUD UI
│   │   ├── styles.css           # HUD styling
│   │   ├── settings.html        # Settings UI (WIP)
│   │   └── settings.js          # Settings logic (WIP)
│   │
│   └── native-helper/           # Swift hotkey/audio capture daemon
│       ├── Package.swift        # Swift package manifest
│       └── Sources/SayCastNativeHelper/
│           └── main.swift       # CGEventTap + AVAudioEngine implementation
│
├── packages/
│   ├── config/                  # Shared configuration logic
│   │   └── src/
│   │       ├── index.ts         # loadRuntimeConfig() – loads env + commands
│   │       ├── defaultCommands.ts # Built-in voice command definitions
│   │       └── customDictionary.ts # Domain vocabulary for Wispr accuracy
│   │
│   └── types/                   # Shared TypeScript types
│       └── src/
│           └── index.ts         # VoiceCommandDefinition, RuntimeConfig, etc.
│
├── scripts/
│   └── dev-with-port-cleanup.sh # Dev startup script with port management
│
├── dist/                        # Build artifacts
│   └── native-helper/
│       └── SayCastNativeHelper  # Compiled Swift binary
│
├── docs/                        # Additional documentation
├── homebrew-saycast/            # Homebrew tap formula (for distribution)
│
├── package.json                 # Root workspace scripts
├── pnpm-workspace.yaml          # pnpm workspace config
├── tsconfig.base.json           # Shared TypeScript config
└── .env                         # Environment variables (not in git)
```

---

## Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Core service | Node.js + TypeScript | Orchestration, STT, command execution |
| Native helper | Swift | macOS hotkey detection, audio capture |
| HUD | Electron | Always-on-top overlay window |
| STT | Wispr Flow API | Real-time speech-to-text (WebSocket) |
| IPC | JSON-over-stdio | Native helper ↔ Core communication |
| IPC | WebSocket | Core ↔ HUD communication |
| Package manager | pnpm (v9.12.0) | Monorepo workspace management |
| Build | tsx, tsc, swift build | TypeScript/Swift compilation |

---

## System Flow

### 1. Startup
```
pnpm start → scripts/dev-with-port-cleanup.sh
  ├── Builds shared packages (packages/config, packages/types)
  ├── Builds Swift helper (swift build)
  ├── Starts core service (apps/core) with START_NATIVE_HELPER=1
  └── Starts HUD (apps/hud via Electron)
```

### 2. Voice Command Execution
```
1. User holds Ctrl+Option+S (or Ctrl+Cmd)
2. Native helper detects via CGEventTap → emits { type: "startListening" }
3. Native helper starts AVAudioEngine → streams PCM chunks as { type: "audioChunk", payload: {...} }
4. Core service receives chunks via NativeBridge
5. AudioPipeline buffers chunks → forwards to WisprClient
6. WisprClient sends audio to Wispr Flow WebSocket
7. Wispr returns partial/final transcripts
8. Core broadcasts transcript to HUD (user sees live text)
9. On final transcript: CommandMatcher fuzzy-matches to VoiceCommandDefinition
10. RaycastRunner executes the matched command (script, raycast-cli, applescript)
11. Result broadcast to HUD (success/failure status)
12. User releases hotkey → { type: "stopListening" } → session ends
```

---

## Key Types

```typescript
interface VoiceCommandDefinition {
  id: string;                    // Unique slug, e.g. "window-left-half"
  phrases: string[];             // Trigger phrases: ["left half", "snap left"]
  kind: "raycast-cli" | "script" | "applescript";
  target: string;                // Script path or raycast command ID
  matchType?: "exact" | "prefix"; // "prefix" captures remainder as args
  tags?: string[];               // For grouping: ["window", "custom"]
  args?: Record<string, string>; // Static arguments
  description?: string;          // Human-readable description
}

interface RuntimeConfig {
  wisprApiKey: string;           // From WISPR_API_KEY env
  raycastScriptsDir: string;     // Default: ~/raycast-scripts
  commands: VoiceCommandDefinition[];
  customDictionary?: string[];   // Domain words for STT accuracy
}
```

---

## Configuration

### Environment Variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `WISPR_API_KEY` | Yes | Wispr Flow API key for STT |
| `RAYCAST_SCRIPTS_DIR` | No | Path to scripts (default: `~/raycast-scripts`) |
| `RAYCAST_CLI_PATH` | No | Path to raycast binary if not in PATH |
| `OPENAI_API_KEY` | No | Fallback STT (not yet implemented) |
| `SAYCAST_HUD_PORT` | No | WebSocket port (default: 48123) |
| `SAYCAST_DRY_RUN` | No | Set to `1` to log commands without executing |
| `START_NATIVE_HELPER` | No | Set to `1` to spawn Swift helper on startup |

### Adding New Commands

Edit `packages/config/src/defaultCommands.ts`:

```typescript
{
  id: "my-new-command",
  phrases: ["do the thing", "thing please"],
  tags: ["custom"],
  kind: "script",
  target: resolveScript("my-script.sh"),
  description: "Does the thing"
}
```

For commands with arguments (prefix matching):

```typescript
{
  id: "open-app",
  phrases: ["open application", "launch"],
  matchType: "prefix",  // Captures "chrome" from "open application chrome"
  kind: "script",
  target: resolveScript("open-app.sh"),
}
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Full dev startup (recommended)
pnpm start

# Build all packages
pnpm build

# Dev mode without native helper (CLI testing only)
pnpm dev

# Build native helper only
cd apps/native-helper && swift build

# Run with dry-run (no actual command execution)
SAYCAST_DRY_RUN=1 pnpm start
```

---

## Key Files Reference

### Entry Points
| File | Purpose |
|------|---------|
| `apps/core/src/index.ts` | Core service bootstrap |
| `apps/hud/main.js` | Electron app entry |
| `apps/native-helper/Sources/SayCastNativeHelper/main.swift` | Swift helper entry |

### Core Services (apps/core/src/services/)
| File | Purpose |
|------|---------|
| `nativeBridge.ts` | Spawns Swift helper, parses JSON events |
| `audioPipeline.ts` | Buffers and emits audio chunks |
| `wisprClient.ts` | Wispr Flow WebSocket (auth, append, commit) |
| `commandMatcher.ts` | Fuzzy matching with Jaccard similarity |
| `raycastRunner.ts` | Executes commands (script, raycast-cli, applescript) |
| `sessionState.ts` | State machine: idle→listening→executing→idle |
| `hudServer.ts` | WebSocket server broadcasting to HUD |
| `devHarness.ts` | CLI for testing: `sayCast> left half` |

### Configuration
| File | Purpose |
|------|---------|
| `packages/config/src/index.ts` | Loads .env, builds RuntimeConfig |
| `packages/config/src/defaultCommands.ts` | Voice command definitions |
| `packages/types/src/index.ts` | Shared TypeScript interfaces |

---

## IPC Message Formats

### Native Helper → Core (JSON-over-stdio)
```json
{ "type": "startListening", "timestamp": 1234567890.123 }
{ "type": "stopListening", "timestamp": 1234567890.456 }
{ "type": "audioChunk", "timestamp": 1234567890.789, "payload": { "data": "base64...", "packetDuration": 0.5, "sampleRate": 16000 } }
{ "type": "heartbeat", "timestamp": 1234567890.000 }
{ "type": "error", "message": "Error description" }
```

### Core → HUD (WebSocket JSON)
```json
{ "type": "listening", "active": true }
{ "type": "transcript", "text": "left half", "final": false }
{ "type": "transcript", "text": "left half", "final": true }
{ "type": "command", "status": "matched", "commandId": "window-left-half" }
{ "type": "command", "status": "executed", "commandId": "window-left-half" }
{ "type": "command", "status": "failed", "commandId": "window-left-half" }
{ "type": "error", "message": "No command matched" }
{ "type": "state", "state": "idle" }
```

---

## Common Agent Tasks

### Adding a new voice command
1. Edit `packages/config/src/defaultCommands.ts`
2. Add entry to the returned array with `id`, `phrases`, `kind`, `target`
3. If using a script, ensure it exists in `~/raycast-scripts/` and is executable

### Modifying the HUD appearance
1. Edit `apps/hud/styles.css` for styling
2. Edit `apps/hud/index.html` for structure
3. Edit `apps/hud/renderer.js` for behavior

### Adding a new STT backend
1. Create new client in `apps/core/src/services/` (similar to `wisprClient.ts`)
2. Implement same interface: `connect()`, `startSession()`, `appendChunk()`, `commit()`, `close()`
3. Wire into `apps/core/src/index.ts` bootstrap

### Debugging command matching
1. Run with dev harness: `pnpm dev`
2. Type phrases at the `sayCast>` prompt
3. Check logs for match scores in `CommandMatcher.match()`

### Testing without executing commands
```bash
SAYCAST_DRY_RUN=1 pnpm start
```

---

## Production Notes

The repository includes extensive production documentation:
- `START_HERE.md` - Production release quickstart
- `PRODUCTION_ROADMAP.md` - Step-by-step release process
- `HOMEBREW_SETUP.md` - Homebrew tap distribution
- `GETTING_STARTED_PRODUCTION.md` - CI/CD and code signing

For development work, focus on the `apps/` and `packages/` directories.

---

## Hotkey Detection

The native helper detects two hotkey combinations:
1. **Ctrl + Option + S** (hold all three)
2. **Ctrl + Cmd** (hold both)

These are handled in `main.swift` via CGEventTap. Listening starts when the combo is pressed and stops when released.

---

## Audio Pipeline Details

1. **Capture**: AVAudioEngine at native sample rate (usually 44.1kHz)
2. **Resample**: Linear interpolation to 16kHz mono PCM16
3. **Chunk**: 0.5 second chunks (~8000 samples)
4. **Encode**: Base64 for JSON transport
5. **WAV wrap**: WisprClient adds 44-byte WAV header before sending

---

## State Machine

```
idle ──────────────► initializing
  ▲                      │
  │                      ▼
  │                  listening
  │                      │
  │                      ▼
  │                 transcribing
  │                      │
  │         ┌────────────┴────────────┐
  │         ▼                         ▼
  │      matched                   no-match
  │         │                         │
  │         ▼                         │
  │     executing                     │
  │         │                         │
  │    ┌────┴────┐                    │
  │    ▼         ▼                    │
  │ success   failure                 │
  │    │         │                    │
  └────┴─────────┴────────────────────┘
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unable to create CGEvent tap" | Grant Accessibility permission in System Preferences |
| No audio chunks received | Grant Microphone permission, check AVAudioEngine errors |
| Commands not matching | Check phrase definitions in `defaultCommands.ts`, lower threshold in `commandMatcher.ts` |
| HUD not connecting | Check port 48123 is free, verify WebSocket server started |
| Wispr connection fails | Verify `WISPR_API_KEY` in `.env`, check network connectivity |

