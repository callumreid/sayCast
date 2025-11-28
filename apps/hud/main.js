const { app, BrowserWindow, screen, Tray, Menu, nativeImage, shell, ipcMain, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const WebSocket = require('ws');

const HUD_WIDTH = 320;
const HUD_HEIGHT = 140;
const HUD_MARGIN = 16;
const HUD_PORT = process.env.SAYCAST_HUD_PORT ? Number(process.env.SAYCAST_HUD_PORT) : 48123;

const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;
let tray = null;
let coreService = null;

const isProduction = app.isPackaged;

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  const configPath = getConfigPath();
  const defaultConfig = { 
    wisprApiKey: '', 
    raycastScriptsDir: path.join(process.env.HOME || '~', 'raycast-scripts'),
    onboardingComplete: false,
    launchAtLogin: false
  };
  
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...data };
    }
  } catch (e) {
    console.error('[Config] Failed to load:', e.message);
  }
  
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.env.HOME || '~', 'bronson/sayCast/.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log('[Config] Found .env at:', envPath);
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/WISPR_API_KEY=(.+)/);
      if (match) {
        defaultConfig.wisprApiKey = match[1].trim();
        break;
      }
    }
  }
  
  if (process.env.WISPR_API_KEY) {
    defaultConfig.wisprApiKey = process.env.WISPR_API_KEY;
  }
  
  return defaultConfig;
}

function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const existing = loadConfig();
    const merged = { ...existing, ...config };
    
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    return merged;
  } catch (err) {
    return config;
  }
}

function checkAccessibilityPermission() {
  try {
    const result = execSync('osascript -e "tell application \\"System Events\\" to return true"', { encoding: 'utf8', timeout: 2000 });
    return result.trim() === 'true';
  } catch {
    return false;
  }
}

function checkMicrophonePermission() {
  const status = systemPreferences.getMediaAccessStatus('microphone');
  return status === 'granted';
}

async function testWisprConnection(apiKey) {
  return new Promise((resolve) => {
    const url = `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${apiKey}`;
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

function getResourcePath(resourceName) {
  if (isProduction) {
    return path.join(process.resourcesPath, resourceName);
  }
  return path.join(__dirname, 'resources', resourceName);
}

function getNativeHelperPath() {
  if (isProduction) {
    return getResourcePath('SayCastNativeHelper');
  }
  const devPaths = [
    path.join(__dirname, 'resources', 'SayCastNativeHelper'),
    path.join(__dirname, '../native-helper/.build/release/SayCastNativeHelper'),
    path.join(__dirname, '../native-helper/.build/debug/SayCastNativeHelper')
  ];
  
  for (const p of devPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return devPaths[devPaths.length - 1];
}

const DEFAULT_COMMANDS = [
  { id: 'window-left-half', phrases: ['left half', 'snap left', 'window left', 'left side'], script: 'window-left-half.sh' },
  { id: 'window-right-half', phrases: ['right half', 'snap right', 'window right', 'right side'], script: 'window-right-half.sh' },
  { id: 'window-maximize', phrases: ['full screen', 'maximize', 'maximize window', 'make it big'], script: 'window-maximize.sh' },
  { id: 'window-center-third', phrases: ['center third', 'middle third', 'center column'], script: 'window-center-third.sh' },
  { id: 'window-left-third', phrases: ['left third', 'one third left'], script: 'window-left-third.sh' },
  { id: 'window-right-third', phrases: ['right third', 'one third right'], script: 'window-right-third.sh' },
  { id: 'window-top-half', phrases: ['top half', 'upper half'], script: 'window-top-half.sh' },
  { id: 'window-bottom-half', phrases: ['bottom half', 'lower half'], script: 'window-bottom-half.sh' },
  { id: 'window-larger', phrases: ['window larger', 'increase window', 'grow window'], script: 'window-larger.sh' },
  { id: 'window-smaller', phrases: ['window smaller', 'shrink window', 'decrease window'], script: 'window-smaller.sh' },
  { id: 'window-close', phrases: ['close window', 'dismiss window'], script: 'window-close.sh' },
  { id: 'incognito-chrome', phrases: ['incognito', 'open incognito', 'incognito chrome'], script: 'incognito-chrome.sh' },
  { id: 'quicktime-recording', phrases: ['quicktime', 'start recording', 'movie recording'], script: 'quicktime-recording.sh' },
  { id: 'saycast-test', phrases: ['say cast test', 'saycast test', 'run test'], script: 'sayCastTest.sh' },
  { id: 'open-application', phrases: ['open application', 'open app', 'launch'], script: 'open-app-maximized.sh', matchType: 'prefix' },
  { id: 'close-application', phrases: ['close application', 'close app', 'exit app', 'quit app'], script: 'close-app.sh', matchType: 'prefix' },
  { id: 'open-repo', phrases: ['open repo', 'go to repo'], script: 'open-repo.sh', matchType: 'prefix' }
];

function normalizeText(text) {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function matchCommand(utterance, commands) {
  const normalized = normalizeText(utterance);
  if (!normalized) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const cmd of commands) {
    if (cmd.matchType === 'prefix') {
      for (const phrase of cmd.phrases) {
        const normalizedPhrase = normalizeText(phrase);
        if (normalized.startsWith(normalizedPhrase)) {
          const remainder = normalized.slice(normalizedPhrase.length).trim();
          if (remainder.length > 0) {
            const score = 0.95;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = { command: cmd, score, args: [remainder] };
            }
          }
        }
      }
      continue;
    }

    for (const phrase of cmd.phrases) {
      const normalizedPhrase = normalizeText(phrase);
      
      if (normalized === normalizedPhrase) {
        return { command: cmd, score: 1.0 };
      }
      
      if (normalized.includes(normalizedPhrase) || normalizedPhrase.includes(normalized)) {
        const score = 0.85;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { command: cmd, score };
        }
        continue;
      }
      
      const utteranceTokens = new Set(normalized.split(' '));
      const phraseTokens = new Set(normalizedPhrase.split(' '));
      const shared = [...utteranceTokens].filter(t => phraseTokens.has(t));
      const jaccard = shared.length / new Set([...utteranceTokens, ...phraseTokens]).size;
      
      if (jaccard > bestScore) {
        bestScore = jaccard;
        bestMatch = { command: cmd, score: jaccard };
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.4) {
    return bestMatch;
  }
  return null;
}

class WisprClient extends EventEmitter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.socket = null;
    this.isReady = false;
    this.sessionActive = false;
    this.packetsSent = 0;
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  async connect() {
    if (!this.enabled) {
      console.log('[Wispr] No API key configured');
      return;
    }

    if (this.isReady && this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${this.apiKey}`;
    console.log('[Wispr] Connecting...');
    
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);
      
      this.socket.on('open', () => {
        this.isReady = true;
        console.log('[Wispr] Connected');
        resolve();
      });
      
      this.socket.on('message', (data) => this.handleMessage(data.toString()));
      
      this.socket.on('error', (err) => {
        console.error('[Wispr] Socket error:', err.message);
        this.isReady = false;
        reject(err);
      });
      
      this.socket.on('close', () => {
        console.log('[Wispr] Disconnected');
        this.isReady = false;
        this.sessionActive = false;
      });
    });
  }

  async startSession(dictionaryContext = []) {
    if (!this.enabled) return;
    
    if (!this.isReady || !this.socket) {
      await this.connect();
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Wispr socket not open');
    }

    const payload = {
      type: 'auth',
      access_token: this.apiKey,
      language: ['en'],
      context: { dictionary_context: dictionaryContext }
    };

    this.socket.send(JSON.stringify(payload));
    this.sessionActive = true;
    this.packetsSent = 0;
    console.log('[Wispr] Session started');
  }

  appendChunk(chunk) {
    if (!this.sessionActive || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const wavPacket = this.createWavPacket(chunk);

    const message = {
      type: 'append',
      position: this.packetsSent,
      audio_packets: {
        packets: [wavPacket],
        volumes: [1],
        packet_duration: chunk.packetDuration,
        audio_encoding: 'wav',
        byte_encoding: 'base64',
        sample_rate: chunk.sampleRate
      }
    };

    this.socket.send(JSON.stringify(message));
    this.packetsSent += 1;
  }

  commit() {
    if (!this.sessionActive || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = { type: 'commit', total_packets: this.packetsSent };
    this.socket.send(JSON.stringify(payload));
    this.sessionActive = false;
    console.log('[Wispr] Session committed');
  }

  handleMessage(raw) {
    try {
      const data = JSON.parse(raw);
      if (data.status === 'auth') {
        this.emit('auth');
      } else if (data.status === 'text') {
        const text = data.body?.text ?? '';
        if (data.final) {
          this.emit('final', text);
        } else {
          this.emit('partial', text);
        }
      } else if (data.status === 'error') {
        this.emit('error', new Error(data.message ?? 'Wispr error'));
      }
    } catch (error) {
      console.error('[Wispr] Failed to parse message:', raw);
    }
  }

  createWavPacket(chunk) {
    const audioBuffer = Buffer.from(chunk.data, 'base64');
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = chunk.sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = audioBuffer.length;
    const riffChunkSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(riffChunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(chunk.sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, audioBuffer]).toString('base64');
  }

  async close() {
    if (this.socket) {
      this.socket.close(1000, 'shutdown');
      this.socket = null;
    }
    this.isReady = false;
    this.sessionActive = false;
  }
}

class CoreService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.helperProcess = null;
    this.hudServer = null;
    this.hudClients = new Set();
    this.buffer = '';
    this.isListening = false;
    this.wispr = new WisprClient(config.wisprApiKey);
    this.dictionaryContext = DEFAULT_COMMANDS.flatMap(cmd => cmd.phrases);
  }

  async start() {
    await this.startHudServer();
    
    if (this.wispr.enabled) {
      try {
        await this.wispr.connect();
      } catch (e) {
        console.error('[Core] Failed to connect to Wispr:', e.message);
      }
      
      this.wispr.on('partial', (text) => {
        console.log('[Wispr] Partial:', text);
        this.broadcast({ type: 'transcript', text, final: false });
      });
      
      this.wispr.on('final', (text) => {
        console.log('[Wispr] Final:', text);
        this.broadcast({ type: 'transcript', text, final: true });
        this.handleTranscript(text);
      });
      
      this.wispr.on('error', (err) => {
        console.error('[Wispr] Error:', err.message);
        this.broadcast({ type: 'error', message: err.message });
      });
} else {
      console.warn('[Core] No Wispr API key - transcription disabled');
      console.warn('[Core] Set your API key in: ' + getConfigPath());
    }
    
    this.startNativeHelper();
    console.log('[Core] Service started');
  }

  async startHudServer() {
    this.hudServer = new WebSocket.Server({ port: HUD_PORT });
    
    this.hudServer.on('connection', (socket) => {
      console.log('[Core] HUD connected');
      this.hudClients.add(socket);
      
      if (!this.wispr.enabled) {
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'No Wispr API key configured. Click Preferences to set it.' 
        }));
      }
      
      socket.on('close', () => {
        this.hudClients.delete(socket);
      });
    });
    
    this.hudServer.on('listening', () => {
      console.log(`[Core] HUD server listening on port ${HUD_PORT}`);
    });
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const client of this.hudClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  startNativeHelper() {
    const helperPath = getNativeHelperPath();
    console.log('[Core] Starting native helper:', helperPath);
    
    try {
      this.helperProcess = spawn(helperPath, [], { stdio: ['ignore', 'pipe', 'pipe'] });
      
      this.helperProcess.stdout.setEncoding('utf8');
      this.helperProcess.stdout.on('data', (chunk) => this.handleHelperOutput(chunk));
      
      this.helperProcess.stderr.on('data', (chunk) => {
        console.log('[Helper]', chunk.toString().trim());
      });
      
      this.helperProcess.on('close', (code) => {
        console.log('[Core] Native helper exited with code:', code);
        this.helperProcess = null;
        
        if (code !== 0 && code !== null) {
          this.broadcast({ type: 'error', message: 'Native helper crashed. Restarting...' });
          setTimeout(() => this.startNativeHelper(), 2000);
        }
      });
      
      this.helperProcess.on('error', (err) => {
        console.error('[Core] Failed to start native helper:', err.message);
        this.broadcast({ type: 'error', message: 'Failed to start native helper' });
      });
    } catch (error) {
      console.error('[Core] Error spawning native helper:', error);
    }
  }

  handleHelperOutput(chunk) {
    this.buffer += chunk;
    let newlineIndex;
    
    while ((newlineIndex = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      
      if (!line) continue;
      
      try {
        const event = JSON.parse(line);
        this.handleHelperEvent(event);
      } catch (error) {
        console.error('[Core] Failed to parse helper output:', line);
      }
    }
  }

  handleHelperEvent(event) {
    switch (event.type) {
      case 'startListening':
        this.isListening = true;
        this.broadcast({ type: 'listening', active: true });
        this.updateTrayIcon();
        console.log('[Core] Listening started');
        
        if (this.wispr.enabled) {
          this.wispr.startSession(this.dictionaryContext).catch((err) => {
            console.error('[Core] Failed to start Wispr session:', err.message);
            this.broadcast({ type: 'error', message: 'Failed to start transcription' });
          });
        }
        break;
        
      case 'stopListening':
        this.isListening = false;
        this.broadcast({ type: 'listening', active: false });
        this.updateTrayIcon();
        console.log('[Core] Listening stopped');
        
        if (this.wispr.enabled) {
          this.wispr.commit();
        }
        break;
        
      case 'heartbeat':
        break;
        
      case 'audioChunk':
        if (event.payload && this.wispr.enabled) {
          this.wispr.appendChunk({
            data: event.payload.data,
            packetDuration: event.payload.packetDuration,
            sampleRate: event.payload.sampleRate
          });
        }
        break;
        
      case 'error':
        console.error('[Core] Helper error:', event.message);
        this.broadcast({ type: 'error', message: event.message });
        break;
    }
  }

  updateTrayIcon() {
    if (tray) {
      updateTrayIcon(this.isListening);
    }
  }

  handleTranscript(text) {
    const normalized = text.trim();
    if (!normalized) return;

    const match = matchCommand(normalized, DEFAULT_COMMANDS);
    
    if (!match) {
      console.log('[Core] No command matched for:', normalized);
      this.broadcast({ type: 'command', status: 'no-match', text: normalized });
      return;
    }

    console.log('[Core] Matched command:', match.command.id, 'score:', match.score, 'args:', match.args);
    this.broadcast({ type: 'command', status: 'matched', commandId: match.command.id, text: normalized });

    this.executeCommand(match.command, match.args);
  }

  executeCommand(command, args = []) {
    const scriptPath = path.join(this.config.raycastScriptsDir, command.script);
    
    console.log('[Core] Executing:', scriptPath, 'with args:', args);
    
    if (!fs.existsSync(scriptPath)) {
      console.error('[Core] Script not found:', scriptPath);
      this.broadcast({ type: 'command', status: 'failed', commandId: command.id, error: 'Script not found' });
      return;
    }

    const child = spawn(scriptPath, args, { 
      stdio: 'inherit',
      shell: true 
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('[Core] Command executed successfully:', command.id);
        this.broadcast({ type: 'command', status: 'executed', commandId: command.id });
      } else {
        console.error('[Core] Command failed with code:', code);
        this.broadcast({ type: 'command', status: 'failed', commandId: command.id });
      }
    });

    child.on('error', (err) => {
      console.error('[Core] Command error:', err.message);
      this.broadcast({ type: 'command', status: 'failed', commandId: command.id, error: err.message });
    });
  }

  stop() {
    if (this.helperProcess && !this.helperProcess.killed) {
      this.helperProcess.kill();
      this.helperProcess = null;
    }
    
    this.wispr.close();
    
    if (this.hudServer) {
      this.hudServer.close();
      this.hudServer = null;
    }
    
    this.hudClients.clear();
    console.log('[Core] Service stopped');
  }
}

function createTrayIcon(isListening = false) {
  const size = 18;
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" fill="${isListening ? '#22c55e' : '#6b7280'}" />
      <circle cx="9" cy="9" r="3" fill="white" />
    </svg>
  `;
  
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
  return nativeImage.createFromDataURL(dataUrl);
}

function updateTrayIcon(isListening) {
  if (tray) {
    tray.setImage(createTrayIcon(isListening));
    tray.setToolTip(isListening ? 'sayCast - Listening...' : 'sayCast');
  }
}

function createTray() {
  tray = new Tray(createTrayIcon(false));
  tray.setToolTip('sayCast');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'sayCast', enabled: false },
    { type: 'separator' },
    { label: 'Show HUD', click: () => mainWindow?.show() },
    { label: 'Preferences...', accelerator: 'Cmd+,', click: () => openPreferences() },
    { type: 'separator' },
    { label: 'Quit sayCast', accelerator: 'Cmd+Q', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
}

function openPreferences() {
  const prefsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'sayCast Preferences',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  prefsWindow.loadFile(path.join(__dirname, 'settings.html'));
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

let onboardingWindow = null;

function createOnboardingWindow() {
  onboardingWindow = new BrowserWindow({
    width: 540,
    height: 680,
    title: 'Welcome to sayCast',
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  onboardingWindow.loadFile(path.join(__dirname, 'onboarding.html'));
  
  onboardingWindow.on('closed', () => {
    onboardingWindow = null;
  });
}

function setupIpcHandlers() {
  ipcMain.handle('check-permissions', async () => {
    return {
      accessibility: checkAccessibilityPermission(),
      microphone: checkMicrophonePermission()
    };
  });

  ipcMain.handle('open-system-preferences', async () => {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  });

  ipcMain.handle('test-wispr', async (event, apiKey) => {
    return await testWisprConnection(apiKey);
  });

  ipcMain.handle('save-config', async (event, config) => {
    return saveConfig(config);
  });

  ipcMain.handle('load-config', async () => {
    return loadConfig();
  });

  ipcMain.handle('finish-onboarding', async (event, options) => {
    try {
      saveConfig({ 
        onboardingComplete: true,
        launchAtLogin: options.launchAtLogin 
      });
      
      if (options.launchAtLogin) {
        app.setLoginItemSettings({ openAtLogin: true });
      }
      
      const config = loadConfig();
      coreService = new CoreService(config);
      await coreService.start();
      
      createTray();
    createWindow();
      
      if (onboardingWindow) {
        onboardingWindow.close();
      }
    } catch (err) {
      console.error('[Onboarding] Error finishing:', err);
    }
  });
}

if (!gotTheLock) {
  console.log('[sayCast] Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupIpcHandlers();
    
    const config = loadConfig();
    console.log('[sayCast] Config loaded, Wispr API key:', config.wisprApiKey ? 'configured' : 'NOT SET');
    console.log('[sayCast] Onboarding complete:', config.onboardingComplete);
    
    if (!config.onboardingComplete && !config.wisprApiKey) {
      console.log('[sayCast] Starting onboarding...');
      createOnboardingWindow();
    } else {
      coreService = new CoreService(config);
      await coreService.start();
      
      createTray();
      createWindow();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (config.onboardingComplete || config.wisprApiKey) {
        createWindow();
        }
      }
    });
  });

  app.on('window-all-closed', () => {});

  app.on('before-quit', () => {
    if (coreService) {
      coreService.stop();
    }
  });
}
