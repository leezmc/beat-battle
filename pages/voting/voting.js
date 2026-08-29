import { AudioEngineAdapter } from '../sequencer/audio.js';
import { Sounds } from '../sequencer/sounds.js';
import { connectLobbySocket, getSessionParamsFromURL, buildSessionURL, cacheResults } from '../shared/lobby-socket.js';
import { autoInitAudio } from '../shared/audio-unlock.js';

const session = getSessionParamsFromURL();
if (!session.code || !session.id) {
  location.href = '../landing/landing.html';
}

const timerEl = document.getElementById('beatTimer');
const titleEl = document.getElementById('current-beat-title');
const playerStatusEl = document.getElementById('beatPlayer');
const starButtons = document.querySelectorAll('.star-button');

const audioAdapter = new AudioEngineAdapter();
let socket = null;
let countdownHandle = null;
let hasVotedThisBeat = false;
let totalBeats = 0;

function playBeat(beatDraft) {
  audioAdapter.stopSequencer();
  if (!beatDraft) return;
  audioAdapter.setBPM(beatDraft.bpm);

  const kickSet = new Set(beatDraft.drums.kick);
  const snareSet = new Set(beatDraft.drums.snare);
  const hihatSet = new Set(beatDraft.drums.hihat);

  const notesByStep = new Map();
  (beatDraft.pianoNotes || []).forEach((note) => {
    if (!notesByStep.has(note.step)) notesByStep.set(note.step, []);
    notesByStep.get(note.step).push(note);
  });

  const customTracks = (beatDraft.customTracks || []).map((track) => ({
    def: track,
    steps: new Set(track.steps),
  }));

  audioAdapter.startSequencer((time, step) => {
    if (kickSet.has(step)) audioAdapter.playSound(Sounds.Kick, time);
    if (snareSet.has(step)) audioAdapter.playSound(Sounds.Snare, time);
    if (hihatSet.has(step)) audioAdapter.playSound(Sounds.HiHat, time);
    customTracks.forEach(({ def, steps }) => {
      if (steps.has(step)) audioAdapter.playSample(def, time);
    });
    (notesByStep.get(step) || []).forEach((note) => {
      audioAdapter.playSynthNote(note.note, note.duration, time);
    });
  }, beatDraft.steps);
}

function formatSeconds(ms) {
  const secs = Math.ceil(Math.max(0, ms) / 1000);
  return `00:${String(secs).padStart(2, '0')}`;
}

function startCountdown(endsAt) {
  clearInterval(countdownHandle);
  countdownHandle = setInterval(() => {
    const remainingMs = endsAt - Date.now();
    timerEl.textContent = formatSeconds(remainingMs);
    if (remainingMs <= 0) clearInterval(countdownHandle);
  }, 250);
}

function showBeat({ currentBeat, currentBeatOwnerId, currentBeatOwnerNickname, voteEndsAt, voteIndex }) {
  hasVotedThisBeat = false;
  titleEl.textContent = `${currentBeatOwnerNickname}'s Beat (${voteIndex + 1}/${totalBeats})`;

  const isOwnBeat = currentBeatOwnerId === session.id;
  starButtons.forEach((button) => {
    button.classList.remove('selected');
    button.disabled = isOwnBeat;
  });
  playerStatusEl.textContent = isOwnBeat ? 'This is your beat — sit back and listen!' : 'Now playing…';

  playBeat(currentBeat);
  startCountdown(voteEndsAt);
}

function goToResults(results) {
  audioAdapter.stopSequencer();
  clearInterval(countdownHandle);
  if (results) cacheResults(session.code, results);
  location.href = buildSessionURL('../ranking/ranking.html', session);
}

autoInitAudio(audioAdapter);

socket = connectLobbySocket(session, (msg) => {
  if (msg.type === 'rejoined') {
    if (msg.phase === 'voting') {
      totalBeats = msg.voteQueue.length;
      showBeat(msg);
    } else if (msg.phase === 'results') {
      goToResults(msg.results);
    }
  } else if (msg.type === 'voting-started') {
    totalBeats = msg.voteQueue.length;
    showBeat(msg);
  } else if (msg.type === 'next-beat') {
    showBeat(msg);
  } else if (msg.type === 'results') {
    goToResults(msg.results);
  } else if (msg.type === 'error') {
    playerStatusEl.textContent = msg.message;
  }
});

starButtons.forEach((starButton) => {
  starButton.addEventListener('click', () => {
    if (hasVotedThisBeat || starButton.disabled) return;
    const selectedRating = Number(starButton.dataset.rating);

    starButtons.forEach((button) => {
      const buttonRating = Number(button.dataset.rating);
      button.classList.toggle('selected', buttonRating <= selectedRating);
    });

    hasVotedThisBeat = true;
    playerStatusEl.textContent = 'Vote submitted — waiting…';
    socket.send(JSON.stringify({ type: 'submit-vote', rating: selectedRating }));
  });
});
