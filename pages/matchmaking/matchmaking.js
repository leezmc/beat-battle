import { SoundSets } from '../sound-samples/sample-sounds.js';

(() => {
  const entryPanel = document.getElementById('entry-panel');
  const lobbyPanel = document.getElementById('lobby-panel');
  const nicknameInput = document.getElementById('nickname');
  const lobbyCodeInput = document.getElementById('lobby-code');
  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const themeSelect = document.getElementById('theme-select');
  const startBtn = document.getElementById('start-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const errorMessage = document.getElementById('error-message');
  const lobbyCodeDisplay = document.getElementById('lobby-code-display');
  const playerList = document.getElementById('player-list');
  const connectionStatus = document.getElementById('connection-status');

  SoundSets.forEach((set) => {
    const option = document.createElement('option');
    option.value = set.name;
    option.textContent = set.name;
    themeSelect.appendChild(option);
  });

  let selfId = null;
  let hostId = null;
  let selfNickname = '';
  let currentCode = null;

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/ws`);

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function clearError() {
    errorMessage.hidden = true;
    errorMessage.textContent = '';
  }

  function renderPlayers(players) {
    playerList.innerHTML = '';
    players.forEach((player) => {
      const li = document.createElement('li');
      let label = player.nickname;
      if (player.id === hostId) label += ' (Host)';
      if (player.id === selfId) label += ' — you';
      li.textContent = label;
      playerList.appendChild(li);
    });
  }

  function updateHostControls() {
    const isHost = selfId === hostId;
    startBtn.hidden = !isHost;
    themeSelect.disabled = !isHost;
  }

  function setTheme(theme) {
    if (theme && themeSelect.value !== theme) themeSelect.value = theme;
  }

  function enterLobby(code, players, host, self, theme) {
    hostId = host;
    selfId = self;
    currentCode = code;
    lobbyCodeDisplay.textContent = code;
    renderPlayers(players);
    setTheme(theme);
    entryPanel.hidden = true;
    lobbyPanel.hidden = false;
    updateHostControls();
  }

  function exitLobby() {
    hostId = null;
    selfId = null;
    currentCode = null;
    entryPanel.hidden = false;
    lobbyPanel.hidden = true;
    nicknameInput.value = '';
    lobbyCodeInput.value = '';
  }

  socket.addEventListener('open', () => {
    connectionStatus.textContent = '';
    createBtn.disabled = false;
    joinBtn.disabled = false;
  });

  socket.addEventListener('close', () => {
    connectionStatus.textContent = 'Disconnected from server.';
    createBtn.disabled = true;
    joinBtn.disabled = true;
  });

  socket.addEventListener('error', () => {
    connectionStatus.textContent = 'Connection error.';
  });

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'created':
      case 'joined':
        clearError();
        enterLobby(msg.code, msg.players, msg.hostId, msg.selfId, msg.theme);
        break;
      case 'update':
        hostId = msg.hostId;
        renderPlayers(msg.players);
        setTheme(msg.theme);
        updateHostControls();
        break;
      case 'reveal-started': {
        const params = new URLSearchParams({ code: currentCode, id: selfId, nickname: selfNickname, theme: msg.theme });
        location.href = `../sound-samples/sound-samples.html?${params.toString()}`;
        break;
      }
      case 'left':
        exitLobby();
        break;
      case 'error':
        showError(msg.message);
        break;
      default:
        break;
    }
  });

  createBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return showError('Enter a nickname first.');
    clearError();
    selfNickname = nickname;
    socket.send(JSON.stringify({ type: 'create', nickname }));
  });

  joinBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const code = lobbyCodeInput.value.trim().toUpperCase();
    if (!nickname) return showError('Enter a nickname first.');
    if (!code) return showError('Enter a lobby code.');
    clearError();
    selfNickname = nickname;
    socket.send(JSON.stringify({ type: 'join', nickname, code }));
  });

  themeSelect.addEventListener('change', () => {
    socket.send(JSON.stringify({ type: 'set-theme', theme: themeSelect.value }));
  });

  startBtn.addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'start' }));
  });

  leaveBtn.addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'leave' }));
    exitLobby();
  });
})();
