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

function seedOccupiedLobby(lobbies) {
  const hostWs = fakeWs();
  const guestWs = fakeWs();
  const lobby = { hostId: 'host-1', players: new Map(), phase: 'lobby' };
  lobby.players.set('host-1', { nickname: 'Host', ws: hostWs });
  lobby.players.set('p2', { nickname: 'Guest', ws: guestWs });
  lobbies.set('ABCD', lobby);
  return { lobby, hostWs, guestWs };
}

test('leave removes the player, notifies them, and updates the remaining lobby', () => {
  const lobbies = new Map();
  const { lobby, hostWs, guestWs } = seedOccupiedLobby(lobbies);
  const guest = new LobbyConnection(guestWs, { id: 'p2', lobbies });
  guest.lobbyCode = 'ABCD';

  guest.handleMessage(JSON.stringify({ type: 'leave' }));

  assert.strictEqual(guest.lobbyCode, null);
  assert.strictEqual(lobby.players.has('p2'), false);
  assert.strictEqual(lobby.hostId, 'host-1');
  assert.ok(lobbies.has('ABCD'));
  assert.deepStrictEqual(guestWs.messages.at(-1), { type: 'left' });
  assert.strictEqual(hostWs.messages[0].type, 'update');
  assert.deepStrictEqual(hostWs.messages[0].players, [{ id: 'host-1', nickname: 'Host' }]);
});

test('leave transfers host when the host exits and others remain', () => {
  const lobbies = new Map();
  const { lobby, hostWs } = seedOccupiedLobby(lobbies);
  const host = new LobbyConnection(hostWs, { id: 'host-1', lobbies });
  host.lobbyCode = 'ABCD';

  host.leaveLobby();

  assert.strictEqual(host.lobbyCode, null);
  assert.strictEqual(lobby.players.has('host-1'), false);
  assert.strictEqual(lobby.hostId, 'p2');
  assert.ok(lobbies.has('ABCD'));
});

test('leave deletes an empty lobby after the last player exits', () => {
  const lobbies = new Map();
  const ws = fakeWs();
  const lobby = { hostId: 'host-1', players: new Map(), phase: 'lobby' };
  lobby.players.set('host-1', { nickname: 'Host', ws });
  lobbies.set('ABCD', lobby);

  const host = new LobbyConnection(ws, { id: 'host-1', lobbies });
  host.lobbyCode = 'ABCD';
  host.leaveLobby();

  assert.strictEqual(host.lobbyCode, null);
  assert.strictEqual(lobbies.has('ABCD'), false);
});
