const test = require('node:test');
const assert = require('node:assert');
const { LobbyConnection, MAX_PLAYERS_PER_LOBBY } = require('../server/lobby.js');

function fakeWs() {
  const messages = [];
  return {
    messages,
    readyState: 1,
    OPEN: 1,
    send(data) { messages.push(JSON.parse(data)); },
  };
}

function seedLobby(lobbies, code, hostWs) {
  const lobby = { hostId: 'host-1', players: new Map(), phase: 'lobby' };
  lobby.players.set('host-1', { nickname: 'Host', ws: hostWs });
  lobbies.set(code, lobby);
  return lobby;
}

test('join adds the player and broadcasts an update', () => {
  const lobbies = new Map();
  const hostWs = fakeWs();
  seedLobby(lobbies, 'ABCD', hostWs);

  const joinWs = fakeWs();
  const connection = new LobbyConnection(joinWs, { id: 'p2', lobbies });
  connection.handleMessage(JSON.stringify({ type: 'join', nickname: 'Guest', code: 'abcd' }));

  assert.strictEqual(connection.lobbyCode, 'ABCD');
  assert.ok(lobbies.get('ABCD').players.has('p2'));
  assert.strictEqual(joinWs.messages[0].type, 'joined');
  assert.strictEqual(joinWs.messages[0].selfId, 'p2');
  assert.strictEqual(joinWs.messages[0].hostId, 'host-1');
  assert.deepStrictEqual(joinWs.messages[0].players, [
    { id: 'host-1', nickname: 'Host' },
    { id: 'p2', nickname: 'Guest' },
  ]);
  assert.strictEqual(joinWs.messages[1].type, 'update');
  assert.strictEqual(hostWs.messages[0].type, 'update');
  assert.strictEqual(hostWs.messages[0].players.length, 2);
});

test('join rejects an unknown lobby code', () => {
  const lobbies = new Map();
  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'p2', lobbies });

  connection.handleMessage(JSON.stringify({ type: 'join', nickname: 'Guest', code: 'ZZZZ' }));

  assert.deepStrictEqual(ws.messages, [{ type: 'error', message: 'Lobby not found.' }]);
  assert.strictEqual(connection.lobbyCode, null);
});

test('join rejects a full lobby', () => {
  const lobbies = new Map();
  const hostWs = fakeWs();
  const lobby = seedLobby(lobbies, 'FULL', hostWs);
  for (let i = 2; i <= MAX_PLAYERS_PER_LOBBY; i += 1) {
    lobby.players.set(`p${i}`, { nickname: `P${i}`, ws: fakeWs() });
  }

  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'late', lobbies });
  connection.handleMessage(JSON.stringify({ type: 'join', nickname: 'Late', code: 'FULL' }));

  assert.deepStrictEqual(ws.messages, [{ type: 'error', message: 'Lobby is full.' }]);
  assert.strictEqual(lobby.players.has('late'), false);
});

test('join rejects a missing nickname or code', () => {
  const lobbies = new Map();
  seedLobby(lobbies, 'ABCD', fakeWs());
  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'p2', lobbies });

  connection.handleMessage(JSON.stringify({ type: 'join', nickname: '', code: 'ABCD' }));
  connection.handleMessage(JSON.stringify({ type: 'join', nickname: 'Guest', code: '' }));

  assert.deepStrictEqual(ws.messages, [
    { type: 'error', message: 'Nickname required.' },
    { type: 'error', message: 'Lobby code required.' },
  ]);
});
