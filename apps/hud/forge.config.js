const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'sayCast',
    executableName: 'sayCast',
    appBundleId: 'com.callumreid.saycast',
    icon: path.join(__dirname, 'assets', 'icon'),
    asar: true,
    extraResource: [
      path.join(__dirname, 'resources', 'SayCastNativeHelper')
    ],
    ignore: [
      /node_modules/,
      /scripts/,
      /assets/,
      /\.git/,
      /\.env/,
      /forge\.config\.js/,
      /tsconfig/,
      /README/,
      /^\/main\.js$/
    ],
    prune: false,
    appCategoryType: 'public.app-category.productivity',
    extendInfo: {
      NSMicrophoneUsageDescription: 'sayCast needs microphone access to transcribe your voice commands.',
      NSAppleEventsUsageDescription: 'sayCast needs automation access to execute commands in other applications.'
    },
    osxSign: {
      identity: 'Developer ID Application: Callum Reid (9YNV67PASF)',
      hardenedRuntime: true,
      entitlements: path.join(__dirname, 'entitlements.plist'),
      'entitlements-inherit': path.join(__dirname, 'entitlements.plist'),
      'signature-flags': 'library',
      'gatekeeper-assess': false
    },
    osxNotarize: {
      tool: 'notarytool',
      keychainProfile: 'sayCast-notarize'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        name: 'sayCast',
        icon: path.join(__dirname, 'assets', 'icon.icns'),
        background: path.join(__dirname, 'assets', 'dmg-background.png'),
        contents: [
          { x: 180, y: 200, type: 'file', path: path.join(__dirname, 'out', 'sayCast-darwin-arm64', 'sayCast.app') },
          { x: 480, y: 200, type: 'link', path: '/Applications' }
        ],
        window: {
          size: { width: 660, height: 400 }
        }
      }
    }
  ],
  plugins: []
};
