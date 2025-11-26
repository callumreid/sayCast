const API_ENDPOINT = `http://localhost:${process.env.SAYCAST_HUD_PORT || 48123}`;

class SettingsManager {
  constructor() {
    this.initializeEventListeners();
    this.loadSettings();
  }

  initializeEventListeners() {
    document.getElementById('closeBtn').addEventListener('click', () => window.close());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  async loadSettings() {
    const settings = await this.fetchSettings();
    this.populateSettings(settings);
  }

  async fetchSettings() {
    const response = await fetch(`${API_ENDPOINT}/api/settings`);
    return response.json();
  }

  populateSettings(settings) {
    const s = settings;

    if (s.wispr?.apiKey) {
      document.getElementById('wispr-api-key').value = s.wispr.apiKey;
    }
    if (s.openai?.apiKey) {
      document.getElementById('openai-api-key').value = s.openai.apiKey;
    }
    if (s.wispr?.language) {
      document.getElementById('wispr-language').value = s.wispr.language;
    }

    if (s.audio?.sensitivity !== undefined) {
      document.getElementById('sensitivity').value = s.audio.sensitivity;
      document.getElementById('sensitivityValue').textContent = `${s.audio.sensitivity}%`;
    }
    if (s.audio?.silenceTimeout !== undefined) {
      document.getElementById('silenceTimeout').value = s.audio.silenceTimeout;
      document.getElementById('silenceTimeoutValue').textContent = `${s.audio.silenceTimeout}s`;
    }

    if (s.general?.hotkeyModifiers) {
      document.getElementById('hotkey-modifiers').value = s.general.hotkeyModifiers;
    }
    if (s.general?.hotkeyTrigger) {
      document.getElementById('hotkey-trigger').value = s.general.hotkeyTrigger;
    }
    if (s.general?.autoStart !== undefined) {
      document.getElementById('auto-start').checked = s.general.autoStart;
    }
    if (s.general?.showHud !== undefined) {
      document.getElementById('show-hud').checked = s.general.showHud;
    }
    if (s.general?.matchThreshold !== undefined) {
      document.getElementById('matchThreshold').value = s.general.matchThreshold;
      document.getElementById('matchThresholdValue').textContent = `${s.general.matchThreshold}%`;
    }

    if (s.commands?.customCommands) {
      this.renderCommandsList(s.commands.customCommands);
      document.getElementById('commands-yaml').value = this.commandsToYaml(s.commands.customCommands);
    }
  }

  renderCommandsList(commands) {
    const list = document.getElementById('commandsList');
    list.innerHTML = '';

    commands.forEach((cmd, idx) => {
      const el = document.createElement('div');
      el.className = 'command-item';
      el.innerHTML = `
        <div class="command-item-content">
          <div class="command-item-phrase">${cmd.phrases?.join(', ') || 'Untitled'}</div>
          <div class="command-item-action">→ ${cmd.action || 'No action'}</div>
        </div>
        <button class="command-item-btn" onclick="settingsManager.editCommand(${idx})">Edit</button>
        <button class="command-item-btn" onclick="settingsManager.deleteCommand(${idx})">Delete</button>
      `;
      list.appendChild(el);
    });
  }

  commandsToYaml(commands) {
    let yaml = '';
    commands.forEach(cmd => {
      yaml += `- phrases:\n`;
      (cmd.phrases || []).forEach(phrase => {
        yaml += `    - "${phrase}"\n`;
      });
      yaml += `  action: ${cmd.action || 'raycast'}\n`;
      yaml += `  command: ${cmd.command || ''}\n`;
      yaml += `\n`;
    });
    return yaml;
  }

  editCommand(idx) {
    alert(`Edit command ${idx} (not yet implemented)`);
  }

  deleteCommand(idx) {
    alert(`Delete command ${idx} (not yet implemented)`);
  }

  async saveSettings(section, data) {
    const response = await fetch(`${API_ENDPOINT}/api/settings/${section}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  showStatus(elementId, message, type = 'success') {
    const el = document.getElementById(elementId);
    const msgEl = document.getElementById(`${elementId}Msg`);
    el.className = `alert alert-${type}`;
    msgEl.textContent = message;
    el.style.display = 'flex';

    setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }
}

const settingsManager = new SettingsManager();

function togglePasswordField(id) {
  const field = document.getElementById(id);
  const btn = event.target;
  if (field.type === 'password') {
    field.type = 'text';
    btn.textContent = 'Hide';
  } else {
    field.type = 'password';
    btn.textContent = 'Show';
  }
}

function updateSliderValue(slider) {
  const valueSpan = document.getElementById(`${slider.id}Value`);
  if (slider.id === 'silenceTimeout') {
    valueSpan.textContent = `${slider.value}s`;
  } else if (slider.id === 'sensitivity' || slider.id === 'matchThreshold') {
    valueSpan.textContent = `${slider.value}%`;
  }
}

async function saveApiSettings() {
  const settings = {
    wispr: {
      apiKey: document.getElementById('wispr-api-key').value,
      language: document.getElementById('wispr-language').value
    },
    openai: {
      apiKey: document.getElementById('openai-api-key').value
    }
  };

  await settingsManager.saveSettings('api', settings);
  settingsManager.showStatus('apiStatus', '✅ API settings saved successfully!', 'success');
}

async function testWispr() {
  const apiKey = document.getElementById('wispr-api-key').value;
  if (!apiKey) {
    settingsManager.showStatus('apiStatus', '❌ Please enter your Wispr API key first', 'error');
    return;
  }

  settingsManager.showStatus('apiStatus', '🔄 Testing Wispr connection...', 'info');
  
  const result = await fetch(`${API_ENDPOINT}/api/test/wispr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  }).then(r => r.json()).catch(() => ({ success: false, error: 'Connection failed' }));

  if (result.success) {
    settingsManager.showStatus('apiStatus', '✅ Wispr connection successful!', 'success');
  } else {
    settingsManager.showStatus('apiStatus', `❌ Wispr test failed: ${result.error}`, 'error');
  }
}

async function saveAudioSettings() {
  const settings = {
    audio: {
      sensitivity: Number(document.getElementById('sensitivity').value),
      silenceTimeout: Number(document.getElementById('silenceTimeout').value),
      micDevice: document.getElementById('mic-device').value
    }
  };

  await settingsManager.saveSettings('audio', settings);
  settingsManager.showStatus('commandsStatus', '✅ Audio settings saved!', 'success');
}

async function testMicrophone() {
  alert('🎙️ Microphone test not yet implemented. Your microphone seems to be working if the hotkey captures audio.');
}

async function saveCustomCommands() {
  const yaml = document.getElementById('commands-yaml').value;
  const settings = { commands: { yaml } };

  await settingsManager.saveSettings('commands', settings);
  settingsManager.showStatus('commandsStatus', '✅ Commands saved!', 'success');
}

function openCommandEditor() {
  alert('Command editor modal not yet implemented');
}

async function exportCommands() {
  const settings = await settingsManager.fetchSettings();
  const yaml = settingsManager.commandsToYaml(settings.commands?.customCommands || []);

  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saycast-commands.yaml';
  a.click();
  URL.revokeObjectURL(url);

  settingsManager.showStatus('commandsStatus', '✅ Commands exported!', 'success');
}

async function importCommands(event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  document.getElementById('commands-yaml').value = text;
  settingsManager.showStatus('commandsStatus', '✅ Commands loaded. Click "Save Commands" to apply.', 'info');
}

async function saveGeneralSettings() {
  const settings = {
    general: {
      hotkeyModifiers: document.getElementById('hotkey-modifiers').value,
      hotkeyTrigger: document.getElementById('hotkey-trigger').value,
      autoStart: document.getElementById('auto-start').checked,
      showHud: document.getElementById('show-hud').checked,
      matchThreshold: Number(document.getElementById('matchThreshold').value)
    }
  };

  await settingsManager.saveSettings('general', settings);
  settingsManager.showStatus('commandsStatus', '✅ General settings saved!', 'success');
}

function openLogs() {
  alert('Log viewer not yet implemented. Check ~/Library/Logs/sayCast/ for logs.');
}

async function exportLogs() {
  alert('Log export not yet implemented. Check ~/Library/Logs/sayCast/ directly.');
}

function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    fetch(`${API_ENDPOINT}/api/settings/reset`, { method: 'POST' })
      .then(() => {
        settingsManager.loadSettings();
        settingsManager.showStatus('commandsStatus', '✅ Settings reset to defaults!', 'success');
      });
  }
}

