const test = require('node:test');
const assert = require('node:assert');
const {
  LobbyConnection,
  REVEAL_DURATION_MS,
  ROUND_DURATION_MS,
  ROUND_SUBMIT_GRACE_MS,
} = require('../server/lobby.js');

function fakeWs() {
  const messages = [];
  return {
    messages,
    readyState: 1,
    OPEN: 1,
    send(data) { messages.push(JSON.parse(data)); },
  };
}

function validSong() {
  return {
    version: 1,
    bpm: 120,
    steps: 16,
    drums: { kick: [0], snare: [], hihat: [] },
    pianoNotes: [],
    customTracks: [],
  };
}

function lastOfType(ws, type) {
  return [...ws.messages].reverse().find((msg) => msg.type === type);
}

function startTwoPlayerPlaying(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const lobbies = new Map();
  const hostWs = fakeWs();
  const guestWs = fakeWs();
  const host = new LobbyConnection(hostWs, { id: 'host-1', lobbies });
  const guest = new LobbyConnection(guestWs, { id: 'p2', lobbies });

  host.handleMessage(JSON.stringify({ type: 'create', nickname: 'Host' }));
  const code = host.lobbyCode;
  guest.handleMessage(JSON.stringify({ type: 'join', nickname: 'Guest', code }));
  host.handleMessage(JSON.stringify({ type: 'start' }));
  t.mock.timers.tick(REVEAL_DURATION_MS);

  return { lobby: lobbies.get(code), host, guest, hostWs, guestWs };
}

test('deadline auto-submits still count during the 0.5s server grace, then voting starts', (t) => {
  const { lobby, host, guest, hostWs, guestWs } = startTwoPlayerPlaying(t);

  t.mock.timers.tick(ROUND_DURATION_MS);
  assert.strictEqual(lobby.phase, 'playing');

  host.handleMessage(JSON.stringify({ type: 'submit-beat', beat: validSong() }));
  guest.handleMessage(JSON.stringify({
    type: 'submit-beat',
    beat: { ...validSong(), bpm: 90 },
  }));

  assert.strictEqual(lobby.phase, 'voting');
  assert.strictEqual(lobby.songs.size, 2);
  assert.strictEqual(lastOfType(hostWs, 'voting-started').type, 'voting-started');
  assert.strictEqual(lastOfType(guestWs, 'voting-started').type, 'voting-started');
  clearTimeout(lobby.voteTimer);
});

test('round timeout with no beats broadcasts results instead of hanging in playing', (t) => {
  const { lobby, hostWs, guestWs } = startTwoPlayerPlaying(t);

  t.mock.timers.tick(ROUND_DURATION_MS);
  assert.strictEqual(lobby.phase, 'playing');

  t.mock.timers.tick(ROUND_SUBMIT_GRACE_MS);
  assert.strictEqual(lobby.phase, 'results');
  assert.strictEqual(lastOfType(hostWs, 'results').type, 'results');
  assert.strictEqual(lastOfType(guestWs, 'results').type, 'results');
});
