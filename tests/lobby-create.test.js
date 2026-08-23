const test = require('node:test');
const assert = require('node:assert');
const { LobbyConnection } = require('../server/lobby.js');

function fakeWs() {
  const messages = [];
  return {
    messages,
    readyState: 1,
    OPEN: 1,
    send(data) { messages.push(JSON.parse(data)); },
  };
}

test('create registers a lobby and replies with created state', () => {
  const lobbies = new Map();
  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'host-1', lobbies });

  connection.handleMessage(JSON.stringify({ type: 'create', nickname: '  DJ Steve  ' }));

  assert.strictEqual(ws.messages.length, 1);
  const reply = ws.messages[0];
  assert.strictEqual(reply.type, 'created');
  assert.strictEqual(reply.selfId, 'host-1');
  assert.strictEqual(reply.hostId, 'host-1');
  assert.strictEqual(reply.code, connection.lobbyCode);
  assert.strictEqual(reply.code.length, 4);
  assert.deepStrictEqual(reply.players, [{ id: 'host-1', nickname: 'DJ Steve' }]);

  const lobby = lobbies.get(reply.code);
  assert.ok(lobby);
  assert.strictEqual(lobby.hostId, 'host-1');
  assert.strictEqual(lobby.players.get('host-1').nickname, 'DJ Steve');
});

test('create rejects a missing nickname without opening a lobby', () => {
  const lobbies = new Map();
  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'host-1', lobbies });

  connection.handleMessage(JSON.stringify({ type: 'create', nickname: '   ' }));

  assert.deepStrictEqual(ws.messages, [{ type: 'error', message: 'Nickname required.' }]);
  assert.strictEqual(connection.lobbyCode, null);
  assert.strictEqual(lobbies.size, 0);
});

test('create rejects a second create while already in a lobby', () => {
  const lobbies = new Map();
  const ws = fakeWs();
  const connection = new LobbyConnection(ws, { id: 'host-1', lobbies });

  connection.handleMessage(JSON.stringify({ type: 'create', nickname: 'DJ' }));
  const firstCode = connection.lobbyCode;
  connection.handleMessage(JSON.stringify({ type: 'create', nickname: 'Other' }));

  assert.strictEqual(connection.lobbyCode, firstCode);
  assert.strictEqual(lobbies.size, 1);
  assert.deepStrictEqual(ws.messages[1], { type: 'error', message: 'Already in a lobby.' });
});
