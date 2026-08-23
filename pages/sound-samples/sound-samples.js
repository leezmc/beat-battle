import * as Tone from 'https://unpkg.com/tone?module';
import { SoundSets, CUSTOM_TRACKS_STORAGE_KEY } from './sample-sounds.js';
import { connectLobbySocket, getSessionParamsFromURL, buildSessionURL } from '../shared/lobby-socket.js';
import { autoInitAudio } from '../shared/audio-unlock.js';

function getAddedTracks() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAddedTracks(tracks) {
  localStorage.setItem(CUSTOM_TRACKS_STORAGE_KEY, JSON.stringify(tracks));
}

document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('theme-select');
  const sampleGrid = document.getElementById('sample-grid');
  const revealTimerEl = document.getElementById('reveal-timer');
  const lobbyStatusEl = document.getElementById('lobby-status');
  const goToSequencerLink = document.getElementById('go-to-sequencer-link');

  autoInitAudio({ initialize: () => Tone.start() });

  const instruments = {};

  function getInstrument(sample) {
    let instrument = instruments[sample.id];
    if (!instrument) {
      const SynthClass = Tone[sample.synth];
      instrument = new SynthClass(sample.options || {}).toDestination();
      instruments[sample.id] = instrument;
    }
    return instrument;
  }

  function playSample(sample) {
    const instrument = getInstrument(sample);
    if (sample.note) {
      instrument.triggerAttackRelease(sample.note, sample.duration || '8n');
    } else {
      instrument.triggerAttackRelease(sample.duration || '8n');
    }
  }

  SoundSets.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.name;
    option.innerText = theme.name;
    themeSelect.appendChild(option);
  });

  function renderGrid() {
    const theme = SoundSets.find(t => t.name === themeSelect.value) || SoundSets[0];
    const addedIds = new Set(getAddedTracks().map(t => t.id));

    sampleGrid.innerHTML = '';

    theme.sounds.forEach(sample => {
      const card = document.createElement('div');
      card.className = 'sample-card';

      const info = document.createElement('div');
      info.className = 'sample-info';

      const label = document.createElement('span');
      label.className = 'sample-label';
      label.innerText = sample.label;
      label.title = sample.label;

      const themeTag = document.createElement('span');
      themeTag.className = 'sample-theme';
      themeTag.innerText = theme.name;

      info.appendChild(label);
      info.appendChild(themeTag);

      const actions = document.createElement('div');
      actions.className = 'sample-actions';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'play-btn';
      playBtn.innerText = 'Play';
      playBtn.addEventListener('click', () => playSample(sample));

      const isAdded = addedIds.has(sample.id);
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-btn' + (isAdded ? ' added' : '');
      addBtn.innerText = isAdded ? 'Added' : '+ Add to Sequencer';
      addBtn.addEventListener('click', () => {
        const tracks = getAddedTracks();
        const idx = tracks.findIndex(t => t.id === sample.id);
        if (idx === -1) {
          tracks.push({ ...sample, theme: theme.name });
        } else {
          tracks.splice(idx, 1);
        }
        saveAddedTracks(tracks);
        renderGrid();
      });

      actions.appendChild(playBtn);
      actions.appendChild(addBtn);

      card.appendChild(info);
      card.appendChild(actions);
      sampleGrid.appendChild(card);
    });
  }

  themeSelect.addEventListener('change', renderGrid);

  const session = getSessionParamsFromURL();
  const themeParam = new URLSearchParams(location.search).get('theme');

  if (session.code && session.id) {
    goToSequencerLink.hidden = true;
    revealTimerEl.hidden = false;
    lobbyStatusEl.hidden = false;
    lobbyStatusEl.textContent = `Lobby ${session.code}`;
    themeSelect.disabled = true;

    if (themeParam && SoundSets.some((set) => set.name === themeParam)) {
      themeSelect.value = themeParam;
    }

    let countdownHandle = null;

    function startCountdown(endsAt) {
      clearInterval(countdownHandle);
      countdownHandle = setInterval(() => {
        const remainingMs = endsAt - Date.now();
        const secs = Math.ceil(Math.max(0, remainingMs) / 1000);
        revealTimerEl.textContent = `00:${String(secs).padStart(2, '0')}`;
        if (remainingMs <= 0) clearInterval(countdownHandle);
      }, 250);
    }

    function applyTheme(theme) {
      if (theme && SoundSets.some((set) => set.name === theme)) {
        themeSelect.value = theme;
        renderGrid();
      }
    }

    function goToSequencer() {
      clearInterval(countdownHandle);
      location.href = buildSessionURL('../sequencer/sequencer.html', session);
    }

    connectLobbySocket(session, (msg) => {
      if (msg.type === 'rejoined') {
        applyTheme(msg.theme);
        if (msg.phase === 'reveal') {
          startCountdown(msg.revealEndsAt);
        } else if (msg.phase === 'playing' || msg.phase === 'voting' || msg.phase === 'results') {
          goToSequencer();
        }
      } else if (msg.type === 'reveal-started') {
        applyTheme(msg.theme);
        startCountdown(msg.revealEndsAt);
      } else if (msg.type === 'game-started') {
        goToSequencer();
      } else if (msg.type === 'error') {
        lobbyStatusEl.textContent = msg.message;
      }
    });
  }

  renderGrid();
});
