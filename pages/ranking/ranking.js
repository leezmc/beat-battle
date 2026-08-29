import { connectLobbySocket, getSessionParamsFromURL, loadCachedResults } from '../shared/lobby-socket.js';

const session = getSessionParamsFromURL();
if (!session.code || !session.id) {
  location.href = '../landing/landing.html';
}

const listEl = document.getElementById('results-list');

function render(results) {
  listEl.innerHTML = '';
  results.forEach((result) => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.className = 'result-name';
    name.textContent = result.playerId === session.id ? `${result.nickname} (You)` : result.nickname;

    const score = document.createElement('span');
    score.className = 'result-score';
    score.textContent = result.voteCount > 0
      ? `${result.averageScore.toFixed(1)} ★ (${result.voteCount} vote${result.voteCount === 1 ? '' : 's'})`
      : 'No votes';

    li.appendChild(name);
    li.appendChild(score);
    listEl.appendChild(li);
  });
}

const cachedResults = loadCachedResults(session.code);
if (cachedResults) render(cachedResults);

connectLobbySocket(session, (msg) => {
  if ((msg.type === 'rejoined' && msg.phase === 'results') || msg.type === 'results') {
    render(msg.results);
  } else if (msg.type === 'error' && !cachedResults) {
    listEl.textContent = msg.message;
  }
});
