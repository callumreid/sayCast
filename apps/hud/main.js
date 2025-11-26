const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

const HUD_WIDTH = 320;
const HUD_HEIGHT = 140;
const HUD_MARGIN = 16;
const HUD_PORT = process.env.SAYCAST_HUD_PORT ? Number(process.env.SAYCAST_HUD_PORT) : 48123;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[HUD] Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    x: width - HUD_WIDTH - HUD_MARGIN,
    y: HUD_MARGIN,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--hud-port=${HUD_PORT}`]
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

if (gotTheLock) {
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
