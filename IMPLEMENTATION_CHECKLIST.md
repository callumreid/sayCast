# sayCast Productionalization Implementation Checklist

Complete implementation checklist to take sayCast from local tool to Homebrew distribution.

---

## Phase 1: CI/CD Setup (Automated Builds)

### GitHub Actions Configuration

- [ ] **1.1** Review `.github/workflows/build-and-release.yml`
  - [ ] Ensure Node.js version is correct
  - [ ] Verify Swift build command is correct
  - [ ] Check artifact naming matches your needs
  - [ ] Confirm release body format

- [ ] **1.2** Set up GitHub Secrets
  - [ ] Visit: `https://github.com/yourusername/sayCast/settings/secrets/actions`
  - [ ] Add: `APPLE_DEVELOPER_ID_APPLICATION`
  - [ ] Add: `APPLE_DEVELOPER_ID_INSTALLER`
  - [ ] Add: `APPLE_NOTARIZATION_TEAM_ID`
  - [ ] Add: `APPLE_NOTARIZATION_USER`
  - [ ] Add: `APPLE_NOTARIZATION_PASSWORD` (app-specific from Apple ID)

- [ ] **1.3** Install code signing certificates
  - [ ] Open Xcode
  - [ ] Go to Xcode → Settings → Accounts
  - [ ] Download "Developer ID Application" certificate
  - [ ] Download "Developer ID Installer" certificate
  - [ ] Verify in Keychain: `security find-identity -v | grep "Developer ID"`

- [ ] **1.4** Test the workflow with a beta release
  - [ ] Update `package.json` version to `0.2.1-beta.1`
  - [ ] Commit and push
  - [ ] Create tag: `git tag v0.2.1-beta.1 && git push origin v0.2.1-beta.1`
  - [ ] Monitor GitHub Actions for success
  - [ ] Download artifacts and verify signing
  - [ ] Delete beta tag when satisfied: `git tag -d v0.2.1-beta.1 && git push --delete origin v0.2.1-beta.1`

### Workflow Verification

- [ ] **1.5** Verify build artifacts
  - [ ] Check GitHub Releases for created artifacts
  - [ ] Verify file names match expected pattern
  - [ ] Check file sizes are reasonable (> 50MB)
  - [ ] Verify SHA256 is generated

- [ ] **1.6** Verify code signing
  ```bash
  codesign -v /path/to/SayCastNativeHelper
  spctl -a -v /path/to/app.app
  ```

- [ ] **1.7** Verify notarization
  - [ ] Check GitHub Actions logs for notarization success
  - [ ] Verify no warnings in logs
  - [ ] Test on a clean Mac (optional)

---

## Phase 2: Settings UI & Configuration

### Settings UI Components

- [ ] **2.1** Verify Settings UI files exist
  - [ ] `apps/hud/settings.html` ✓ (created)
  - [ ] `apps/hud/settings.js` ✓ (created)

- [ ] **2.2** Update HUD to launch Settings
  - [ ] Add settings button to main HUD (`apps/hud/renderer.js` or `index.html`)
  - [ ] Add menu item or keyboard shortcut
  - [ ] Link to `settings.html`

- [ ] **2.3** Implement Settings API Endpoints
  - [ ] Add to `apps/core/src/hudServer.ts`:
    - [ ] `GET /api/settings` - Get all settings
    - [ ] `POST /api/settings/api` - Save API keys
    - [ ] `POST /api/settings/audio` - Save audio settings
    - [ ] `POST /api/settings/commands` - Save custom commands
    - [ ] `POST /api/settings/general` - Save general settings
    - [ ] `POST /api/test/wispr` - Test Wispr connection
    - [ ] `POST /api/settings/reset` - Reset to defaults

- [ ] **2.4** Implement Secure Storage
  - [ ] Install `keytar`: `pnpm add keytar` (in core package)
  - [ ] Create `apps/core/src/services/secureStorage.ts`:
    - [ ] `saveApiKey(service, account, password)`
    - [ ] `getApiKey(service, account)`
    - [ ] `deleteApiKey(service, account)`
  - [ ] Update API endpoints to use Keychain for secrets

- [ ] **2.5** Implement Config File Storage
  - [ ] Create `apps/core/src/services/configManager.ts`:
    - [ ] Load from `~/Library/Application Support/sayCast/config.json`
    - [ ] Create directory if not exists
    - [ ] Save/load user settings
    - [ ] Validate configuration
    - [ ] Provide defaults

- [ ] **2.6** Test Settings Flow
  - [ ] Start app: `pnpm start`
  - [ ] Open Settings UI
  - [ ] Enter Wispr API key
  - [ ] Click "Test Connection"
  - [ ] Save settings
  - [ ] Restart app
  - [ ] Verify settings persist

### Configuration Directories

- [ ] **2.7** Create required directories
  ```bash
  mkdir -p ~/Library/Application\ Support/sayCast
  mkdir -p ~/Library/Logs/sayCast
  ```

- [ ] **2.8** Create template config file
  - [ ] File: `~/Library/Application Support/sayCast/config.json`
  - [ ] Include defaults for all settings
  - [ ] Document each setting

---

## Phase 3: Homebrew Distribution

### Homebrew Tap Repository

- [ ] **3.1** Create new GitHub repository
  - [ ] Repository name: `homebrew-saycast`
  - [ ] Make it public
  - [ ] Add description: "Homebrew tap for sayCast"
  - [ ] Add link to main repo

- [ ] **3.2** Create Homebrew formula
  - [ ] Clone tap repo locally
  - [ ] Create: `Formula/saycast.rb`
  - [ ] Use template from `HOMEBREW_SETUP.md`
  - [ ] Update fields:
    - [ ] `homepage`
    - [ ] Initial `url` and `sha256` (placeholder)
    - [ ] `depends_on` (requires macOS 12+, Raycast)
  - [ ] Implement install method
  - [ ] Add LaunchAgent installation
  - [ ] Add caveats (setup instructions)
  - [ ] Implement test method

- [ ] **3.3** Create supporting files
  - [ ] `README.md` - Installation and usage
  - [ ] `LICENSE` - Copy from main repo

- [ ] **3.4** Push to GitHub
  - [ ] Commit all files
  - [ ] Push to main branch
  - [ ] Verify files are visible on GitHub

### Testing the Tap

- [ ] **3.5** Test Homebrew installation locally
  ```bash
  brew tap yourusername/homebrew-saycast /path/to/local/tap
  brew install saycast --build-from-source
  ```

- [ ] **3.6** Verify installation
  - [ ] App files in correct location
  - [ ] LaunchAgent created
  - [ ] Binary is executable
  - [ ] App starts: `saycast` or menu bar launch

- [ ] **3.7** Test uninstall
  ```bash
  brew uninstall saycast
  brew untap yourusername/homebrew-saycast
  ```
  - [ ] Files cleaned up
  - [ ] LaunchAgent removed
  - [ ] No orphaned files

---

## Phase 4: Release Management

### Pre-Release Checklist

- [ ] **4.1** Code Quality
  - [ ] Run tests: `pnpm test`
  - [ ] Run linter: `pnpm lint`
  - [ ] No console errors: `pnpm build`
  - [ ] TypeScript strict mode: `pnpm build --strict`
  - [ ] Code review complete

- [ ] **4.2** Feature Completeness
  - [ ] Hotkey detection works
  - [ ] Audio capture works
  - [ ] Transcription works (Wispr)
  - [ ] Command matching works
  - [ ] Command execution works
  - [ ] HUD displays correctly
  - [ ] Settings UI works
  - [ ] Permissions flow works
  - [ ] Error recovery works

- [ ] **4.3** Platform Testing
  - [ ] Test on Intel Mac
  - [ ] Test on Apple Silicon Mac
  - [ ] Test with M2/M3 (universal binary)
  - [ ] Test with latest macOS version
  - [ ] Test with previous macOS version

- [ ] **4.4** Documentation Complete
  - [ ] README.md - Updated with v1.0 info
  - [ ] INSTALLATION.md - Step-by-step guide
  - [ ] CONFIGURATION.md - All settings explained
  - [ ] TROUBLESHOOTING.md - Common issues
  - [ ] CHANGELOG.md - What changed in this release
  - [ ] API.md - For advanced users/developers

### Creating a Release

- [ ] **4.5** Update Version
  - [ ] Edit `package.json` - increment version
  - [ ] Update `CHANGELOG.md` - list changes
  - [ ] Commit: `git add -A && git commit -m "Release v1.0.0"`
  - [ ] Tag: `git tag v1.0.0`
  - [ ] Push: `git push origin main --tags`

- [ ] **4.6** GitHub Actions Build
  - [ ] Monitor Actions tab until completion
  - [ ] Verify all steps passed
  - [ ] Download and test artifacts
  - [ ] Check release notes on GitHub Releases

- [ ] **4.7** Update Homebrew Formula
  - [ ] Clone tap repo
  - [ ] Edit `Formula/saycast.rb`
  - [ ] Update `url` to match new release
  - [ ] Update `sha256` from GitHub release page or:
    ```bash
    shasum -a 256 ~/Downloads/sayCast-1.0.0-universal.tar.gz
    ```
  - [ ] Commit: `git commit -am "Update to v1.0.0"`
  - [ ] Push: `git push origin main`

- [ ] **4.8** Test Public Installation
  - [ ] On clean machine or VM:
    ```bash
    brew tap yourusername/homebrew-saycast
    brew install saycast
    ```
  - [ ] Verify installation succeeds
  - [ ] Test app functionality
  - [ ] Verify permissions work
  - [ ] Test Settings UI
  - [ ] Test uninstall

### Post-Release

- [ ] **4.9** Announcement
  - [ ] GitHub Release notes published
  - [ ] Tag release as "Latest"
  - [ ] Create GitHub Discussion if needed
  - [ ] Update website/docs
  - [ ] Post in relevant communities
  - [ ] Share with beta testers

- [ ] **4.10** Monitoring
  - [ ] Monitor GitHub issues
  - [ ] Monitor crash reports (if any)
  - [ ] Respond to user questions
  - [ ] Track installation numbers
  - [ ] Collect feedback

---

## Continuous Maintenance

### Regular Tasks

- [ ] **5.1** Weekly
  - [ ] Check for bug reports
  - [ ] Monitor linter/test failures
  - [ ] Review dependency updates

- [ ] **5.2** Monthly
  - [ ] Update dependencies: `pnpm update`
  - [ ] Security patches: `npm audit`
  - [ ] Review user feedback

- [ ] **5.3** Quarterly
  - [ ] Plan next minor release
  - [ ] Review and prioritize feature requests
  - [ ] Update documentation

### Bug Fix Process

- [ ] **5.4** For bug reports
  - [ ] Create branch: `git checkout -b fix/issue-name`
  - [ ] Fix the bug
  - [ ] Add test case
  - [ ] Submit PR
  - [ ] Merge to main
  - [ ] Create patch release: `v1.0.1`

### Feature Development

- [ ] **5.5** For new features
  - [ ] Create branch: `git checkout -b feature/feature-name`
  - [ ] Implement feature
  - [ ] Add tests
  - [ ] Update docs
  - [ ] Submit PR
  - [ ] Plan for minor or major release

---

## Next Phase: Auto-Updates (v1.1+)

- [ ] **6.1** Sparkle Framework Setup
  - [ ] Install: `pnpm add electron-updater`
  - [ ] Configure update feed URL
  - [ ] Implement update check logic
  - [ ] Add update notification UI

- [ ] **6.2** Delta Updates
  - [ ] Generate delta patches
  - [ ] Publish patches with releases
  - [ ] Reduce download size

---

## Final Validation

Before marking as "production ready":

- [ ] **Complete** All items above checked
- [ ] **Tested** Homebrew installation works
- [ ] **Tested** App functionality works
- [ ] **Tested** Settings UI works
- [ ] **Documented** All features documented
- [ ] **Secure** API keys stored in Keychain
- [ ] **Signed** All binaries code-signed
- [ ] **Notarized** All binaries notarized
- [ ] **Released** v1.0.0 is live on Homebrew

---

## Quick Reference Commands

### Development
```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages
pnpm lint                 # Run linter
pnpm test                 # Run tests
pnpm start                # Start dev (with native helper)
pnpm dev                  # Start dev (core only)
```

### Releasing
```bash
git tag v1.0.0
git push origin v1.0.0
# Wait for GitHub Actions...
# Update Homebrew formula
# Test installation
```

### Homebrew Testing
```bash
brew tap yourusername/homebrew-saycast /path/to/tap
brew install saycast
saycast
brew uninstall saycast
```

### Code Signing Verification
```bash
codesign -v /Applications/sayCast.app
spctl -a -v /Applications/sayCast.app
```

---

## Success! 🎉

Once all checkboxes are complete, sayCast is ready for production release via Homebrew!

Track progress and update this checklist as you go.

