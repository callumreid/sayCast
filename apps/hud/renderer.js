(() => {
  const params = new URLSearchParams(window.location.search);
  const port = window.saycastHUD?.port || Number(params.get('port')) || 48123;
  const endpoint = `ws://localhost:${port}`;

  const indicator = document.getElementById('mic-indicator');
  const stateLabel = document.getElementById('state-label');
  const transcriptEl = document.getElementById('transcript');
  const commandStatusEl = document.getElementById('command-status');

  let ws;
  let reconnectTimeout;

  function setState(text) {
    stateLabel.textContent = text;
  }

  function setIndicator(active, isError = false) {
    indicator.classList.toggle('active', active);
    indicator.classList.toggle('error', isError);
  }

  function logCommand(message, statusClass = '') {
    commandStatusEl.textContent = message || '';
    commandStatusEl.className = `command-status ${statusClass}`;
  }

  function connect() {
    ws = new WebSocket(endpoint);

    ws.onopen = () => {
      setState('Connected');
      logCommand('Listening for sayCast events');
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      switch (payload.type) {
        case 'state':
          setState(payload.state ?? 'Idle');
          break;
        case 'listening':
          setIndicator(payload.active);
          setState(payload.active ? 'Listening…' : 'Idle');
          if (!payload.active) {
            transcriptEl.textContent = 'Hold Ctrl+Option+S…';
          }
          break;
        case 'transcript':
          transcriptEl.textContent = payload.text || '';
          break;
        case 'command':
          if (payload.status === 'matched') {
            logCommand(`Matched ${payload.commandId ?? ''}`.trim(), ' matched');
          } else if (payload.status === 'executed') {
            logCommand(`Executed ${payload.commandId ?? ''}`.trim(), ' success');
          } else if (payload.status === 'failed') {
            logCommand(`Failed ${payload.commandId ?? ''}`.trim(), ' error');
            setIndicator(false, true);
          }
          break;
        case 'error':
          logCommand(payload.message ?? 'Error', ' error');
          setIndicator(false, true);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      setState('Disconnected');
      setIndicator(false, true);
      logCommand('Reconnecting…', ' error');
      reconnectTimeout = setTimeout(connect, 1500);
    };

    ws.onerror = () => {
      setIndicator(false, true);
    };
  }

  window.addEventListener('beforeunload', () => {
    if (ws) {
      ws.close();
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  });

  connect();
})();
