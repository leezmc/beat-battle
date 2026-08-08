(() => {
  const entryPanel = document.getElementById('entry-panel');
  const lobbyPanel = document.getElementById('lobby-panel');
  const nicknameInput = document.getElementById('nickname');
  const lobbyCodeInput = document.getElementById('lobby-code');
  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const errorMessage = document.getElementById('error-message');
  const lobbyCodeDisplay = document.getElementById('lobby-code-display');
  const playerList = document.getElementById('player-list');
  const connectionStatus = document.getElementById('connection-status');

  let selfId = null;
  let hostId = null;

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

  function enterLobby(code, players, host, self) {
    hostId = host;
    selfId = self;
    lobbyCodeDisplay.textContent = code;
    renderPlayers(players);
    entryPanel.hidden = true;
    lobbyPanel.hidden = false;
  }

  function exitLobby() {
    hostId = null;
    selfId = null;
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
        enterLobby(msg.code, msg.players, msg.hostId, msg.selfId);
        break;
      case 'update':
        hostId = msg.hostId;
        renderPlayers(msg.players);
        break;
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
    socket.send(JSON.stringify({ type: 'create', nickname }));
  });

  joinBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const code = lobbyCodeInput.value.trim().toUpperCase();
    if (!nickname) return showError('Enter a nickname first.');
    if (!code) return showError('Enter a lobby code.');
    clearError();
    socket.send(JSON.stringify({ type: 'join', nickname, code }));
  });

  leaveBtn.addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'leave' }));
    exitLobby();
  });
})();
