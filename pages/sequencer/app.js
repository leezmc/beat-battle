import { AudioEngineAdapter } from './audio.js';
import { PianoRoll } from './piano-roll.js';
import { DrumGrid } from './drum-grid.js';
import { Sounds } from './sounds.js';
import { CUSTOM_TRACKS_STORAGE_KEY } from '../sound-samples/sample-sounds.js';
import { buildCheckboxTrack } from './checkbox-track.js';

function loadCustomTrackDefs() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function buildSectionRuler(rulerEl, sections) {
  while (rulerEl.children.length > 1) rulerEl.removeChild(rulerEl.lastChild);

  sections.forEach(section => {
    const block = document.createElement('div');
    block.className = 'section-block';
    block.textContent = section.name;
    block.title = section.name;
    block.style.width = `${section.steps * 28 + (section.steps - 1) * 5}px`;
    rulerEl.appendChild(block);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const initBtn = document.getElementById('init-btn');
  const toggleSeqBtn = document.getElementById('toggle-seq-btn');
  const bpmInput = document.getElementById('bpm-input');
  const clearBtn = document.getElementById('clear-btn');
  const stepCounter = document.getElementById('step-counter');
  const stepsInput = document.getElementById('steps-input');
  const sectionRuler = document.getElementById('section-ruler');

  const tracksPanel = document.querySelector('.tracks-panel');

  tracksPanel.addEventListener('wheel', (event) => {
    if (tracksPanel.scrollWidth <= tracksPanel.clientWidth) return;
    event.preventDefault();
    tracksPanel.scrollLeft += event.deltaY;
  }, { passive: false });

  const audioAdapter = new AudioEngineAdapter();
  const drumGrid = new DrumGrid();
  const pianoRoll = new PianoRoll('piano-roll-canvas');

  let isPlaying = false;
  let stepCount = parseInt(stepsInput.value, 10);

  const customTracks = loadCustomTrackDefs().map(def => {
    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    trackEl.id = `custom-track-${def.id}`;

    const label = document.createElement('span');
    label.innerText = def.label;
    label.title = def.label;
    trackEl.appendChild(label);

    tracksPanel.appendChild(trackEl);

    return { def, trackEl, boxes: [] };
  });

  function buildCustomTracks(steps) {
    const prevChecked = customTracks.map(t => t.boxes.map(b => b.checked));
    customTracks.forEach((t, idx) => {
      t.boxes = buildCheckboxTrack(t.trackEl, steps, prevChecked[idx]);
    });
  }

  function clearHighlights() {
    drumGrid.clearHighlights();
    pianoRoll.setPlayhead(-1);
    customTracks.forEach(t => t.boxes.forEach(b => b.classList.remove('playing')));
  }

  buildCustomTracks(stepCount);
  drumGrid.buildGrid(stepCount);
  pianoRoll.resizeSteps(stepCount);
  stepCounter.textContent = `Step: -- / ${stepCount}`;

  audioAdapter.setBPM(parseInt(bpmInput.value, 10));

  const STEPS_MAX = parseInt(stepsInput.max, 10);

  function stopPlayback() {
    audioAdapter.stopSequencer();
    isPlaying = false;
    toggleSeqBtn.textContent = 'Play Sequencer';
    stepsInput.disabled = false;
    stepCounter.textContent = `Step: -- / ${stepCount}`;
    clearHighlights();
  }

  initBtn.addEventListener('click', async () => {
    await audioAdapter.initialize();
    initBtn.disabled = true;
    toggleSeqBtn.disabled = false;
    bpmInput.disabled = false;
    stepsInput.disabled = false;
    clearBtn.disabled = false;
  });

  bpmInput.addEventListener('change', (event) => {
    let newBPM = Math.max(1, Math.min(300, parseInt(event.target.value, 10)));
    event.target.value = newBPM;
    audioAdapter.setBPM(newBPM);
  });

  stepsInput.addEventListener('change', (event) => {
    let newSteps = Math.max(1, Math.min(STEPS_MAX, parseInt(event.target.value, 10)));
    event.target.value = newSteps;
    stepCount = newSteps;

    if (isPlaying) stopPlayback();

    drumGrid.buildGrid(stepCount);
    pianoRoll.resizeSteps(stepCount);
    buildCustomTracks(stepCount);
    buildSectionRuler(sectionRuler, []);
    stepCounter.textContent = `Step: -- / ${stepCount}`;
  });

  clearBtn.addEventListener('click', () => {
    drumGrid.clear();
    pianoRoll.clear();
    customTracks.forEach(t => t.boxes.forEach(b => { b.checked = false; }));
  });

  toggleSeqBtn.addEventListener('click', () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    isPlaying = true;
    toggleSeqBtn.textContent = 'Stop Sequencer';
    stepsInput.disabled = true;

    audioAdapter.startSequencer((time, currentStep) => {
      const activeDrums = drumGrid.getActiveDrums(currentStep);
      const activeNotes = pianoRoll.getActiveNotes(currentStep);

      if (activeDrums.kick) audioAdapter.playSound(Sounds.Kick, time);
      if (activeDrums.snare) audioAdapter.playSound(Sounds.Snare, time);
      if (activeDrums.hihat) audioAdapter.playSound(Sounds.HiHat, time);

      customTracks.forEach(t => {
        if (t.boxes[currentStep].checked) audioAdapter.playSample(t.def, time);
      });

      activeNotes.forEach(noteData => {
        audioAdapter.playSynthNote(noteData.note, noteData.duration, time);
      });

      audioAdapter.scheduleUIUpdate(time, () => {
        drumGrid.highlightPlayingStep(currentStep);
        pianoRoll.setPlayhead(currentStep);
        customTracks.forEach(t => {
          t.boxes.forEach(b => b.classList.remove('playing'));
          t.boxes[currentStep].classList.add('playing');
        });
        stepCounter.textContent = `Step: ${(currentStep + 1).toString().padStart(2, '0')} / ${stepCount}`;
      });
    }, stepCount);
  });
});
