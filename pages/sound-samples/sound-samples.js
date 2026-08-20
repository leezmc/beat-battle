import * as Tone from 'https://unpkg.com/tone?module';
import { SampleThemes, CUSTOM_TRACKS_STORAGE_KEY } from './sample-sounds.js';

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
  const initBtn = document.getElementById('init-btn');
  const themeSelect = document.getElementById('theme-select');
  const sampleGrid = document.getElementById('sample-grid');

  let audioReady = false;
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
    if (!audioReady) return;
    const instrument = getInstrument(sample);
    if (sample.note) {
      instrument.triggerAttackRelease(sample.note, sample.duration || '8n');
    } else {
      instrument.triggerAttackRelease(sample.duration || '8n');
    }
  }

  SampleThemes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.name;
    option.innerText = theme.name;
    themeSelect.appendChild(option);
  });

  function renderGrid() {
    const theme = SampleThemes.find(t => t.name === themeSelect.value) || SampleThemes[0];
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
      playBtn.disabled = !audioReady;
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

  initBtn.addEventListener('click', async () => {
    await Tone.start();
    audioReady = true;
    initBtn.disabled = true;
    initBtn.innerText = 'Audio Ready';
    renderGrid();
  });

  themeSelect.addEventListener('change', renderGrid);

  renderGrid();
});
