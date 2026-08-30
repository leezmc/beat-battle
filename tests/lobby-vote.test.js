const test = require('node:test');
const assert = require('node:assert');
const {
  LobbyConnection,
  REVEAL_DURATION_MS,
  ROUND_DURATION_MS,
  ROUND_SUBMIT_GRACE_MS,
  VOTE_DURATION_MS,
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

function validSong(overrides = {}) {
  return {
    version: 1,
    bpm: 120,
    steps: 16,
    drums: { kick: [0], snare: [], hihat: [] },
    pianoNotes: [],
    customTracks: [],
    ...overrides,
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

  host.handleMessage(JSON.stringify({ type: 'create', nickname: 'craft' }));
  const code = host.lobbyCode;
  guest.handleMessage(JSON.stringify({ type: 'join', nickname: 'wii', code }));
  host.handleMessage(JSON.stringify({ type: 'start' }));
  t.mock.timers.tick(REVEAL_DURATION_MS);

  return { lobby: lobbies.get(code), host, guest, hostWs, guestWs, code };
}

function submitBeat(player, beat) {
  player.handleMessage(JSON.stringify({ type: 'submit-beat', beat }));
}

function submitVote(player, rating) {
  player.handleMessage(JSON.stringify({ type: 'submit-vote', rating }));
}

function startTwoPlayerVoting(t) {
  const ctx = startTwoPlayerPlaying(t);
  submitBeat(ctx.host, validSong({ bpm: 88 }));
  submitBeat(ctx.guest, validSong({ bpm: 120 }));
  assert.strictEqual(ctx.lobby.phase, 'voting');
  assert.deepStrictEqual(ctx.lobby.voteQueue, ['host-1', 'p2']);
  return ctx;
}

test('one vote on the first of two beats does not skip the second beat', (t) => {
  const { lobby, guest, hostWs, guestWs } = startTwoPlayerVoting(t);

  submitVote(guest, 5);

  assert.strictEqual(lobby.phase, 'voting');
  assert.strictEqual(lobby.voteIndex, 1);
  assert.strictEqual(lastOfType(hostWs, 'next-beat').type, 'next-beat');
  assert.strictEqual(lastOfType(guestWs, 'next-beat').type, 'next-beat');
  assert.strictEqual(lastOfType(hostWs, 'next-beat').canVote, true);
  assert.strictEqual(lastOfType(guestWs, 'next-beat').canVote, false);
  assert.strictEqual(lastOfType(hostWs, 'results'), undefined);
  clearTimeout(lobby.voteTimer);
});

test('both beats must be rated before results, and each song keeps its own votes', (t) => {
  const { lobby, host, guest, hostWs, guestWs } = startTwoPlayerVoting(t);

  submitVote(guest, 5);
  assert.strictEqual(lobby.phase, 'voting');

  submitVote(host, 3);

  assert.strictEqual(lobby.phase, 'results');
  const results = lastOfType(hostWs, 'results').results;
  assert.ok(lastOfType(guestWs, 'results'));

  const craft = results.find((row) => row.playerId === 'host-1');
  const wii = results.find((row) => row.playerId === 'p2');
  assert.strictEqual(craft.averageScore, 5);
  assert.strictEqual(craft.voteCount, 1);
  assert.strictEqual(wii.averageScore, 3);
  assert.strictEqual(wii.voteCount, 1);
});

test('the owner cannot vote on their own beat', (t) => {
  const { lobby, host } = startTwoPlayerVoting(t);

  submitVote(host, 5);

  assert.strictEqual(lobby.phase, 'voting');
  assert.strictEqual(lobby.voteIndex, 0);
  assert.strictEqual(lobby.votes.get('host-1').size, 0);
  clearTimeout(lobby.voteTimer);
});

test('a two-player round with only one song does not end after the first vote', (t) => {
  const ctx = startTwoPlayerPlaying(t);
  submitBeat(ctx.host, validSong());
  t.mock.timers.tick(ROUND_DURATION_MS);
  t.mock.timers.tick(ROUND_SUBMIT_GRACE_MS);

  assert.strictEqual(ctx.lobby.phase, 'voting');
  assert.deepStrictEqual(ctx.lobby.voteQueue, ['host-1']);

  submitVote(ctx.guest, 5);

  assert.strictEqual(ctx.lobby.phase, 'voting');
  assert.strictEqual(ctx.lobby.voteIndex, 0);
  assert.strictEqual(lastOfType(ctx.hostWs, 'results'), undefined);
  clearTimeout(ctx.lobby.voteTimer);
});

test('a late beat submit during voting is queued instead of dropped', (t) => {
  const ctx = startTwoPlayerPlaying(t);
  submitBeat(ctx.host, validSong({ bpm: 88 }));
  t.mock.timers.tick(ROUND_DURATION_MS);
  t.mock.timers.tick(ROUND_SUBMIT_GRACE_MS);
  assert.strictEqual(ctx.lobby.phase, 'voting');
  assert.strictEqual(ctx.lobby.voteQueue.length, 1);

  submitVote(ctx.guest, 5);
  assert.strictEqual(ctx.lobby.phase, 'voting');

  submitBeat(ctx.guest, validSong({ bpm: 120 }));

  assert.strictEqual(ctx.lobby.phase, 'voting');
  assert.deepStrictEqual(ctx.lobby.voteQueue, ['host-1', 'p2']);
  assert.strictEqual(ctx.lobby.voteIndex, 1);
  assert.strictEqual(lastOfType(ctx.hostWs, 'next-beat').canVote, true);
  clearTimeout(ctx.lobby.voteTimer);
});

test('vote timer still finishes a one-song round if the other beat never arrives', (t) => {
  const ctx = startTwoPlayerPlaying(t);
  submitBeat(ctx.host, validSong());
  t.mock.timers.tick(ROUND_DURATION_MS);
  t.mock.timers.tick(ROUND_SUBMIT_GRACE_MS);

  submitVote(ctx.guest, 5);
  assert.strictEqual(ctx.lobby.phase, 'voting');

  t.mock.timers.tick(VOTE_DURATION_MS);
  assert.strictEqual(ctx.lobby.phase, 'results');
  const craft = lastOfType(ctx.hostWs, 'results').results.find((row) => row.playerId === 'host-1');
  assert.strictEqual(craft.voteCount, 1);
});
