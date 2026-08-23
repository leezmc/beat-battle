const crypto = require('crypto');
const { SongRegistry } = require('./song');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS_PER_LOBBY = 8;
const lobbies = new Map();

function generateCode(registry) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (registry.has(code));
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

const routes = {
  create(msg) {
    const nickname = String(msg.nickname || '').trim().slice(0, 20);
    if (!nickname) return send(this.ws, { type: 'error', message: 'Nickname required.' });
    if (this.lobbyCode) return send(this.ws, { type: 'error', message: 'Already in a lobby.' });

    const code = generateCode(this.lobbies);
      const lobby = { hostId: this.id, players: new Map(), songs: new SongRegistry() };
    lobby.players.set(this.id, { nickname, ws: this.ws });
    this.lobbies.set(code, lobby);
    this.lobbyCode = code;

    send(this.ws, { type: 'created', code, selfId: this.id, ...lobbyState(lobby) });
  },

  join(msg) {
    const nickname = String(msg.nickname || '').trim().slice(0, 20);
    const code = String(msg.code || '').trim().toUpperCase();
    if (!nickname) return send(this.ws, { type: 'error', message: 'Nickname required.' });
    if (!code) return send(this.ws, { type: 'error', message: 'Lobby code required.' });
    if (this.lobbyCode) return send(this.ws, { type: 'error', message: 'Already in a lobby.' });

    const lobby = this.lobbies.get(code);
    if (!lobby) return send(this.ws, { type: 'error', message: 'Lobby not found.' });
    if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
      return send(this.ws, { type: 'error', message: 'Lobby is full.' });
    }

    lobby.players.set(this.id, { nickname, ws: this.ws });
    this.lobbyCode = code;

    send(this.ws, { type: 'joined', code, selfId: this.id, ...lobbyState(lobby) });
    broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
  },

  leave() {
    this.leaveLobby();
    send(this.ws, { type: 'left' });
  },

  'submit-song'(msg) {
    if (!this.lobbyCode) return send(this.ws, { type: 'error', message: 'Not in a lobby.' });
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby) return send(this.ws, { type: 'error', message: 'Lobby not found.' });
    if (!lobby.songs) lobby.songs = new SongRegistry();
    const result = lobby.songs.submit(this.id, msg.song);
    if (!result.ok) return send(this.ws, { type: 'error', message: result.error });
    send(this.ws, { type: 'song-accepted', entryId: result.entryId });
  },

  'request-songs'() {
    if (!this.lobbyCode) return send(this.ws, { type: 'error', message: 'Not in a lobby.' });
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby) return send(this.ws, { type: 'error', message: 'Lobby not found.' });
    if (!lobby.songs) lobby.songs = new SongRegistry();
    send(this.ws, { type: 'songs', songs: lobby.songs.listAnonymous() });
  },
};

class LobbyConnection {
  constructor(ws, options = {}) {
    this.ws = ws;
    this.id = options.id || crypto.randomUUID();
    this.lobbies = options.lobbies || lobbies;
    this.lobbyCode = null;
  }

  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const route = routes[msg.type];
    if (route) route.call(this, msg);
  }

  leaveLobby() {
    if (!this.lobbyCode) return;
    const code = this.lobbyCode;
    const lobby = this.lobbies.get(code);
    this.lobbyCode = null;
    if (!lobby) return;

    lobby.players.delete(this.id);
    if (lobby.players.size === 0) {
      this.lobbies.delete(code);
      return;
    }
    if (lobby.hostId === this.id) {
      lobby.hostId = lobby.players.keys().next().value;
    }
    broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
  }
}

module.exports = { LobbyConnection, MAX_PLAYERS_PER_LOBBY };
