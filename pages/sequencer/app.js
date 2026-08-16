import { AudioEngineAdapter } from './audio.js';
import { PianoRoll } from './piano-roll.js';
import { DrumGrid } from './drum-grid.js';
import { Sounds } from './sounds.js';

document.addEventListener('DOMContentLoaded', () => {
  const initBtn = document.getElementById('init-btn');
  const toggleSeqBtn = document.getElementById('toggle-seq-btn');
  const bpmInput = document.getElementById('bpm-input');
  const clearBtn = document.getElementById('clear-btn');
  const stepCounter = document.getElementById('step-counter');
  const stepsInput = document.getElementById('steps-input');

  const audioAdapter = new AudioEngineAdapter();
  const drumGrid = new DrumGrid();
  const pianoRoll = new PianoRoll('piano-roll-canvas');

  let isPlaying = false;
  let stepCount = parseInt(stepsInput.value, 10);

  drumGrid.buildGrid(stepCount);
  pianoRoll.resizeSteps(stepCount);
  stepCounter.textContent = `Step: -- / ${stepCount}`;

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
    let newSteps = Math.max(1, Math.min(64, parseInt(event.target.value, 10)));
    event.target.value = newSteps;
    stepCount = newSteps;

    if (isPlaying) {
      audioAdapter.stopSequencer();
      toggleSeqBtn.textContent = 'Play Sequencer';
      isPlaying = false;
      drumGrid.clearHighlights();
      pianoRoll.setPlayhead(-1);
    }

    drumGrid.buildGrid(stepCount);
    pianoRoll.resizeSteps(stepCount);
    stepCounter.textContent = `Step: -- / ${stepCount}`;
  });

  clearBtn.addEventListener('click', () => {
    drumGrid.clear();
    pianoRoll.clear();
  });

  toggleSeqBtn.addEventListener('click', () => {
    if (isPlaying) {
      audioAdapter.stopSequencer();
      drumGrid.clearHighlights();
      pianoRoll.setPlayhead(-1);

      isPlaying = false;
      toggleSeqBtn.textContent = 'Play Sequencer';
      stepsInput.disabled = false;
      stepCounter.textContent = `Step: -- / ${stepCount}`;
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

      activeNotes.forEach(noteData => {
        audioAdapter.playSynthNote(noteData.note, noteData.duration, time);
      });

      audioAdapter.scheduleUIUpdate(time, () => {
        drumGrid.highlightPlayingStep(currentStep);
        pianoRoll.setPlayhead(currentStep);
        stepCounter.textContent = `Step: ${(currentStep + 1).toString().padStart(2, '0')} / ${stepCount}`;
      });
    }, stepCount);
  });
});
