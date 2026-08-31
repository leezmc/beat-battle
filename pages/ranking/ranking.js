import { connectLobbySocket, getSessionParamsFromURL, loadCachedResults } from '../shared/lobby-socket.js';
import { AudioEngineAdapter } from '../sequencer/audio.js';
import { Sounds } from '../sequencer/sounds.js';

const session = getSessionParamsFromURL();
if (!session.code || !session.id) {
  location.href = '../landing/landing.html';
}

const listEl = document.getElementById('results-list');
const Tone = window.Tone;

function beatFileName(nickname) {
  return (nickname || 'beat')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'beat';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function encodeMp3(audioBuffer) {
  return new Promise((resolve, reject) => {
    try {
      window.audioEncoder(audioBuffer, 128, null, resolve);
    } catch (err) {
      reject(err);
    }
  });
}

function stepSeconds(bpm) {
  return 60 / (Math.max(1, Number(bpm) || 120)) / 4;
}

function scheduleBeat(adapter, beat) {
  const kickSet = new Set(beat.drums?.kick || []);
  const snareSet = new Set(beat.drums?.snare || []);
  const hihatSet = new Set(beat.drums?.hihat || []);
  const notesByStep = new Map();
  (beat.pianoNotes || []).forEach((note) => {
    if (!notesByStep.has(note.step)) notesByStep.set(note.step, []);
    notesByStep.get(note.step).push(note);
  });
  const customTracks = (beat.customTracks || []).map((track) => ({
    def: track,
    steps: new Set(track.steps),
  }));

  const stepSec = stepSeconds(beat.bpm);
  for (let step = 0; step < beat.steps; step++) {
    const time = step * stepSec;
    if (kickSet.has(step)) adapter.playSound(Sounds.Kick, time);
    if (snareSet.has(step)) adapter.playSound(Sounds.Snare, time);
    if (hihatSet.has(step)) adapter.playSound(Sounds.HiHat, time);
    customTracks.forEach(({ def, steps }) => {
      if (steps.has(step)) adapter.playSample(def, time);
    });
    (notesByStep.get(step) || []).forEach((note) => {
      adapter.playSynthNote(note.note, note.duration, time, stepSec);
    });
  }
}

async function renderBeatMp3(beat) {
  const bpm = beat.bpm || 120;
  const duration = beat.steps * stepSeconds(bpm) + 3;
  const rendered = await Tone.Offline(async (offlineContext) => {
    offlineContext.transport.bpm.value = bpm;
    const adapter = new AudioEngineAdapter();
    adapter.setBPM(bpm);
    await adapter.initialize();
    offlineContext.transport.bpm.value = bpm;
    adapter.setBPM(bpm);
    adapter.applyTrackMix(beat.trackMix || {});
    adapter.applyMasterMix(beat.masterMix || {});
    scheduleBeat(adapter, beat);
  }, duration, 2, 44100);
  const audioBuffer = typeof rendered.get === 'function' ? rendered.get() : rendered;
  return encodeMp3(audioBuffer);
}

async function downloadBeat(result, button) {
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = 'Rendering…';
  try {
    const blob = await renderBeatMp3(result.beat);
    triggerDownload(blob, `${beatFileName(result.nickname)}.mp3`);
  } catch (err) {
    console.error(err);
    button.textContent = 'Download failed';
    await new Promise((resolve) => setTimeout(resolve, 1500));
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
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
      downloadButton.textContent = 'Download MP3';
      downloadButton.addEventListener('click', () => downloadBeat(result, downloadButton));
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
