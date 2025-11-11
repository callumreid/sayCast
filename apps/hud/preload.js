const { contextBridge } = require('electron');

const portArg = process.argv.find((arg) => arg.startsWith('--hud-port='));
const hudPort = portArg ? Number(portArg.split('=')[1]) : 48123;

contextBridge.exposeInMainWorld('saycastHUD', {
  port: hudPort
});
