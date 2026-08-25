const path = require('path');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { LobbyConnection } = require('./server/lobby');

const app = express();
app.get('/', (req, res) => res.redirect('/landing/landing.html'));
app.use(express.static(path.join(__dirname, 'pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS_PER_LOBBY = 8;
const REVEAL_DURATION_MS = 10_000;
const ROUND_DURATION_MS = 60_000;
const VOTE_DURATION_MS = 30_000;
const DEFAULT_THEME = 'Techno';

// code -> { hostId, players: Map<id, { nickname, ws }> }
const lobbies = new Map();

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (lobbies.has(code));
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
    beats: new Map(),
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

function currentVotePayload(lobby) {
  const ownerId = lobby.voteQueue[lobby.voteIndex];
  return {
    voteIndex: lobby.voteIndex,
    voteEndsAt: lobby.voteEndsAt,
    currentBeat: lobby.beats.get(ownerId) || null,
    currentBeatOwnerId: ownerId,
    currentBeatOwnerNickname: lobby.players.get(ownerId)?.nickname || '',
  };
}

function phasePayload(lobby, playerId) {
  if (lobby.phase === 'reveal') {
    return { revealEndsAt: lobby.revealEndsAt };
  }
  if (lobby.phase === 'playing') {
    return { roundEndsAt: lobby.roundEndsAt, submitted: lobby.beats.has(playerId) };
  }
  if (lobby.phase === 'voting') {
    return { voteQueue: lobby.voteQueue, ...currentVotePayload(lobby) };
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
  lobby.beats = new Map();
  lobby.roundEndsAt = Date.now() + ROUND_DURATION_MS;
  clearTimeout(lobby.roundTimer);
  lobby.roundTimer = setTimeout(() => startVoting(lobby, code), ROUND_DURATION_MS);
  broadcast(lobby, { type: 'game-started', code, roundEndsAt: lobby.roundEndsAt });
}

function maybeAdvancePlayingEarly(lobby, code) {
  if (lobby.beats.size >= lobby.players.size) {
    clearTimeout(lobby.roundTimer);
    startVoting(lobby, code);
  }
}

function startVoting(lobby, code) {
  lobby.phase = 'voting';
  lobby.voteQueue = Array.from(lobby.beats.keys());
  lobby.voteIndex = 0;
  lobby.votes = new Map(lobby.voteQueue.map((id) => [id, new Map()]));

  if (lobby.voteQueue.length === 0) {
    finishVoting(lobby, code);
    return;
  }

  lobby.voteEndsAt = Date.now() + VOTE_DURATION_MS;
  clearTimeout(lobby.voteTimer);
  lobby.voteTimer = setTimeout(() => advanceVote(lobby, code), VOTE_DURATION_MS);
  broadcast(lobby, { type: 'voting-started', voteQueue: lobby.voteQueue, ...currentVotePayload(lobby) });
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
  broadcast(lobby, { type: 'next-beat', ...currentVotePayload(lobby) });
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
    return { playerId: id, nickname: player.nickname, averageScore, voteCount };
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

wss.on('connection', (ws) => {
  let playerId = crypto.randomUUID();
  let lobbyCode = null;

  function leaveLobby() {
    if (!lobbyCode) return;
    const lobby = lobbies.get(lobbyCode);
    const code = lobbyCode;
    lobbyCode = null;
    if (!lobby) return;

    if (lobby.phase === 'results') {
      const stillConnected = Array.from(lobby.players.values())
        .some((player) => player.ws.readyState === player.ws.OPEN);
      if (!stillConnected) lobbies.delete(code);
      return;
    }

    if (lobby.phase !== 'lobby') return;

    lobby.players.delete(playerId);
    if (lobby.players.size === 0) {
      lobbies.delete(code);
      return;
    }
    if (lobby.hostId === playerId) {
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
      const lobby = createLobby(playerId);
      lobby.players.set(playerId, { nickname, ws });
      lobbies.set(code, lobby);
      lobbyCode = code;

      send(ws, { type: 'created', code, selfId: playerId, ...lobbyState(lobby) });
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
      if (lobby.phase !== 'lobby') return send(ws, { type: 'error', message: 'Game already in progress.' });
      if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
        return send(ws, { type: 'error', message: 'Lobby is full.' });
      }

      lobby.players.set(playerId, { nickname, ws });
      lobbyCode = code;

      send(ws, { type: 'joined', code, selfId: playerId, ...lobbyState(lobby) });
      broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
      return;
    }

    if (msg.type === 'leave') {
      leaveLobby();
      send(ws, { type: 'left' });
      return;
    }

    if (msg.type === 'rejoin') {
      const code = String(msg.code || '').trim().toUpperCase();
      const rejoinId = String(msg.id || '');
      const nickname = String(msg.nickname || '').trim().slice(0, 20);
      if (!code || !rejoinId) return send(ws, { type: 'error', message: 'Missing session info.' });

      const lobby = lobbies.get(code);
      if (!lobby) return send(ws, { type: 'error', message: 'Lobby not found.' });

      if (lobby.players.has(rejoinId)) {
        const existing = lobby.players.get(rejoinId);
        lobby.players.set(rejoinId, { nickname: existing.nickname, ws });
        playerId = rejoinId;
        lobbyCode = code;
      } else if (lobby.phase === 'lobby') {
        if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
          return send(ws, { type: 'error', message: 'Lobby is full.' });
        }
        lobby.players.set(rejoinId, { nickname: nickname || 'Player', ws });
        playerId = rejoinId;
        lobbyCode = code;
        broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
      } else {
        return send(ws, { type: 'error', message: 'Session expired. Return to the lobby.' });
      }

      send(ws, {
        type: 'rejoined',
        code,
        selfId: playerId,
        ...lobbyState(lobby),
        phase: lobby.phase,
        ...phasePayload(lobby, playerId),
      });
      return;
    }

    if (msg.type === 'set-theme') {
      if (!lobbyCode) return;
      const lobby = lobbies.get(lobbyCode);
      if (!lobby) return;
      if (lobby.hostId !== playerId) return send(ws, { type: 'error', message: 'Only the host can set the theme.' });
      if (lobby.phase !== 'lobby') return;
      const theme = String(msg.theme || '').trim().slice(0, 40);
      if (!theme) return;
      lobby.theme = theme;
      broadcast(lobby, { type: 'update', ...lobbyState(lobby) });
      return;
    }

    if (msg.type === 'start') {
      if (!lobbyCode) return;
      const lobby = lobbies.get(lobbyCode);
      if (!lobby) return;
      if (lobby.hostId !== playerId) return send(ws, { type: 'error', message: 'Only the host can start the game.' });
      if (lobby.phase !== 'lobby') return;
      startReveal(lobby, lobbyCode);
      return;
    }

    if (msg.type === 'submit-beat') {
      if (!lobbyCode) return;
      const lobby = lobbies.get(lobbyCode);
      if (!lobby || lobby.phase !== 'playing') return;
      lobby.beats.set(playerId, msg.beat);
      maybeAdvancePlayingEarly(lobby, lobbyCode);
      return;
    }

    if (msg.type === 'submit-vote') {
      if (!lobbyCode) return;
      const lobby = lobbies.get(lobbyCode);
      if (!lobby || lobby.phase !== 'voting') return;
      const ownerId = lobby.voteQueue[lobby.voteIndex];
      if (!ownerId || !lobby.votes.has(ownerId) || ownerId === playerId) return;
      const rating = Math.max(1, Math.min(5, parseInt(msg.rating, 10) || 0));
      if (!rating) return;
      lobby.votes.get(ownerId).set(playerId, rating);
      maybeAdvanceVoteEarly(lobby, lobbyCode);
      return;
    }
  });

  ws.on('close', leaveLobby);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Beat Battle listening on http://localhost:${PORT}`);
});
