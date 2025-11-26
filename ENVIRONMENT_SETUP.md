# sayCast Environment Configuration

This guide explains all environment variables and configuration options for sayCast.

## Configuration Priority

sayCast reads configuration from (in order of priority):

1. **Environment Variables** (highest priority)
2. **~/Library/Application Support/sayCast/config.json**
3. **macOS Keychain** (for API keys)
4. **Defaults** (hardcoded fallbacks)

---

## User-Provided Configuration

These are provided by end users via the Settings UI or `.env` file:

### Wispr Flow API

```env
WISPR_API_KEY=wspr_your_api_key_here
```

- Required for speech-to-text transcription
- Get from: https://www.wisprflow.ai/
- Stored securely in macOS Keychain
- Users configure via Settings UI

### OpenAI API (Optional)

```env
OPENAI_API_KEY=sk_your_openai_key_here
```

- Optional fallback when Wispr is unavailable
- Get from: https://platform.openai.com/account/api-keys
- Stored securely in macOS Keychain
- Users configure via Settings UI

### Raycast Integration

```env
RAYCAST_SCRIPTS_DIR=/Users/your_username/raycast-scripts
RAYCAST_CLI_PATH=/Applications/Raycast.app/Contents/MacOS/raycast
```

- Paths to your custom Raycast scripts
- Defaults: `~/raycast-scripts` and standard Raycast location
- Usually auto-detected; only needed if custom setup

---

## sayCast Internal Configuration

These are typically auto-set but can be overridden:

### Directories

```env
SAYCAST_HOME=~/Library/Application Support/sayCast
SAYCAST_LOGS=~/Library/Logs/sayCast
SAYCAST_DATA_DIR=~/Library/Application Support/sayCast
```

### Audio Settings

```env
SAYCAST_AUDIO_SAMPLE_RATE=16000           # Hz
SAYCAST_AUDIO_CHANNELS=1                   # Mono
SAYCAST_AUDIO_CHUNK_SIZE=1024             # Samples per chunk
SAYCAST_AUDIO_SENSITIVITY=50              # 0-100
```

### HUD Overlay

```env
SAYCAST_HUD_PORT=48123                    # WebSocket port
SAYCAST_HUD_WIDTH=320                     # Pixels
SAYCAST_HUD_HEIGHT=140                    # Pixels
```

### Hotkey Configuration

```env
SAYCAST_HOTKEY_MODIFIERS=Control+Option   # Modifier keys
SAYCAST_HOTKEY_TRIGGER=S                  # Trigger key
```

### Timeouts

```env
SAYCAST_SILENCE_TIMEOUT=3                 # Seconds of silence to stop
SAYCAST_MAX_SESSION_TIME=30               # Max recording duration
```

### Command Matching

```env
SAYCAST_FUZZY_MATCH_THRESHOLD=80          # Confidence threshold %
```

---

## Build & CI/CD Configuration

These are GitHub Secrets, never committed to the repo:

### Apple Developer Certificates

```env
APPLE_DEVELOPER_ID_APPLICATION="Developer ID Application: Your Name (ABC1234567)"
APPLE_DEVELOPER_ID_INSTALLER="Developer ID Installer: Your Name (ABC1234567)"
```

### Apple Notarization

```env
APPLE_NOTARIZATION_TEAM_ID=ABC1234567
APPLE_NOTARIZATION_USER=your_apple_id@example.com
APPLE_NOTARIZATION_PASSWORD=abcd-efgh-ijkl-mnop
```

These are stored as GitHub Secrets and used only in CI/CD workflows.

---

## Debug & Development Flags

Only use these during development:

```env
DEBUG=false                               # Enable debug logging
DEBUG_AUDIO=false                         # Debug audio capture
DEBUG_TRANSCRIPTION=false                 # Debug transcription

SAYCAST_DRY_RUN=false                     # Don't execute commands
START_NATIVE_HELPER=true                  # Start native helper

ELECTRON_ENABLE_LOGGING=true              # Enable Electron logging
```

---

## Settings for Homebrew Users

### First-Time Setup

When a user installs sayCast via Homebrew:

1. App creates `~/.saycast/` directory
2. App creates `~/Library/Application Support/sayCast/`
3. App creates `~/Library/Logs/sayCast/`
4. User opens Settings UI via the HUD
5. User enters Wispr API key
6. User customizes audio settings and hotkey
7. Settings are saved to Keychain and config files

### No .env File Needed

Homebrew users **do not** need to create or edit .env files. All configuration happens through the Settings UI.

### Advanced Users (Optional .env)

Power users can optionally create `~/.saycast/.env`:

```bash
cat > ~/.saycast/.env <<EOF
SAYCAST_AUDIO_SENSITIVITY=60
SAYCAST_FUZZY_MATCH_THRESHOLD=75
DEBUG=true
EOF
```

Then restart sayCast to apply changes.

---

## Configuration Storage Locations

### Settings Files

```
~/Library/Application Support/sayCast/
├── config.json              # User settings (non-secrets)
├── commands.yaml            # Custom commands
└── themes.json              # UI theme preferences
```

### Secrets (Keychain)

macOS Keychain stores:
- Wispr API key
- OpenAI API key
- Any future authentication tokens

### Logs

```
~/Library/Logs/sayCast/
├── main.log                 # Main app logs
├── audio.log                # Audio capture logs
└── transcription.log        # STT service logs
```

---

## Setting Configuration via CLI

Users can also set environment variables before launching:

```bash
export WISPR_API_KEY="your_key_here"
export SAYCAST_AUDIO_SENSITIVITY="70"
saycast
```

Or in a single command:

```bash
SAYCAST_DRY_RUN=true saycast
```

---

## Changing Configuration

### Via Settings UI (Recommended)

1. Click settings icon in HUD overlay
2. Navigate to appropriate tab
3. Edit values
4. Click "Save"

### Via Config Files (Advanced)

Edit `~/Library/Application Support/sayCast/config.json`:

```json
{
  "audio": {
    "sensitivity": 60,
    "silenceTimeout": 4
  },
  "general": {
    "matchThreshold": 75
  }
}
```

Then restart the app.

### Via Environment (Development)

```bash
DEBUG=true START_NATIVE_HELPER=1 saycast
```

---

## Troubleshooting

### API Key Not Working

1. Check that key is entered in Settings UI
2. Verify key is stored in Keychain: 
   ```bash
   security find-generic-password -s "sayCast-Wispr"
   ```
3. Test connection in Settings UI → API Keys → "Test Wispr Connection"

### Settings Not Persisting

1. Check permissions: `ls -la ~/Library/Application\ Support/sayCast/`
2. Verify Keychain is accessible
3. Check logs: `tail -f ~/Library/Logs/sayCast/main.log`

### Hotkey Not Working

1. Verify in Settings UI → General → Hotkey
2. Check System Preferences → Security & Privacy → Accessibility
3. Ensure sayCast is in the allowed apps list

---

## Default Configuration

If no config is provided, sayCast uses these defaults:

```json
{
  "audio": {
    "sampleRate": 16000,
    "channels": 1,
    "sensitivity": 50,
    "silenceTimeout": 3
  },
  "hotkey": {
    "modifiers": "Control+Option",
    "trigger": "S"
  },
  "ui": {
    "hudPort": 48123,
    "hudWidth": 320,
    "hudHeight": 140
  },
  "commands": {
    "matchThreshold": 80,
    "fuzzyMatchEnabled": true
  }
}
```

---

## For Developers & Contributors

### Development Environment

```bash
# Development .env for local testing
cp .env.example .env

# Add your test API keys
WISPR_API_KEY=wspr_test_key
OPENAI_API_KEY=sk_test_key

# Optional: Dry run mode (don't execute commands)
SAYCAST_DRY_RUN=1 pnpm dev

# Optional: Debug logging
DEBUG=true pnpm dev
```

### CI/CD Environment

See CI/CD workflow in `.github/workflows/build-and-release.yml` for how secrets are used during builds.

---

## Support

For issues with configuration:

1. Check `~/Library/Logs/sayCast/` for error logs
2. Run Settings UI diagnostics
3. Enable `DEBUG=true` for verbose logging
4. Report issues on GitHub with logs attached

