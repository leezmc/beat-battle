import { AudioEngineAdapter } from './audio.js';
import { Sounds } from './sounds.js';

document.addEventListener('DOMContentLoaded', () => {
  const initBtn = document.getElementById('init-btn');
  const toggleSeqBtn = document.getElementById('toggle-seq-btn');
  const bpmInput = document.getElementById('bpm-input');
  const clearBtn = document.getElementById('clear-btn');
  const stepCounter = document.getElementById('step-counter');
  const stepsInput = document.getElementById('steps-input');
  
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

  function buildGrid(steps) {
    const prevChecked = {
      kick: kickBoxes.map(b => b.checked),
      snare: snareBoxes.map(b => b.checked),
      hihat: hihatBoxes.map(b => b.checked),
    };
    const prevPianoSequence = pianoSequence.slice();

    [kickTrack, snareTrack, hihatTrack, pianoTrack].forEach(track => {
      while (track.children.length > 1) track.removeChild(track.lastChild);
    });

    kickBoxes = [];
    snareBoxes = [];
    hihatBoxes = [];
    pianoNodes = [];
    pianoSequence = Array(steps).fill(null);

    for (let i = 0; i < steps; i++) {
      const kCb = document.createElement('input');
      kCb.type = 'checkbox';
      kCb.checked = !!prevChecked.kick[i];
      kickBoxes.push(kCb);
      kickTrack.appendChild(kCb);

      const sCb = document.createElement('input');
      sCb.type = 'checkbox';
      sCb.checked = !!prevChecked.snare[i];
      snareBoxes.push(sCb);
      snareTrack.appendChild(sCb);

      const hCb = document.createElement('input');
      hCb.type = 'checkbox';
      hCb.checked = !!prevChecked.hihat[i];
      hihatBoxes.push(hCb);
      hihatTrack.appendChild(hCb);

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
    const allBoxes = [...kickBoxes, ...snareBoxes, ...hihatBoxes];
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

      [...kickBoxes, ...snareBoxes, ...hihatBoxes, ...pianoNodes].forEach(box => box.classList.remove('playing'));
    } else {
      toggleSeqBtn.innerText = "Stop Sequencer";
      isPlaying = true;
      stepsInput.disabled = true;

      audioAdapter.startSequencer((time, currentStep) => {
        activeStep = currentStep;

        if (kickBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Kick, time);
        if (snareBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Snare, time);
        if (hihatBoxes[currentStep].checked) audioAdapter.playSound(Sounds.HiHat, time);

        const recordedNote = pianoSequence[currentStep];
        if (recordedNote !== null) {
          audioAdapter.playSynthNote(recordedNote, time);
        }

        audioAdapter.scheduleUIUpdate(time, () => {
          stepCounter.innerText = `Step: ${(currentStep + 1).toString().padStart(2, '0')} / ${stepCount}`;

          [...kickBoxes, ...snareBoxes, ...hihatBoxes, ...pianoNodes].forEach(box => box.classList.remove('playing'));

          kickBoxes[currentStep].classList.add('playing');
          snareBoxes[currentStep].classList.add('playing');
          hihatBoxes[currentStep].classList.add('playing');
          pianoNodes[currentStep].classList.add('playing');
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
