const test = require('node:test');
const assert = require('node:assert');
const { LobbyConnection } = require('../server/lobby.js');
const { SongRegistry } = require('../server/song.js');

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
    drums: { kick: [0], snare: [4], hihat: [] },
    pianoNotes: [],
    customTracks: [],
  };
}

function makePlayingLobby(hostWs, hostId = 'host-1') {
  return {
    hostId,
    players: new Map([[hostId, { nickname: 'Host', ws: hostWs }]]),
    phase: 'playing',
    theme: 'Techno',
    songs: new SongRegistry(),
    roundEndsAt: Date.now() + 60_000,
    roundTimer: null,
    voteQueue: [],
    voteIndex: 0,
    votes: new Map(),
    voteEndsAt: null,
    voteTimer: null,
    results: null,
    revealEndsAt: null,
    revealTimer: null,
  };
}

test('submit-beat stores a validated song during playing', () => {
  const lobbies = new Map();
  const hostWs = fakeWs();
  const guestWs = fakeWs();
  const lobby = makePlayingLobby(hostWs);
  lobby.players.set('p2', { nickname: 'Guest', ws: guestWs });
  lobbies.set('ABCD', lobby);

  const host = new LobbyConnection(hostWs, { id: 'host-1', lobbies });
  const guest = new LobbyConnection(guestWs, { id: 'p2', lobbies });
  host.lobbyCode = 'ABCD';
  guest.lobbyCode = 'ABCD';

  host.handleMessage(JSON.stringify({ type: 'submit-beat', beat: validSong() }));
  guest.handleMessage(JSON.stringify({
    type: 'submit-beat',
    beat: { ...validSong(), bpm: 90, drums: { kick: [], snare: [8], hihat: [] } },
  }));

  assert.strictEqual(lobby.songs.size, 2);
  assert.strictEqual(lobby.songs.getSong('host-1').bpm, 120);
  assert.strictEqual(lobby.songs.getSong('p2').bpm, 90);
  clearTimeout(lobby.voteTimer);
  clearTimeout(lobby.roundTimer);
});

test('submit-beat rejects invalid songs and ignores senders outside a lobby', () => {
  const lobbies = new Map();
  const insideWs = fakeWs();
  const outsideWs = fakeWs();
  const lobby = makePlayingLobby(insideWs);
  lobbies.set('ABCD', lobby);

  const inside = new LobbyConnection(insideWs, { id: 'host-1', lobbies });
  inside.lobbyCode = 'ABCD';
  inside.handleMessage(JSON.stringify({ type: 'submit-beat', beat: { version: 1 } }));

  const outside = new LobbyConnection(outsideWs, { id: 'p2', lobbies });
  outside.handleMessage(JSON.stringify({ type: 'submit-beat', beat: validSong() }));

  assert.deepStrictEqual(insideWs.messages[0], { type: 'error', message: 'Invalid BPM.' });
  assert.strictEqual(outsideWs.messages.length, 0);
  assert.strictEqual(lobby.songs.size, 0);
});

test('resubmitting a beat overwrites the previous song', () => {
  const registry = new SongRegistry();
  const first = registry.submit('p1', validSong());
  const second = registry.submit('p1', { ...validSong(), bpm: 140 });

  assert.strictEqual(first.ok, true);
  assert.strictEqual(second.ok, true);
  assert.strictEqual(registry.size, 1);
  assert.strictEqual(registry.getSong('p1').bpm, 140);
});
