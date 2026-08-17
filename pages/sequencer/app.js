import { AudioEngineAdapter } from './audio.js';
import { Sounds } from './sounds.js';
import { CUSTOM_TRACKS_STORAGE_KEY } from '../sound-samples/sample-sounds.js';

function loadCustomTrackDefs() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function buildCheckboxTrack(trackEl, steps, prevChecked) {
  while (trackEl.children.length > 1) trackEl.removeChild(trackEl.lastChild);

  const boxes = [];
  for (let i = 0; i < steps; i++) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!(prevChecked && prevChecked[i]);
    boxes.push(cb);
    trackEl.appendChild(cb);
  }
  return boxes;
}

document.addEventListener('DOMContentLoaded', () => {
  const initBtn = document.getElementById('init-btn');
  const toggleSeqBtn = document.getElementById('toggle-seq-btn');
  const bpmInput = document.getElementById('bpm-input');
  const clearBtn = document.getElementById('clear-btn');
  const stepCounter = document.getElementById('step-counter');
  const stepsInput = document.getElementById('steps-input');

  const tracksPanel = document.querySelector('.tracks-panel');
  const kickTrack = document.getElementById('kick-track');
  const snareTrack = document.getElementById('snare-track');
  const hihatTrack = document.getElementById('hihat-track');
  const pianoTrack = document.getElementById('piano-track');

  const audioAdapter = new AudioEngineAdapter();

  let kickBoxes = [];
  let snareBoxes = [];
  let hihatBoxes = [];
  let pianoNodes = [];
  let pianoSequence = [];

  let isPlaying = false;
  let activeStep = 0;
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

  function buildGrid(steps) {
    const prevKickChecked = kickBoxes.map(b => b.checked);
    const prevSnareChecked = snareBoxes.map(b => b.checked);
    const prevHihatChecked = hihatBoxes.map(b => b.checked);
    const prevCustomChecked = customTracks.map(t => t.boxes.map(b => b.checked));
    const prevPianoSequence = pianoSequence.slice();

    kickBoxes = buildCheckboxTrack(kickTrack, steps, prevKickChecked);
    snareBoxes = buildCheckboxTrack(snareTrack, steps, prevSnareChecked);
    hihatBoxes = buildCheckboxTrack(hihatTrack, steps, prevHihatChecked);

    customTracks.forEach((t, idx) => {
      t.boxes = buildCheckboxTrack(t.trackEl, steps, prevCustomChecked[idx]);
    });

    while (pianoTrack.children.length > 1) pianoTrack.removeChild(pianoTrack.lastChild);

    pianoNodes = [];
    pianoSequence = Array(steps).fill(null);

    for (let i = 0; i < steps; i++) {
      const pNode = document.createElement('div');
      pNode.className = 'piano-node';
      pNode.addEventListener('click', () => {
        pianoSequence[i] = null;
        pNode.innerText = '';
        pNode.classList.remove('has-note');
      });

      const prevNote = prevPianoSequence[i];
      if (prevNote) {
        pianoSequence[i] = prevNote;
        pNode.innerText = prevNote;
        pNode.classList.add('has-note');
      }

      pianoNodes.push(pNode);
      pianoTrack.appendChild(pNode);
    }

    stepCounter.innerText = `Step: -- / ${steps}`;
  }

  buildGrid(stepCount);

  initBtn.addEventListener('click', async () => {
    await audioAdapter.initialize();
    initBtn.disabled = true;
    toggleSeqBtn.disabled = false;
    bpmInput.disabled = false;
    stepsInput.disabled = false;
    clearBtn.disabled = false;
  });

  bpmInput.addEventListener('change', (e) => {
    let newBPM = parseInt(e.target.value, 10);
    if (newBPM < 1) newBPM = 1;
    if (newBPM > 300) newBPM = 300;

    e.target.value = newBPM;
    audioAdapter.setBPM(newBPM);
  });

  stepsInput.addEventListener('change', (e) => {
    let newSteps = parseInt(e.target.value, 10);
    if (newSteps < 1) newSteps = 1;
    if (newSteps > 64) newSteps = 64;

    e.target.value = newSteps;
    stepCount = newSteps;

    if (isPlaying) {
      audioAdapter.stopSequencer();
      toggleSeqBtn.innerText = "Play Sequencer";
      isPlaying = false;
    }

    buildGrid(stepCount);
  });

  clearBtn.addEventListener('click', () => {
    const allBoxes = [...kickBoxes, ...snareBoxes, ...hihatBoxes, ...customTracks.flatMap(t => t.boxes)];
    allBoxes.forEach(box => {
      box.checked = false;
    });

    pianoSequence.fill(null);
    pianoNodes.forEach(node => {
      node.innerText = '';
      node.classList.remove('has-note');
    });
  });

  toggleSeqBtn.addEventListener('click', () => {
    if (isPlaying) {
      audioAdapter.stopSequencer();
      toggleSeqBtn.innerText = "Play Sequencer";
      isPlaying = false;
      stepsInput.disabled = false;
      stepCounter.innerText = `Step: -- / ${stepCount}`;

      [...kickBoxes, ...snareBoxes, ...hihatBoxes, ...pianoNodes, ...customTracks.flatMap(t => t.boxes)].forEach(box => box.classList.remove('playing'));
    } else {
      toggleSeqBtn.innerText = "Stop Sequencer";
      isPlaying = true;
      stepsInput.disabled = true;

      audioAdapter.startSequencer((time, currentStep) => {
        activeStep = currentStep;

        if (kickBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Kick, time);
        if (snareBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Snare, time);
        if (hihatBoxes[currentStep].checked) audioAdapter.playSound(Sounds.HiHat, time);

        customTracks.forEach(t => {
          if (t.boxes[currentStep].checked) audioAdapter.playSample(t.def, time);
        });

        const recordedNote = pianoSequence[currentStep];
        if (recordedNote !== null) {
          audioAdapter.playSynthNote(recordedNote, time);
        }

        audioAdapter.scheduleUIUpdate(time, () => {
          stepCounter.innerText = `Step: ${(currentStep + 1).toString().padStart(2, '0')} / ${stepCount}`;

          [...kickBoxes, ...snareBoxes, ...hihatBoxes, ...pianoNodes, ...customTracks.flatMap(t => t.boxes)].forEach(box => box.classList.remove('playing'));

          kickBoxes[currentStep].classList.add('playing');
          snareBoxes[currentStep].classList.add('playing');
          hihatBoxes[currentStep].classList.add('playing');
          pianoNodes[currentStep].classList.add('playing');
          customTracks.forEach(t => t.boxes[currentStep].classList.add('playing'));
        });
      }, stepCount);
    }
  });

  const pianoKeys = document.querySelectorAll('.key');

  pianoKeys.forEach(key => {
    key.addEventListener('mousedown', (e) => {
      const noteToPlay = e.target.getAttribute('data-note');

      if (noteToPlay) {
        audioAdapter.playSynthNote(noteToPlay);

        if (isPlaying) {
          pianoSequence[activeStep] = noteToPlay;
          pianoNodes[activeStep].innerText = noteToPlay;
          pianoNodes[activeStep].classList.add('has-note');
        }
      }
    });
  });
});
