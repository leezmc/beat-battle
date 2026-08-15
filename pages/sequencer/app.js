import { AudioEngineAdapter } from './audio.js';
import { Sounds } from './sounds.js';

const PIANO_NOTES = [
  'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4',
  'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4',
];

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
  const pianoRoll = document.getElementById('piano-roll');

  const audioAdapter = new AudioEngineAdapter();

  let kickBoxes = [];
  let snareBoxes = [];
  let hihatBoxes = [];
  let pianoTiles = [];
  let pianoNotes = [];
  let isPlaying = false;
  let stepCount = parseInt(stepsInput.value, 10);

  function buildDrumTrack(track, previousValues) {
    while (track.children.length > 1) track.removeChild(track.lastChild);

    return Array.from({ length: stepCount }, (_, step) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(previousValues[step]);
      track.appendChild(checkbox);
      return checkbox;
    });
  }

  function buildPianoRoll(previousNotes) {
    pianoRoll.innerHTML = '';
    pianoTiles = [];
    pianoNotes = PIANO_NOTES.map((note, noteIndex) => {
      const row = document.createElement('div');
      row.className = 'piano-roll-row';

      const label = document.createElement('span');
      label.className = 'piano-note-label';
      label.textContent = note;
      row.appendChild(label);

      const noteSteps = Array.from(
        { length: stepCount },
        (_, step) => Boolean(previousNotes[noteIndex] && previousNotes[noteIndex][step])
      );
      const tiles = [];

      noteSteps.forEach((hasNote, step) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'piano-tile';
        tile.classList.toggle('has-note', hasNote);
        tile.addEventListener('click', () => {
          noteSteps[step] = !noteSteps[step];
          tile.classList.toggle('has-note', noteSteps[step]);
        });
        row.appendChild(tile);
        tiles.push(tile);
      });

      pianoRoll.appendChild(row);
      pianoTiles.push(tiles);
      return noteSteps;
    });
  }

  function buildGrid() {
    const previousDrums = {
      kick: kickBoxes.map((box) => box.checked),
      snare: snareBoxes.map((box) => box.checked),
      hihat: hihatBoxes.map((box) => box.checked),
    };
    const previousPianoNotes = pianoNotes;

    kickBoxes = buildDrumTrack(kickTrack, previousDrums.kick);
    snareBoxes = buildDrumTrack(snareTrack, previousDrums.snare);
    hihatBoxes = buildDrumTrack(hihatTrack, previousDrums.hihat);
    buildPianoRoll(previousPianoNotes);
    stepCounter.textContent = `Step: -- / ${stepCount}`;
  }

  function clearPlayingStep() {
    [...kickBoxes, ...snareBoxes, ...hihatBoxes].forEach((box) => {
      box.classList.remove('playing');
    });
    pianoTiles.flat().forEach((tile) => tile.classList.remove('playing'));
  }

  buildGrid();

  initBtn.addEventListener('click', async () => {
    await audioAdapter.initialize();
    initBtn.disabled = true;
    toggleSeqBtn.disabled = false;
    bpmInput.disabled = false;
    stepsInput.disabled = false;
    clearBtn.disabled = false;
  });

  bpmInput.addEventListener('change', (event) => {
    let newBPM = parseInt(event.target.value, 10);
    if (newBPM < 1) newBPM = 1;
    if (newBPM > 300) newBPM = 300;

    event.target.value = newBPM;
    audioAdapter.setBPM(newBPM);
  });

  stepsInput.addEventListener('change', (event) => {
    let newSteps = parseInt(event.target.value, 10);
    if (newSteps < 1) newSteps = 1;
    if (newSteps > 64) newSteps = 64;

    event.target.value = newSteps;
    stepCount = newSteps;

    if (isPlaying) {
      audioAdapter.stopSequencer();
      toggleSeqBtn.textContent = 'Play Sequencer';
      isPlaying = false;
    }

    buildGrid();
  });

  clearBtn.addEventListener('click', () => {
    [...kickBoxes, ...snareBoxes, ...hihatBoxes].forEach((box) => {
      box.checked = false;
    });

    pianoNotes.forEach((noteSteps, noteIndex) => {
      noteSteps.fill(false);
      pianoTiles[noteIndex].forEach((tile) => tile.classList.remove('has-note'));
    });
  });

  toggleSeqBtn.addEventListener('click', () => {
    if (isPlaying) {
      audioAdapter.stopSequencer();
      toggleSeqBtn.textContent = 'Play Sequencer';
      isPlaying = false;
      stepsInput.disabled = false;
      stepCounter.textContent = `Step: -- / ${stepCount}`;
      clearPlayingStep();
      return;
    }

    toggleSeqBtn.textContent = 'Stop Sequencer';
    isPlaying = true;
    stepsInput.disabled = true;

    audioAdapter.startSequencer((time, currentStep) => {
      if (kickBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Kick, time);
      if (snareBoxes[currentStep].checked) audioAdapter.playSound(Sounds.Snare, time);
      if (hihatBoxes[currentStep].checked) audioAdapter.playSound(Sounds.HiHat, time);

      const chord = PIANO_NOTES.filter((note, noteIndex) => pianoNotes[noteIndex][currentStep]);
      if (chord.length > 0) audioAdapter.playSynthNotes(chord, time);

      audioAdapter.scheduleUIUpdate(time, () => {
        stepCounter.textContent = `Step: ${(currentStep + 1).toString().padStart(2, '0')} / ${stepCount}`;
        clearPlayingStep();
        kickBoxes[currentStep].classList.add('playing');
        snareBoxes[currentStep].classList.add('playing');
        hihatBoxes[currentStep].classList.add('playing');
        pianoTiles.forEach((tiles) => tiles[currentStep].classList.add('playing'));
      });
    }, stepCount);
  });
});
