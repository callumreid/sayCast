# sayCast Production Progress

This document tracks the progress of taking sayCast from a development tool to a production-ready macOS application.

**Date:** November 26, 2025

---

## Overview

We completed 4 phases of productionalization in a single session:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | App Packaging | ✅ Complete |
| Phase 2 | First-Run Experience | ✅ Complete |
| Phase 3 | Code Signing & Notarization | ⏳ Awaiting Apple |
| Phase 4 | Distribution Setup | ✅ Complete |

---

## Phase 1: App Packaging

**Goal:** Bundle all components into a single `.app` that launches with a double-click.

### What Was Done

1. **Set up electron-forge** for packaging
   - File: `apps/hud/forge.config.js`
   - Configured packager settings, app metadata, permissions

2. **Created build script** that bundles everything
   - File: `apps/hud/scripts/bundle-core.mjs`
   - Bundles main.js with esbuild
   - Builds Swift native helper
   - Copies binary to resources

3. **Rewrote main.js** to be self-contained
   - File: `apps/hud/main.js`
   - Embeds core service (WebSocket server, Wispr client, command matcher)
   - Manages native helper lifecycle
   - Adds menu bar tray icon
   - Handles IPC for onboarding/settings

4. **Added menu bar tray**
   - Gray circle when idle
   - Green circle when listening
   - Menu with: Show HUD, Preferences, Quit

### Key Commands

```bash
cd apps/hud
npm run bundle    # Bundle JS + build Swift helper
npm run package   # Create .app in out/ folder
```

### Output

```
apps/hud/out/sayCast-darwin-arm64/sayCast.app  (~227MB)
```

---

## Phase 2: First-Run Experience

**Goal:** Guide new users through setup with an onboarding wizard.

### What Was Done

1. **Created onboarding wizard**
   - File: `apps/hud/onboarding.html`
   - Beautiful 4-step wizard UI
   - Step 1: Welcome
   - Step 2: Permission checks
   - Step 3: Wispr API key input
   - Step 4: Completion

2. **Added permission detection**
   - Checks Accessibility permission
   - Checks Microphone permission
   - Links to System Preferences

3. **Added config persistence**
   - Saves to: `~/Library/Application Support/sayCast/config.json`
   - Stores: wisprApiKey, onboardingComplete, launchAtLogin

4. **Updated preload.js** with IPC handlers
   - File: `apps/hud/preload.js`
   - Exposes: checkPermissions, testWispr, saveConfig, finishOnboarding

5. **Conditional onboarding**
   - Shows wizard on first launch (no config)
   - Skips if already configured

### Config File Location

```
~/Library/Application Support/sayCast/config.json
```

### Config Structure

```json
{
  "wisprApiKey": "fl-xxxxx",
  "onboardingComplete": true,
  "launchAtLogin": true,
  "raycastScriptsDir": "/Users/xxx/raycast-scripts"
}
```

---

## Phase 3: Code Signing & Notarization

**Goal:** Sign and notarize the app for distribution without Gatekeeper warnings.

### What Was Done

1. **Created Developer ID Application certificate**
   - Portal: developer.apple.com/account/resources/certificates
   - Certificate: "Developer ID Application: Callum Reid (9YNV67PASF)"

2. **Downloaded intermediate certificate**
   - URL: https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer

3. **Created app-specific password**
   - Portal: appleid.apple.com
   - For notarization authentication

4. **Stored notarization credentials in Keychain**
   ```bash
   xcrun notarytool store-credentials "sayCast-notarize" \
     --apple-id "callum.taylor.reid@gmail.com" \
     --team-id "9YNV67PASF"
   ```

5. **Created entitlements file**
   - File: `apps/hud/entitlements.plist`
   - Permissions: JIT, unsigned memory, audio input, Apple Events

6. **Updated forge.config.js** with signing settings
   ```javascript
   osxSign: {
     identity: 'Developer ID Application: Callum Reid (9YNV67PASF)',
     hardenedRuntime: true,
     entitlements: 'entitlements.plist'
   },
   osxNotarize: {
     tool: 'notarytool',
     keychainProfile: 'sayCast-notarize'
   }
   ```

### Credentials

| Item | Value |
|------|-------|
| Team ID | 9YNV67PASF |
| Apple ID | callum.taylor.reid@gmail.com |
| Certificate | Developer ID Application: Callum Reid (9YNV67PASF) |
| Keychain Profile | sayCast-notarize |

### Check Notarization Status

```bash
xcrun notarytool history --keychain-profile "sayCast-notarize"
```

---

## Phase 4: Distribution Setup

**Goal:** Prepare for distribution via DMG and Homebrew.

### What Was Done

1. **Created app icon**
   - File: `apps/hud/assets/icon.icns`
   - Generated from `icon.svg` using rsvg-convert + iconutil
   - All required sizes (16x16 to 1024x1024)

2. **Created DMG background**
   - File: `apps/hud/assets/dmg-background.png`
   - 660x400px with gradient background
   - Shows app name and drag instructions

3. **Configured DMG maker**
   - Updated `forge.config.js` with DMG settings
   - Custom background, icon positions, window size

4. **Created Homebrew formula**
   - File: `homebrew-saycast/Formula/saycast.rb`
   - Cask formula for easy installation
   - Includes caveats about permissions

5. **Updated README**
   - File: `README.md`
   - Installation instructions
   - Usage guide
   - Voice command reference

### Create DMG (after notarization)

```bash
cd apps/hud
npx electron-forge make
```

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `apps/hud/forge.config.js` | Electron Forge configuration |
| `apps/hud/scripts/bundle-core.mjs` | Build script |
| `apps/hud/entitlements.plist` | macOS entitlements |
| `apps/hud/onboarding.html` | Onboarding wizard UI |
| `apps/hud/assets/icon.icns` | App icon |
| `apps/hud/assets/icon.iconset/*` | Icon sizes |
| `apps/hud/assets/dmg-background.png` | DMG background |
| `apps/hud/assets/dmg-background.svg` | DMG background source |
| `homebrew-saycast/Formula/saycast.rb` | Homebrew cask |
| `docs/PRODUCTION_PROGRESS.md` | This document |

### Modified Files

| File | Changes |
|------|---------|
| `apps/hud/main.js` | Complete rewrite - embedded core service |
| `apps/hud/preload.js` | Added IPC handlers for onboarding |
| `apps/hud/package.json` | Added forge scripts and config |
| `apps/hud/index.html` | Changed hotkey text to Ctrl+Cmd |
| `apps/hud/renderer.js` | Changed hotkey text to Ctrl+Cmd |
| `README.md` | Updated with installation/usage docs |

---

## Pending Tasks

1. **Wait for notarization to complete**
   - Check: `xcrun notarytool history --keychain-profile "sayCast-notarize"`
   - Look for: `status: Accepted`

2. **Create DMG installer**
   ```bash
   cd apps/hud
   npx electron-forge make
   ```

3. **Test DMG installation**
   - Open DMG
   - Drag to Applications
   - Launch and verify

4. **Create GitHub Release**
   - Tag version
   - Upload DMG
   - Update Homebrew formula with SHA256

5. **Set up Homebrew tap** (optional)
   - Create repo: `homebrew-saycast`
   - Add formula
   - Test: `brew tap callumreid/saycast && brew install saycast`

---

## Quick Reference

### Build Commands

```bash
# Development
pnpm start                    # Run in dev mode

# Production build
cd apps/hud
npm run bundle                # Bundle JS + Swift
npm run package               # Create .app (with signing)
npm run make                  # Create DMG

# Check signing
codesign -dv --verbose=4 out/sayCast-darwin-arm64/sayCast.app
spctl --assess --verbose out/sayCast-darwin-arm64/sayCast.app
```

### App Locations

```
# Development app
apps/hud/out/sayCast-darwin-arm64/sayCast.app

# Config
~/Library/Application Support/sayCast/config.json

# Logs
~/Library/Logs/sayCast/
```

### Hotkeys

| Hotkey | Action |
|--------|--------|
| `Ctrl + Cmd` | Hold to activate voice (primary) |
| `Ctrl + Option + S` | Alternative activation |

---

## Summary

In one session, we transformed sayCast from a development tool to a production-ready macOS application with:

- ✅ Single bundled `.app` file
- ✅ Professional onboarding wizard
- ✅ Code signing with Developer ID
- ✅ Notarization (pending Apple approval)
- ✅ DMG installer configuration
- ✅ Homebrew formula
- ✅ Updated documentation

The app is ready for distribution once Apple completes notarization.

