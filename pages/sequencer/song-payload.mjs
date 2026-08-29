export const SONG_VERSION = 1;

function copySteps(steps) {
  return Array.isArray(steps) ? steps.slice() : [];
}

function copyPianoNote(note) {
  return {
    note: note.note,
    step: note.step,
    duration: note.duration,
  };
}

function copyCustomTrack(track) {
  const payload = {
    id: track.id,
    label: track.label || track.id,
    synth: track.synth,
    steps: copySteps(track.steps),
  };
  if (track.note != null) payload.note = track.note;
  if (track.duration != null) payload.duration = track.duration;
  if (track.theme != null) payload.theme = track.theme;
  if (track.options != null) payload.options = JSON.parse(JSON.stringify(track.options));
  return payload;
}

export function createSongPayload({ bpm, steps, drums = {}, pianoNotes = [], customTracks = [] }) {
  return {
    version: SONG_VERSION,
    bpm: Number(bpm),
    steps: Number(steps),
    drums: {
      kick: copySteps(drums.kick),
      snare: copySteps(drums.snare),
      hihat: copySteps(drums.hihat),
    },
    pianoNotes: pianoNotes.map(copyPianoNote),
    customTracks: customTracks.map(copyCustomTrack),
  };
}

export function buildSubmitBeatMessage(song) {
  return { type: 'submit-beat', beat: createSongPayload(song) };
}
