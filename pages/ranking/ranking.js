import { connectLobbySocket, getSessionParamsFromURL, loadCachedResults } from '../shared/lobby-socket.js';

const session = getSessionParamsFromURL();
if (!session.code || !session.id) {
  location.href = '../landing/landing.html';
}

const listEl = document.getElementById('results-list');

function downloadBeat(result) {
  const safeName = result.nickname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'beat';
  const file = new Blob([JSON.stringify(result.beat, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}-beat.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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

    const details = document.createElement('div');
    details.className = 'result-details';
    details.appendChild(score);

    if (result.beat) {
      const downloadButton = document.createElement('button');
      downloadButton.className = 'result-download';
      downloadButton.type = 'button';
      downloadButton.textContent = 'Download Data';
      downloadButton.addEventListener('click', () => downloadBeat(result));
      details.appendChild(downloadButton);
    }

    li.appendChild(name);
    li.appendChild(details);
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
