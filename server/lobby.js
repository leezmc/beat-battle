const crypto = require('crypto');
const { SongRegistry } = require('./song');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS_PER_LOBBY = 8;
const REVEAL_DURATION_MS = 10_000;
const ROUND_DURATION_MS = 60_000;
const VOTE_DURATION_MS = 30_000;
const DEFAULT_THEME = 'Techno';
const lobbies = new Map();

function generateCode(registry) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (registry.has(code));
  return code;
}

function createLobby(hostId) {
  return {
    hostId,
    players: new Map(),
    phase: 'lobby',
    theme: DEFAULT_THEME,
    revealEndsAt: null,
    revealTimer: null,
    songs: new SongRegistry(),
    roundEndsAt: null,
    roundTimer: null,
    voteQueue: [],
    voteIndex: 0,
    votes: new Map(),
    voteEndsAt: null,
    voteTimer: null,
    results: null,
  };
}

function lobbyState(lobby) {
  return {
    hostId: lobby.hostId,
    theme: lobby.theme,
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

function currentVotePayload(lobby, playerId) {
  const ownerId = lobby.voteQueue[lobby.voteIndex];
  return {
    voteIndex: lobby.voteIndex,
    totalBeats: lobby.voteQueue.length,
    voteEndsAt: lobby.voteEndsAt,
    currentBeat: lobby.songs.getSong(ownerId),
    canVote: ownerId !== playerId,
  };
}

function broadcastCurrentVote(lobby, type) {
  for (const [playerId, { ws }] of lobby.players) {
    send(ws, { type, ...currentVotePayload(lobby, playerId) });
  }
}

function phasePayload(lobby, playerId) {
  if (lobby.phase === 'reveal') {
    return { revealEndsAt: lobby.revealEndsAt };
  }
  if (lobby.phase === 'playing') {
    return { roundEndsAt: lobby.roundEndsAt, submitted: lobby.songs.has(playerId) };
  }
  if (lobby.phase === 'voting') {
    return currentVotePayload(lobby, playerId);
  }
  if (lobby.phase === 'results') {
    return { results: lobby.results };
  }
  return {};
}

function startReveal(lobby, code) {
  lobby.phase = 'reveal';
  lobby.revealEndsAt = Date.now() + REVEAL_DURATION_MS;
  clearTimeout(lobby.revealTimer);
  lobby.revealTimer = setTimeout(() => startGame(lobby, code), REVEAL_DURATION_MS);
  broadcast(lobby, { type: 'reveal-started', code, theme: lobby.theme, revealEndsAt: lobby.revealEndsAt });
}

function startGame(lobby, code) {
  lobby.phase = 'playing';
  lobby.songs.clear();
  lobby.roundEndsAt = Date.now() + ROUND_DURATION_MS;
  clearTimeout(lobby.roundTimer);
  lobby.roundTimer = setTimeout(() => startVoting(lobby, code), ROUND_DURATION_MS);
  broadcast(lobby, { type: 'game-started', code, roundEndsAt: lobby.roundEndsAt });
}

function maybeAdvancePlayingEarly(lobby, code) {
  if (lobby.songs.size >= lobby.players.size) {
    clearTimeout(lobby.roundTimer);
    startVoting(lobby, code);
  }
}

function startVoting(lobby, code) {
  lobby.phase = 'voting';
  lobby.voteQueue = lobby.songs.playerIds();
  lobby.voteIndex = 0;
  lobby.votes = new Map(lobby.voteQueue.map((id) => [id, new Map()]));

  if (lobby.voteQueue.length === 0) {
    finishVoting(lobby, code);
    return;
  }

  lobby.voteEndsAt = Date.now() + VOTE_DURATION_MS;
  clearTimeout(lobby.voteTimer);
  lobby.voteTimer = setTimeout(() => advanceVote(lobby, code), VOTE_DURATION_MS);
  broadcastCurrentVote(lobby, 'voting-started');
}

function advanceVote(lobby, code) {
  lobby.voteIndex += 1;
  if (lobby.voteIndex >= lobby.voteQueue.length) {
    finishVoting(lobby, code);
    return;
  }

  lobby.voteEndsAt = Date.now() + VOTE_DURATION_MS;
  clearTimeout(lobby.voteTimer);
  lobby.voteTimer = setTimeout(() => advanceVote(lobby, code), VOTE_DURATION_MS);
  broadcastCurrentVote(lobby, 'next-beat');
}

function maybeAdvanceVoteEarly(lobby, code) {
  const ownerId = lobby.voteQueue[lobby.voteIndex];
  const votesIn = lobby.votes.get(ownerId).size;
  const expectedVoters = Math.max(0, lobby.players.size - 1);
  if (expectedVoters > 0 && votesIn >= expectedVoters) {
    clearTimeout(lobby.voteTimer);
    advanceVote(lobby, code);
  }
}

function computeResults(lobby) {
  return Array.from(lobby.players, ([id, player]) => {
    const votes = lobby.votes.get(id);
    const voteCount = votes ? votes.size : 0;
    const averageScore = voteCount
      ? Array.from(votes.values()).reduce((a, b) => a + b, 0) / voteCount
      : null;
    return {
      playerId: id,
      nickname: player.nickname,
      averageScore,
      voteCount,
      beat: lobby.songs.getSong(id),
    };
  }).sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1) || a.nickname.localeCompare(b.nickname));
}

function finishVoting(lobby, code) {
  lobby.phase = 'results';
  clearTimeout(lobby.revealTimer);
  clearTimeout(lobby.roundTimer);
  clearTimeout(lobby.voteTimer);
  lobby.results = computeResults(lobby);
  broadcast(lobby, { type: 'results', code, results: lobby.results });
}

const routes = {
  create(msg) {
    const nickname = String(msg.nickname || '').trim().slice(0, 20);
    if (!nickname) return send(this.ws, { type: 'error', message: 'Nickname required.' });
    if (this.lobbyCode) return send(this.ws, { type: 'error', message: 'Already in a lobby.' });

    const code = generateCode(this.lobbies);
    const lobby = createLobby(this.id);
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
    if (lobby.phase !== 'lobby') return send(this.ws, { type: 'error', message: 'Game already in progress.' });
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

  rejoin(msg) {
    const code = String(msg.code || '').trim().toUpperCase();
    const rejoinId = String(msg.id || '');
    const nickname = String(msg.nickname || '').trim().slice(0, 20);
    if (!code || !rejoinId) return send(this.ws, { type: 'error', message: 'Missing session info.' });

    const lobby = this.lobbies.get(code);
    if (!lobby) return send(this.ws, { type: 'error', message: 'Lobby not found.' });

    if (lobby.players.has(rejoinId)) {
      const existing = lobby.players.get(rejoinId);
      lobby.players.set(rejoinId, { nickname: existing.nickname, ws: this.ws });
      this.id = rejoinId;
      this.lobbyCode = code;
    } else if (lobby.phase === 'lobby') {
      if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
        return send(this.ws, { type: 'error', message: 'Lobby is full.' });
      }
      lobby.players.set(rejoinId, { nickname: nickname || 'Player', ws: this.ws });
      this.id = rejoinId;
      this.lobbyCode = code;
      broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
    } else {
      return send(this.ws, { type: 'error', message: 'Session expired. Return to the lobby.' });
    }

    send(this.ws, {
      type: 'rejoined',
      code,
      selfId: this.id,
      ...lobbyState(lobby),
      phase: lobby.phase,
      ...phasePayload(lobby, this.id),
    });
  },

  'set-theme'(msg) {
    if (!this.lobbyCode) return;
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby) return;
    if (lobby.hostId !== this.id) return send(this.ws, { type: 'error', message: 'Only the host can set the theme.' });
    if (lobby.phase !== 'lobby') return;
    const theme = String(msg.theme || '').trim().slice(0, 40);
    if (!theme) return;
    lobby.theme = theme;
    broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
  },

  start() {
    if (!this.lobbyCode) return;
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby) return;
    if (lobby.hostId !== this.id) return send(this.ws, { type: 'error', message: 'Only the host can start the game.' });
    if (lobby.phase !== 'lobby') return;
    startReveal(lobby, this.lobbyCode);
  },

  'submit-beat'(msg) {
    if (!this.lobbyCode) return;
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby || lobby.phase !== 'playing') return;
    const result = lobby.songs.submit(this.id, msg.beat);
    if (!result.ok) return send(this.ws, { type: 'error', message: result.error });
    maybeAdvancePlayingEarly(lobby, this.lobbyCode);
  },

  'submit-vote'(msg) {
    if (!this.lobbyCode) return;
    const lobby = this.lobbies.get(this.lobbyCode);
    if (!lobby || lobby.phase !== 'voting') return;
    const ownerId = lobby.voteQueue[lobby.voteIndex];
    if (!ownerId || !lobby.votes.has(ownerId) || ownerId === this.id) return;
    const rawRating = parseInt(msg.rating, 10);
    if (!Number.isInteger(rawRating) || rawRating < 1 || rawRating > 5) return;
    lobby.votes.get(ownerId).set(this.id, rawRating);
    maybeAdvanceVoteEarly(lobby, this.lobbyCode);
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

    if (lobby.phase === 'results') {
      const stillConnected = Array.from(lobby.players.values())
        .some((player) => player.ws.readyState === player.ws.OPEN);
      if (!stillConnected) this.lobbies.delete(code);
      return;
    }

    if (lobby.phase !== 'lobby') return;

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
