const { contextBridge, ipcRenderer } = require('electron');

const portArg = process.argv.find((arg) => arg.startsWith('--hud-port='));
const hudPort = portArg ? Number(portArg.split('=')[1]) : 48123;

contextBridge.exposeInMainWorld('saycastHUD', {
  port: hudPort
});

contextBridge.exposeInMainWorld('sayCastOnboarding', {
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  openSystemPreferences: () => ipcRenderer.invoke('open-system-preferences'),
  testWispr: (apiKey) => ipcRenderer.invoke('test-wispr', apiKey),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  finishOnboarding: (options) => ipcRenderer.invoke('finish-onboarding', options)
});

contextBridge.exposeInMainWorld('sayCastSettings', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testWispr: (apiKey) => ipcRenderer.invoke('test-wispr', apiKey)
});
