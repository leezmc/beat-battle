import { AudioEngineAdapter } from './audio.js';
import { PianoRoll } from './piano-roll.js';
import { DrumGrid } from './drum-grid.js';
import { Sounds } from './sounds.js';
import { PIANO_NOTES } from './config.js';
import { loadBeatDraft, saveBeatDraft } from './beat-draft.js';
import { getDemoPresetForNickname } from './presets.js';
import { CUSTOM_TRACKS_STORAGE_KEY } from '../sound-samples/sample-sounds.js';
import { buildCheckboxTrack } from './checkbox-track.js';
import { connectLobbySocket, getSessionParamsFromURL, buildSessionURL } from '../shared/lobby-socket.js';
import { autoInitAudio } from '../shared/audio-unlock.js';

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
  const toggleSeqBtn = document.getElementById('toggle-seq-btn');
  const bpmInput = document.getElementById('bpm-input');
  const clearBtn = document.getElementById('clear-btn');
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const loadDraftBtn = document.getElementById('load-draft-btn');
  const draftStatus = document.getElementById('draft-status');
  const stepCounter = document.getElementById('step-counter');
  const stepsInput = document.getElementById('steps-input');
  const sectionRuler = document.getElementById('section-ruler');

  const session = getSessionParamsFromURL();

  const tracksPanel = document.querySelector('.tracks-panel');

  tracksPanel.addEventListener('wheel', (event) => {
    if (tracksPanel.scrollWidth <= tracksPanel.clientWidth) return;
    event.preventDefault();
    tracksPanel.scrollLeft += event.deltaY;
  }, { passive: false });

  const audioAdapter = new AudioEngineAdapter();
  autoInitAudio(audioAdapter);
  const drumGrid = new DrumGrid();
  const pianoRoll = new PianoRoll('piano-roll-canvas');

  let isPlaying = false;
  let stepCount = parseInt(stepsInput.value, 10);

  const customTracks = [];

  function addCustomTrack(def) {
    if (!def?.id || customTracks.some(track => track.def.id === def.id)) return;

    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    trackEl.id = `custom-track-${def.id}`;

    const label = document.createElement('span');
    label.innerText = def.label || def.id;
    label.title = label.innerText;
    trackEl.appendChild(label);

    tracksPanel.appendChild(trackEl);

    customTracks.push({ def, trackEl, boxes: [] });
  }

  loadCustomTrackDefs().forEach(addCustomTrack);

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

  function updateStepCount(newSteps) {
    stepCount = Math.max(1, Math.min(STEPS_MAX, parseInt(newSteps, 10) || stepCount));
    stepsInput.value = stepCount;
    drumGrid.buildGrid(stepCount);
    pianoRoll.resizeSteps(stepCount);
    buildCustomTracks(stepCount);
    buildSectionRuler(sectionRuler, []);
    stepCounter.textContent = `Step: -- / ${stepCount}`;
  }

  function activeSteps(boxes) {
    return boxes.reduce((steps, box, step) => {
      if (box.checked) steps.push(step);
      return steps;
    }, []);
  }

  function createBeatDraft() {
    return {
      version: 1,
      bpm: parseInt(bpmInput.value, 10),
      steps: stepCount,
      drums: {
        kick: activeSteps(drumGrid.kickBoxes),
        snare: activeSteps(drumGrid.snareBoxes),
        hihat: activeSteps(drumGrid.hihatBoxes),
      },
      pianoNotes: pianoRoll.pianoNotes.flatMap((row, rowIndex) => row.reduce((notes, noteData, step) => {
        if (noteData.active) {
          notes.push({ note: PIANO_NOTES[rowIndex], step, duration: noteData.duration });
        }
        return notes;
      }, [])),
      customTracks: customTracks.map(track => ({
        ...track.def,
        steps: activeSteps(track.boxes),
      })),
    };
  }

  function applyBeatDraft(beatDraft) {
    if (isPlaying) stopPlayback();

    const savedTracks = Array.isArray(beatDraft.customTracks) ? beatDraft.customTracks : [];
    savedTracks.forEach(({ steps, ...definition }) => addCustomTrack(definition));
    updateStepCount(beatDraft.steps);

    drumGrid.clear();
    pianoRoll.clear();
    customTracks.forEach(track => track.boxes.forEach(box => { box.checked = false; }));

    drumGrid.loadPattern(beatDraft.drums);
    pianoRoll.loadNotes(Array.isArray(beatDraft.pianoNotes) ? beatDraft.pianoNotes : []);

    const savedStepsByTrack = new Map(savedTracks.map(track => [track.id, track.steps]));
    customTracks.forEach(track => {
      const savedSteps = savedStepsByTrack.get(track.def.id) || [];
      savedSteps.forEach(step => {
        if (track.boxes[step]) track.boxes[step].checked = true;
      });
    });

    const bpm = Math.max(1, Math.min(300, parseInt(beatDraft.bpm, 10) || 120));
    bpmInput.value = bpm;
    audioAdapter.setBPM(bpm);
  }

  const demoPreset = getDemoPresetForNickname(session.nickname);
  if (demoPreset) applyBeatDraft(demoPreset);

  function stopPlayback() {
    audioAdapter.stopSequencer();
    isPlaying = false;
    toggleSeqBtn.textContent = 'Play Sequencer';
    stepsInput.disabled = false;
    stepCounter.textContent = `Step: -- / ${stepCount}`;
    clearHighlights();
  }

  bpmInput.addEventListener('change', (event) => {
    let newBPM = Math.max(1, Math.min(300, parseInt(event.target.value, 10)));
    event.target.value = newBPM;
    audioAdapter.setBPM(newBPM);
  });

  stepsInput.addEventListener('change', (event) => {
    if (isPlaying) stopPlayback();
    updateStepCount(event.target.value);
  });

  clearBtn.addEventListener('click', () => {
    drumGrid.clear();
    pianoRoll.clear();
    customTracks.forEach(t => t.boxes.forEach(b => { b.checked = false; }));
  });

  saveDraftBtn.addEventListener('click', () => {
    try {
      saveBeatDraft(createBeatDraft());
      draftStatus.textContent = 'Draft saved.';
    } catch {
      draftStatus.textContent = 'Could not save draft.';
    }
  });

  loadDraftBtn.addEventListener('click', () => {
    try {
      const beatDraft = loadBeatDraft();
      if (!beatDraft) {
        draftStatus.textContent = 'No saved draft.';
        return;
      }

      applyBeatDraft(beatDraft);
      draftStatus.textContent = 'Draft loaded.';
    } catch {
      draftStatus.textContent = 'Could not load draft.';
    }
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

  if (session.code && session.id) {
    const roundTimerEl = document.getElementById('round-timer');
    const submitBtn = document.getElementById('submit-beat-btn');
    const lobbyStatus = document.getElementById('lobby-status');
    roundTimerEl.hidden = false;
    submitBtn.hidden = false;
    lobbyStatus.textContent = `Lobby ${session.code}`;

    let hasSubmitted = false;
    let countdownHandle = null;

    function formatTime(ms) {
      const secs = Math.ceil(Math.max(0, ms) / 1000);
      return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    }

    function startCountdown(endsAt) {
      clearInterval(countdownHandle);
      countdownHandle = setInterval(() => {
        const remainingMs = endsAt - Date.now();
        roundTimerEl.textContent = formatTime(remainingMs);
        if (remainingMs <= 0) {
          clearInterval(countdownHandle);
          submitBeat();
        }
      }, 250);
    }

    function submitBeat() {
      if (hasSubmitted) return;
      hasSubmitted = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitted — waiting for others…';
      socket.send(JSON.stringify({ type: 'submit-beat', beat: createBeatDraft() }));
    }

    function goToPhase(phase, theme) {
      if (phase === 'reveal') {
        location.href = `${buildSessionURL('../sound-samples/sound-samples.html', session)}&theme=${encodeURIComponent(theme || '')}`;
        return;
      }
      const path = phase === 'voting' ? '../voting/voting.html' : '../ranking/ranking.html';
      location.href = buildSessionURL(path, session);
    }

    const socket = connectLobbySocket(session, (msg) => {
      if (msg.type === 'rejoined') {
        if (msg.phase === 'playing') {
          startCountdown(msg.roundEndsAt);
          if (msg.submitted) {
            hasSubmitted = true;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitted — waiting for others…';
          }
        } else if (msg.phase === 'reveal') {
          goToPhase('reveal', msg.theme);
        } else if (msg.phase === 'voting' || msg.phase === 'results') {
          goToPhase(msg.phase);
        }
      } else if (msg.type === 'voting-started') {
        goToPhase('voting');
      } else if (msg.type === 'error') {
        lobbyStatus.textContent = msg.message;
      }
    });

    submitBtn.addEventListener('click', submitBeat);
  }
});
