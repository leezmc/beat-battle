import { AudioEngineAdapter } from './audio.js';
import { PianoRoll } from './piano-roll.js';
import { DrumGrid } from './drum-grid.js';
import { Sounds } from './sounds.js';
import { PIANO_NOTES } from './config.js';
import { loadBeatDraft, saveBeatDraft } from './beat-draft.js';
import { getDemoPresetForNickname } from './presets.js';
import { createSongPayload, buildSubmitBeatMessage } from './song-payload.mjs';
import { CUSTOM_TRACKS_STORAGE_KEY, ELECTRIC_BASS } from '../sound-samples/sample-sounds.js';
import { buildCheckboxTrack } from './checkbox-track.js';
import { connectLobbySocket, getSessionParamsFromURL, buildSessionURL, cacheResults } from '../shared/lobby-socket.js';
import { autoInitAudio } from '../shared/audio-unlock.js';
import { PIANO_TRACK_ID, copyTrackMix, normalizeTrackMix, normalizeMasterMix } from './track-mix.mjs';
import { createTrackStrip } from './track-strip.js';

function loadCustomTrackDefs() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
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
  const masterVolumeInput = document.getElementById('master-volume');
  const masterLimiterInput = document.getElementById('master-limiter');

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
  const trackMixState = copyTrackMix();
  const masterMixState = normalizeMasterMix();
  const trackStrips = new Map();
  const pianoPanel = document.querySelector('.piano-roll-panel');

  function setMasterMix(mix) {
    Object.assign(masterMixState, normalizeMasterMix(mix));
    masterVolumeInput.value = String(Math.round(masterMixState.volume * 100));
    masterLimiterInput.value = String(Math.round(masterMixState.limiter * 100));
    audioAdapter.applyMasterMix(masterMixState);
  }

  function setTrackMix(trackId, mix, muteTarget) {
    trackMixState[trackId] = normalizeTrackMix(mix);
    audioAdapter.applyChannelMix(trackId, trackMixState[trackId]);
    if (muteTarget) muteTarget.classList.toggle('is-muted', trackMixState[trackId].mute);
  }

  function mountTrackStrip(trackEl, trackId, label, options = {}) {
    if (trackStrips.has(trackId)) return;
    if (!trackMixState[trackId]) trackMixState[trackId] = normalizeTrackMix();

    const strip = createTrackStrip({
      label,
      mix: trackMixState[trackId],
      hideLabel: options.hideLabel,
      onChange(mix) {
        setTrackMix(trackId, mix, options.muteTarget || trackEl);
      },
    });
    trackEl.prepend(strip.root);
    trackStrips.set(trackId, strip);
    setTrackMix(trackId, trackMixState[trackId], options.muteTarget || trackEl);
  }

  function addCustomTrack(def, existingTrackEl) {
    if (!def?.id || customTracks.some(track => track.def.id === def.id)) return;

    let trackEl = existingTrackEl;
    if (!trackEl) {
      trackEl = document.createElement('div');
      trackEl.className = 'track';
      trackEl.id = `custom-track-${def.id}`;
      tracksPanel.appendChild(trackEl);
    }

    mountTrackStrip(trackEl, def.id, def.label || def.id);
    customTracks.push({ def, trackEl, boxes: [] });
  }

  mountTrackStrip(drumGrid.kickTrack, 'kick', 'Kick');
  mountTrackStrip(drumGrid.snareTrack, 'snare', 'Snare');
  mountTrackStrip(drumGrid.hihatTrack, 'hihat', 'HiHat');
  mountTrackStrip(
    document.getElementById('piano-track-strip'),
    PIANO_TRACK_ID,
    'Synth',
    { hideLabel: true, muteTarget: pianoPanel },
  );

  addCustomTrack(ELECTRIC_BASS, document.getElementById('bass-track'));
  loadCustomTrackDefs().forEach((def) => addCustomTrack(def));

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
    stepCounter.textContent = `Step: -- / ${stepCount}`;
  }

  function activeSteps(boxes) {
    return boxes.reduce((steps, box, step) => {
      if (box.checked) steps.push(step);
      return steps;
    }, []);
  }

  function collectBeatSong() {
    const steps = Math.max(1, Math.min(STEPS_MAX, stepCount));
    const inRange = (index) => index < steps;
    return {
      bpm: parseInt(bpmInput.value, 10),
      steps,
      drums: {
        kick: activeSteps(drumGrid.kickBoxes).filter(inRange),
        snare: activeSteps(drumGrid.snareBoxes).filter(inRange),
        hihat: activeSteps(drumGrid.hihatBoxes).filter(inRange),
      },
      pianoNotes: pianoRoll.pianoNotes.flatMap((row, rowIndex) => row.reduce((notes, noteData, step) => {
        if (noteData.active && step < steps) {
          notes.push({
            note: PIANO_NOTES[rowIndex],
            step,
            duration: Math.min(noteData.duration, steps - step),
          });
        }
        return notes;
      }, [])),
      customTracks: customTracks.map(track => ({
        ...track.def,
        steps: activeSteps(track.boxes).filter(inRange),
      })),
      trackMix: copyTrackMix(trackMixState, customTracks.map((track) => track.def.id)),
      masterMix: normalizeMasterMix(masterMixState),
    };
  }

  function createBeatDraft() {
    return createSongPayload(collectBeatSong());
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

    const nextMix = copyTrackMix(beatDraft.trackMix, customTracks.map((track) => track.def.id));
    Object.assign(trackMixState, nextMix);
    Object.entries(nextMix).forEach(([trackId, mix]) => {
      trackStrips.get(trackId)?.setMix(mix);
      const muteTarget = trackId === PIANO_TRACK_ID
        ? pianoPanel
        : customTracks.find((track) => track.def.id === trackId)?.trackEl
          || drumGrid[`${trackId}Track`];
      setTrackMix(trackId, mix, muteTarget);
    });
    setMasterMix(beatDraft.masterMix);
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

  masterVolumeInput.addEventListener('input', () => {
    setMasterMix({ ...masterMixState, volume: Number(masterVolumeInput.value) / 100 });
  });
  masterLimiterInput.addEventListener('input', () => {
    setMasterMix({ ...masterMixState, limiter: Number(masterLimiterInput.value) / 100 });
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
    audioAdapter.applyTrackMix(trackMixState);
    audioAdapter.applyMasterMix(masterMixState);

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
    let submittedByTimeout = false;
    let countdownHandle = null;
    let autoSubmitHandle = null;

    function formatTime(ms) {
      const secs = Math.ceil(Math.max(0, ms) / 1000);
      return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    }

    function startCountdown(endsAt) {
      clearInterval(countdownHandle);
      clearTimeout(autoSubmitHandle);

      function tick() {
        roundTimerEl.textContent = formatTime(endsAt - Date.now());
      }

      tick();
      countdownHandle = setInterval(tick, 250);
      autoSubmitHandle = setTimeout(() => {
        clearInterval(countdownHandle);
        roundTimerEl.textContent = '00:00';
        submitBeat({ timedOut: true });
      }, Math.max(0, endsAt - Date.now()));
    }

    function submitBeat({ timedOut = false } = {}) {
      if (hasSubmitted) return;
      hasSubmitted = true;
      submittedByTimeout = timedOut;
      if (isPlaying) stopPlayback();
      submitBtn.disabled = true;
      submitBtn.textContent = timedOut
        ? 'Time’s up — submitting…'
        : 'Submitted — waiting for others…';
      socket.send(JSON.stringify(buildSubmitBeatMessage(collectBeatSong())));
    }

    function goToPhase(phase, theme) {
      if (phase === 'reveal') {
        location.href = `${buildSessionURL('../sound-samples/sound-samples.html', session)}&theme=${encodeURIComponent(theme)}`;
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
          if (msg.phase === 'voting' && !hasSubmitted) submitBeat({ timedOut: true });
          goToPhase(msg.phase);
        }
      } else if (msg.type === 'voting-started') {
        if (!hasSubmitted) submitBeat({ timedOut: true });
        goToPhase('voting');
      } else if (msg.type === 'results') {
        if (msg.results) cacheResults(session.code, msg.results);
        goToPhase('results');
      } else if (msg.type === 'error') {
        if (submittedByTimeout) return;
        lobbyStatus.textContent = msg.message;
        hasSubmitted = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Beat';
      }
    });

    submitBtn.addEventListener('click', submitBeat);
  }
});
