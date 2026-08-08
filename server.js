const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.get('/', (req, res) => res.redirect('/landing/landing.html'));
app.use(express.static(path.join(__dirname, 'pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS_PER_LOBBY = 8;

// code -> { hostId, players: Map<id, { nickname, ws }> }
const lobbies = new Map();

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (lobbies.has(code));
  return code;
}

function lobbyState(lobby) {
  return {
    hostId: lobby.hostId,
    players: Array.from(lobby.players, ([id, player]) => ({ id, nickname: player.nickname })),
  };
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function broadcast(lobby, message) {
  const data = JSON.stringify(message);
  for (const { ws } of lobby.players.values()) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

wss.on('connection', (ws) => {
  const id = crypto.randomUUID();
  let lobbyCode = null;

  function leaveLobby() {
    if (!lobbyCode) return;
    const lobby = lobbies.get(lobbyCode);
    lobbyCode = null;
    if (!lobby) return;

    lobby.players.delete(id);
    if (lobby.players.size === 0) {
      lobbies.delete(lobbyCode);
      return;
    }
    if (lobby.hostId === id) {
      lobby.hostId = lobby.players.keys().next().value;
    }
    broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'create') {
      const nickname = String(msg.nickname || '').trim().slice(0, 20);
      if (!nickname) return send(ws, { type: 'error', message: 'Nickname required.' });
      if (lobbyCode) return send(ws, { type: 'error', message: 'Already in a lobby.' });

      const code = generateCode();
      const lobby = { hostId: id, players: new Map() };
      lobby.players.set(id, { nickname, ws });
      lobbies.set(code, lobby);
      lobbyCode = code;

      send(ws, { type: 'created', code, selfId: id, ...lobbyState(lobby) });
      return;
    }

    if (msg.type === 'join') {
      const nickname = String(msg.nickname || '').trim().slice(0, 20);
      const code = String(msg.code || '').trim().toUpperCase();
      if (!nickname) return send(ws, { type: 'error', message: 'Nickname required.' });
      if (!code) return send(ws, { type: 'error', message: 'Lobby code required.' });
      if (lobbyCode) return send(ws, { type: 'error', message: 'Already in a lobby.' });

      const lobby = lobbies.get(code);
      if (!lobby) return send(ws, { type: 'error', message: 'Lobby not found.' });
      if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
        return send(ws, { type: 'error', message: 'Lobby is full.' });
      }

      lobby.players.set(id, { nickname, ws });
      lobbyCode = code;

      send(ws, { type: 'joined', code, selfId: id, ...lobbyState(lobby) });
      broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
      return;
    }

    if (msg.type === 'leave') {
      leaveLobby();
      send(ws, { type: 'left' });
    }
  });

  ws.on('close', leaveLobby);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Beat Battle listening on http://localhost:${PORT}`);
});
