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

wss.on('connection', (ws) => {
  const connection = new LobbyConnection(ws);
  ws.on('message', (raw) => connection.handleMessage(raw));
  ws.on('close', () => connection.leaveLobby());
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Beat Battle listening on http://${HOST}:${PORT}`);
});
