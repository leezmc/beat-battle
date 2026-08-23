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

test('submit-song stores a validated song and request-songs hides player ids', () => {
  const lobbies = new Map();
  const hostWs = fakeWs();
  const guestWs = fakeWs();
  const lobby = { hostId: 'host-1', players: new Map(), songs: new SongRegistry() };
  lobby.players.set('host-1', { nickname: 'Host', ws: hostWs });
  lobby.players.set('p2', { nickname: 'Guest', ws: guestWs });
  lobbies.set('ABCD', lobby);

  const host = new LobbyConnection(hostWs, { id: 'host-1', lobbies });
  const guest = new LobbyConnection(guestWs, { id: 'p2', lobbies });
  host.lobbyCode = 'ABCD';
  guest.lobbyCode = 'ABCD';

  host.handleMessage(JSON.stringify({ type: 'submit-song', song: validSong() }));
  guest.handleMessage(JSON.stringify({
    type: 'submit-song',
    song: { ...validSong(), bpm: 90, drums: { kick: [], snare: [8], hihat: [] } },
  }));
  guest.handleMessage(JSON.stringify({ type: 'request-songs' }));

  assert.strictEqual(hostWs.messages[0].type, 'song-accepted');
  assert.ok(hostWs.messages[0].entryId);
  assert.strictEqual(guestWs.messages[0].type, 'song-accepted');
  assert.notStrictEqual(guestWs.messages[0].entryId, hostWs.messages[0].entryId);

  const listing = guestWs.messages[1];
  assert.strictEqual(listing.type, 'songs');
  assert.strictEqual(listing.songs.length, 2);
  assert.ok(listing.songs.every((entry) => entry.entryId && entry.song && !entry.playerId && !entry.id));
  assert.deepStrictEqual(new Set(listing.songs.map((entry) => entry.song.bpm)), new Set([120, 90]));
});

test('submit-song rejects invalid songs and ignores senders outside a lobby', () => {
  const lobbies = new Map();
  const insideWs = fakeWs();
  const outsideWs = fakeWs();
  const lobby = { hostId: 'host-1', players: new Map(), songs: new SongRegistry() };
  lobby.players.set('host-1', { nickname: 'Host', ws: insideWs });
  lobbies.set('ABCD', lobby);

  const inside = new LobbyConnection(insideWs, { id: 'host-1', lobbies });
  inside.lobbyCode = 'ABCD';
  inside.handleMessage(JSON.stringify({ type: 'submit-song', song: { version: 1 } }));

  const outside = new LobbyConnection(outsideWs, { id: 'p2', lobbies });
  outside.handleMessage(JSON.stringify({ type: 'submit-song', song: validSong() }));

  assert.deepStrictEqual(insideWs.messages[0], { type: 'error', message: 'Invalid BPM.' });
  assert.deepStrictEqual(outsideWs.messages[0], { type: 'error', message: 'Not in a lobby.' });
  assert.strictEqual(lobby.songs.byPlayer.size, 0);
});

test('resubmitting a song keeps the same anonymous entry id', () => {
  const registry = new SongRegistry();
  const first = registry.submit('p1', validSong());
  const second = registry.submit('p1', { ...validSong(), bpm: 140 });

  assert.strictEqual(first.ok, true);
  assert.strictEqual(second.ok, true);
  assert.strictEqual(second.entryId, first.entryId);
  assert.strictEqual(registry.listAnonymous()[0].song.bpm, 140);
});
