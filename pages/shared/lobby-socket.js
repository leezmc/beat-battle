export function getSessionParamsFromURL() {
  const params = new URLSearchParams(location.search);
  return {
    code: params.get('code') || '',
    id: params.get('id') || '',
    nickname: params.get('nickname') || '',
  };
}

export function buildSessionURL(path, { code, id, nickname }) {
  const params = new URLSearchParams({ code, id, nickname });
  return `${path}?${params.toString()}`;
}

export function connectLobbySocket({ code, id, nickname }, onMessage) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/ws`);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'rejoin', code, id, nickname }));
  });

  socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    onMessage(msg, socket);
  });

  return socket;
}
