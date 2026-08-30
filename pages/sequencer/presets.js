const BAR_STEPS = 16;
const STEPS_MAX = 256;

const SCALE_DEGREE_TO_PITCH_CLASS = { '1': 'Ab', '2': 'Bb', '3': 'C', '4': 'Db', '5': 'Eb', '6': 'F', '7': 'G' };
const PITCH_CLASS_SEMITONE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const SHARP_SPELLING = { 0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F', 6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B' };
const HOOKTHEORY_REFERENCE_OCTAVE = 4;

function degreeToNoteName(sd, octave, scaleDegreeToPitchClass = SCALE_DEGREE_TO_PITCH_CLASS) {
  const semitone = PITCH_CLASS_SEMITONE[scaleDegreeToPitchClass[sd]];
  return SHARP_SPELLING[semitone] + (HOOKTHEORY_REFERENCE_OCTAVE + octave);
}

const VERSE_RAW_NOTES = [
  { beat: 1, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 1.5, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 2, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 3, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 4, duration: 0.5, sd: '1', octave: -1, isRest: true },
  { beat: 4.5, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 5, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 6, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 7, duration: 2, sd: '2', octave: 0, isRest: false },
  { beat: 9, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 10, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 11, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 12, duration: 0.5, sd: '1', octave: -1, isRest: true },
  { beat: 12.5, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 13, duration: 1, sd: '6', octave: -1, isRest: false },
  { beat: 14, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 15, duration: 1, sd: '4', octave: 0, isRest: false },
  { beat: 16, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 17, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 17.5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 18, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 19, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 20, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 20.5, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 21, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 22, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 23, duration: 2, sd: '2', octave: 0, isRest: false },
  { beat: 25, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 26, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 27, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 28, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 28.5, duration: 0.5, sd: '5', octave: -1, isRest: false },
  { beat: 29, duration: 1, sd: '6', octave: -1, isRest: false },
  { beat: 30, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 31, duration: 1, sd: '4', octave: 0, isRest: false },
  { beat: 32, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 33, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 34, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 35, duration: 1, sd: '5', octave: 0, isRest: false },
  { beat: 36, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 36.5, duration: 1.5, sd: '3', octave: 0, isRest: false },
  { beat: 38, duration: 1.5, sd: '2', octave: 0, isRest: false },
  { beat: 39.5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 40, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 41, duration: 0.5, sd: '1', octave: 0, isRest: false },
  { beat: 41.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 42, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 43, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 44, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 45, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 46, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 47, duration: 0.5, sd: '7', octave: -1, isRest: false },
  { beat: 47.5, duration: 0.5, sd: '7', octave: -1, isRest: false },
  { beat: 48, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 49, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 50, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 51, duration: 1, sd: '5', octave: 0, isRest: false },
  { beat: 52, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 52.5, duration: 1.5, sd: '3', octave: 0, isRest: false },
  { beat: 54, duration: 2, sd: '2', octave: 0, isRest: false },
  { beat: 56, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 57, duration: 0.5, sd: '1', octave: 0, isRest: false },
  { beat: 57.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 58, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 59, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 59.5, duration: 0.5, sd: '1', octave: 0, isRest: false },
  { beat: 60, duration: 1, sd: '1', octave: 0, isRest: false },
  { beat: 61, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 62, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 63, duration: 0.5, sd: '7', octave: -1, isRest: false },
  { beat: 63.5, duration: 0.5, sd: '7', octave: -1, isRest: false },
  { beat: 64, duration: 1, sd: '1', octave: 0, isRest: false },
];

function convertVerseNotes(raw, startStep, maxSteps, scaleDegreeToPitchClass = SCALE_DEGREE_TO_PITCH_CLASS) {
  return raw
    .filter(n => !n.isRest)
    .map(n => ({
      step: startStep + Math.round((n.beat - 1) * 4),
      note: degreeToNoteName(n.sd, n.octave, scaleDegreeToPitchClass),
      duration: Math.round(n.duration * 4),
    }))
    .filter(n => n.step < maxSteps);
}

const VERSE_DRUM_CELL = { kick: [0, 8], snare: [], hihat: [0, 2, 4, 6, 8, 10, 12, 14] };

function tileDrums(cell, bars, startStep) {
  const kick = [], snare = [], hihat = [];
  for (let bar = 0; bar < bars; bar++) {
    const barStart = startStep + bar * BAR_STEPS;
    cell.kick.forEach(s => kick.push(barStart + s));
    cell.snare.forEach(s => snare.push(barStart + s));
    cell.hihat.forEach(s => hihat.push(barStart + s));
  }
  return { kick, snare, hihat };
}

const VERSE_START = 0;
const VERSE_BARS = STEPS_MAX / BAR_STEPS;
const TOTAL_STEPS = VERSE_START + VERSE_BARS * BAR_STEPS;

const verseDrums = tileDrums(VERSE_DRUM_CELL, VERSE_BARS, VERSE_START);

const CLARITY_DEMO = {
  version: 1,
  bpm: 128,
  steps: TOTAL_STEPS,
  drums: verseDrums,
  pianoNotes: convertVerseNotes(VERSE_RAW_NOTES, VERSE_START, TOTAL_STEPS),
  customTracks: [],
};

const TRUNCATED_STEPS = 128;
const TRUNCATED_BARS = TRUNCATED_STEPS / BAR_STEPS;
const truncatedDrums = tileDrums(VERSE_DRUM_CELL, TRUNCATED_BARS, VERSE_START);

const CLARITY_DEMO_TRUNCATED = {
  version: 1,
  bpm: 128,
  steps: TRUNCATED_STEPS,
  drums: truncatedDrums,
  pianoNotes: convertVerseNotes(VERSE_RAW_NOTES, VERSE_START, TRUNCATED_STEPS),
  customTracks: [],
};

const G_MINOR_SCALE_DEGREE_TO_PITCH_CLASS = { '1': 'G', '2': 'A', '3': 'Bb', '4': 'C', '5': 'D', '6': 'Eb', '7': 'F' };

const LIKE_A_G6_RAW_NOTES = [
  { beat: 4, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 4.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 5.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 6, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 6.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 7, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 10, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 10.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 11, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 11.5, duration: 0.5, sd: '1', octave: -1, isRest: false },
  { beat: 14, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 14.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 15, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 15.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 16, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 16.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 17, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 18, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 18.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 19, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 19.5, duration: 0.5, sd: '1', octave: -1, isRest: false },
  { beat: 20, duration: 0.5, sd: '4', octave: -1, isRest: false },
  { beat: 20.5, duration: 0.5, sd: '4', octave: -1, isRest: false },
  { beat: 21, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 21.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 22, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 22.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 23, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 26, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 27, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 28, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 30, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 30.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 31, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 31.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 32, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 33, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 34, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 34.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 35, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 36, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 38, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 38.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 39, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 40, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 41, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 41.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 42, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 43, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 44, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 44.5, duration: 0.25, sd: '3', octave: -1, isRest: false },
  { beat: 44.75, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 45.25, duration: 0.25, sd: '3', octave: -1, isRest: false },
  { beat: 45.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 46, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 46.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 47, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 47.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 48, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 49, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 50, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 50.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 51, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 52, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 54, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 54.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 55, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 56, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 57, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 57.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 58, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 59, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 60, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 60.5, duration: 0.25, sd: '3', octave: -1, isRest: false },
  { beat: 60.75, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 61.25, duration: 0.25, sd: '3', octave: -1, isRest: false },
  { beat: 61.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 62, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 62.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 63, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 63.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 64, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 65, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 66, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 66.5, duration: 0.5, sd: '3', octave: -1, isRest: false },
  { beat: 67, duration: 1, sd: '3', octave: -1, isRest: false },
  { beat: 68, duration: 1, sd: '3', octave: -1, isRest: false },
];

const G6_START = 0;
const G6_STEPS = 272;
const G6_BARS = G6_STEPS / BAR_STEPS;
const g6Drums = tileDrums(VERSE_DRUM_CELL, G6_BARS, G6_START);

const LIKE_A_G6_DEMO = {
  version: 1,
  bpm: 130,
  steps: G6_STEPS,
  drums: g6Drums,
  pianoNotes: convertVerseNotes(LIKE_A_G6_RAW_NOTES, G6_START, G6_STEPS, G_MINOR_SCALE_DEGREE_TO_PITCH_CLASS),
  customTracks: [],
};

const B_MINOR_SCALE_DEGREE_TO_PITCH_CLASS = { '1': 'B', '2': 'Db', '3': 'D', '4': 'E', '5': 'Gb', '6': 'G', '7': 'A' };

const PORTER_RAW_NOTES = [
  { beat: 1.5, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 2, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 2.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 3, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 4, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 5.5, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 6, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 6.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 7, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 7.5, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 8, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 8.5, duration: 0.5, sd: '4', octave: 0, isRest: false },
  { beat: 9, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 9.5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 10, duration: 0.5, sd: '2', octave: 1, isRest: false },
  { beat: 10.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 11, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 11.5, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 12.5, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 13.5, duration: 1, sd: '7', octave: 0, isRest: false },
  { beat: 14.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 15, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 15.5, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 16, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 16.5, duration: 0.5, sd: '4', octave: 0, isRest: false },
  { beat: 17, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 17.5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 18, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 18.5, duration: 1, sd: '2', octave: 0, isRest: false },
  { beat: 19.5, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 20.5, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 21.5, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 22, duration: 0.5, sd: '7', octave: 0, isRest: false },
  { beat: 22.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 23, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 23.5, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 24, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 24.5, duration: 0.5, sd: '4', octave: 0, isRest: false },
  { beat: 25, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 25.5, duration: 0.5, sd: '1', octave: 0, isRest: true },
  { beat: 26, duration: 0.5, sd: '2', octave: 1, isRest: false },
  { beat: 26.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 27, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 27.5, duration: 1, sd: '3', octave: 0, isRest: false },
  { beat: 28.5, duration: 1, sd: '1', octave: 0, isRest: true },
  { beat: 29.5, duration: 1, sd: '7', octave: 0, isRest: false },
  { beat: 30.5, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 31, duration: 0.5, sd: '2', octave: 0, isRest: false },
  { beat: 31.5, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 32, duration: 0.5, sd: '3', octave: 0, isRest: false },
  { beat: 32.5, duration: 0.5, sd: '4', octave: 0, isRest: false },
  { beat: 33, duration: 1, sd: '3', octave: 0, isRest: false },
];

const PORTER_START = 0;
const PORTER_STEPS = 144;
const PORTER_BARS = PORTER_STEPS / BAR_STEPS;
const porterDrums = tileDrums(VERSE_DRUM_CELL, PORTER_BARS, PORTER_START);

const WANNACRY_DEMO = {
  version: 1,
  bpm: 100,
  steps: PORTER_STEPS,
  drums: porterDrums,
  pianoNotes: convertVerseNotes(PORTER_RAW_NOTES, PORTER_START, PORTER_STEPS, B_MINOR_SCALE_DEGREE_TO_PITCH_CLASS),
  customTracks: [],
};

// Wii Sports Title (Hooktheory verse, 120 BPM, B major) and C418 Sweden
// (Hooktheory verse, 88 BPM, D major). Melody + triad/7th voicings, first 8 bars.
const WII_DRUM_CELL = { kick: [0, 8], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14] };
const SWEDEN_DRUM_CELL = { kick: [0], snare: [8], hihat: [4, 12] };
const HOOK_DEMO_BARS = 8;
const HOOK_DEMO_STEPS = HOOK_DEMO_BARS * BAR_STEPS;

const WII_DEMO = {
  version: 1,
  bpm: 120,
  steps: HOOK_DEMO_STEPS,
  drums: tileDrums(WII_DRUM_CELL, HOOK_DEMO_BARS, 0),
  pianoNotes: [
    { note: 'F#4', step: 0, duration: 8 },
    { note: 'D#4', step: 0, duration: 8 },
    { note: 'B3', step: 0, duration: 8 },
    { note: 'E4', step: 8, duration: 8 },
    { note: 'B3', step: 8, duration: 8 },
    { note: 'G#3', step: 8, duration: 8 },
    { note: 'E3', step: 8, duration: 8 },
    { note: 'C#3', step: 8, duration: 8 },
    { note: 'B4', step: 16, duration: 8 },
    { note: 'F#4', step: 16, duration: 8 },
    { note: 'D#4', step: 16, duration: 8 },
    { note: 'B4', step: 19, duration: 3 },
    { note: 'A#4', step: 22, duration: 2 },
    { note: 'B4', step: 24, duration: 3 },
    { note: 'F#4', step: 24, duration: 16 },
    { note: 'D#4', step: 24, duration: 16 },
    { note: 'B3', step: 24, duration: 16 },
    { note: 'G#3', step: 24, duration: 16 },
    { note: 'F#4', step: 27, duration: 3 },
    { note: 'D#4', step: 30, duration: 2 },
    { note: 'B3', step: 32, duration: 3 },
    { note: 'C#4', step: 35, duration: 3 },
    { note: 'D#4', step: 38, duration: 2 },
    { note: 'F#4', step: 40, duration: 8 },
    { note: 'E4', step: 40, duration: 8 },
    { note: 'C#4', step: 40, duration: 16 },
    { note: 'A#3', step: 40, duration: 8 },
    { note: 'B4', step: 48, duration: 8 },
    { note: 'F#4', step: 48, duration: 8 },
    { note: 'D#4', step: 48, duration: 8 },
    { note: 'B3', step: 56, duration: 8 },
    { note: 'G#3', step: 56, duration: 8 },
    { note: 'E3', step: 56, duration: 8 },
    { note: 'B4', step: 64, duration: 8 },
    { note: 'F#4', step: 64, duration: 8 },
    { note: 'D#4', step: 64, duration: 8 },
    { note: 'E4', step: 72, duration: 8 },
    { note: 'B3', step: 72, duration: 8 },
    { note: 'G#3', step: 72, duration: 8 },
    { note: 'D#4', step: 78, duration: 1 },
    { note: 'E4', step: 79, duration: 1 },
    { note: 'F#4', step: 80, duration: 8 },
    { note: 'E4', step: 80, duration: 8 },
    { note: 'C#4', step: 80, duration: 8 },
    { note: 'A#3', step: 80, duration: 8 },
    { note: 'B4', step: 83, duration: 3 },
    { note: 'C#4', step: 86, duration: 2 },
    { note: 'B4', step: 88, duration: 6 },
    { note: 'F#4', step: 88, duration: 8 },
    { note: 'D#4', step: 88, duration: 8 },
    { note: 'B3', step: 88, duration: 8 },
    { note: 'G#3', step: 88, duration: 8 },
    { note: 'B4', step: 94, duration: 1 },
    { note: 'C#4', step: 95, duration: 1 },
    { note: 'E4', step: 96, duration: 8 },
    { note: 'B3', step: 96, duration: 8 },
    { note: 'G#3', step: 96, duration: 8 },
    { note: 'D#4', step: 99, duration: 3 },
    { note: 'C#4', step: 102, duration: 2 },
    { note: 'B4', step: 104, duration: 8 },
    { note: 'F#4', step: 104, duration: 8 },
    { note: 'D#4', step: 104, duration: 8 },
    { note: 'F#4', step: 108, duration: 2 },
    { note: 'G#4', step: 110, duration: 4 },
    { note: 'C#4', step: 112, duration: 16 },
    { note: 'B3', step: 112, duration: 16 },
    { note: 'G#3', step: 112, duration: 16 },
    { note: 'E3', step: 112, duration: 16 },
    { note: 'C#4', step: 114, duration: 2 },
    { note: 'C#4', step: 116, duration: 8 },
    { note: 'C#4', step: 126, duration: 1 },
    { note: 'D#4', step: 127, duration: 1 },
  ],
  customTracks: [],
  trackMix: {
    kick: { volume: 0.85, mute: false, reverb: 0.05, delay: 0, filter: 1 },
    snare: { volume: 0.7, mute: false, reverb: 0.08, delay: 0, filter: 1 },
    hihat: { volume: 0.4, mute: false, reverb: 0, delay: 0, filter: 1 },
    piano: { volume: 1, mute: false, reverb: 0.12, delay: 0.04, filter: 1 },
  },
};

const SWEDEN_DEMO = {
  version: 1,
  bpm: 88,
  steps: HOOK_DEMO_STEPS,
  drums: tileDrums(SWEDEN_DRUM_CELL, HOOK_DEMO_BARS, 0),
  pianoNotes: [
    { note: 'B3', step: 0, duration: 8 },
    { note: 'G3', step: 0, duration: 8 },
    { note: 'E3', step: 0, duration: 8 },
    { note: 'A4', step: 8, duration: 4 },
    { note: 'E4', step: 8, duration: 8 },
    { note: 'C#4', step: 8, duration: 8 },
    { note: 'A3', step: 8, duration: 8 },
    { note: 'F#3', step: 8, duration: 8 },
    { note: 'B4', step: 12, duration: 4 },
    { note: 'F#4', step: 16, duration: 12 },
    { note: 'D4', step: 16, duration: 8 },
    { note: 'B3', step: 16, duration: 8 },
    { note: 'G3', step: 16, duration: 8 },
    { note: 'A4', step: 24, duration: 8 },
    { note: 'F#4', step: 24, duration: 8 },
    { note: 'D4', step: 24, duration: 8 },
    { note: 'B3', step: 24, duration: 8 },
    { note: 'D4', step: 28, duration: 2 },
    { note: 'E4', step: 30, duration: 2 },
    { note: 'F#4', step: 32, duration: 8 },
    { note: 'C#4', step: 32, duration: 12 },
    { note: 'A3', step: 32, duration: 8 },
    { note: 'F#4', step: 40, duration: 8 },
    { note: 'D4', step: 40, duration: 8 },
    { note: 'B3', step: 40, duration: 8 },
    { note: 'G3', step: 40, duration: 8 },
    { note: 'F#4', step: 44, duration: 2 },
    { note: 'A4', step: 46, duration: 2 },
    { note: 'E4', step: 48, duration: 16 },
    { note: 'C#4', step: 48, duration: 16 },
    { note: 'A3', step: 48, duration: 16 },
    { note: 'F#3', step: 48, duration: 16 },
    { note: 'D3', step: 48, duration: 16 },
    { note: 'B3', step: 64, duration: 8 },
    { note: 'G3', step: 64, duration: 8 },
    { note: 'E3', step: 64, duration: 8 },
    { note: 'D4', step: 68, duration: 4 },
    { note: 'B4', step: 72, duration: 4 },
    { note: 'E4', step: 72, duration: 8 },
    { note: 'C#4', step: 72, duration: 8 },
    { note: 'A3', step: 72, duration: 8 },
    { note: 'F#3', step: 72, duration: 8 },
    { note: 'A4', step: 76, duration: 4 },
    { note: 'F#4', step: 80, duration: 12 },
    { note: 'D4', step: 80, duration: 8 },
    { note: 'B3', step: 80, duration: 8 },
    { note: 'G3', step: 80, duration: 8 },
    { note: 'A4', step: 88, duration: 8 },
    { note: 'F#4', step: 88, duration: 8 },
    { note: 'D4', step: 88, duration: 8 },
    { note: 'B3', step: 88, duration: 8 },
    { note: 'D4', step: 92, duration: 2 },
    { note: 'E4', step: 94, duration: 2 },
    { note: 'F#4', step: 96, duration: 8 },
    { note: 'C#4', step: 96, duration: 12 },
    { note: 'A3', step: 96, duration: 8 },
    { note: 'F#4', step: 104, duration: 8 },
    { note: 'D4', step: 104, duration: 8 },
    { note: 'B3', step: 104, duration: 8 },
    { note: 'G3', step: 104, duration: 8 },
    { note: 'A4', step: 108, duration: 2 },
    { note: 'F#4', step: 110, duration: 2 },
    { note: 'E4', step: 112, duration: 16 },
    { note: 'C#4', step: 112, duration: 16 },
    { note: 'A3', step: 112, duration: 16 },
    { note: 'F#3', step: 112, duration: 16 },
    { note: 'D3', step: 112, duration: 16 },
  ],
  customTracks: [],
  trackMix: {
    kick: { volume: 0.5, mute: false, reverb: 0.1, delay: 0, filter: 0.85 },
    snare: { volume: 0.32, mute: false, reverb: 0.18, delay: 0, filter: 0.9 },
    hihat: { volume: 0.18, mute: false, reverb: 0.08, delay: 0, filter: 1 },
    piano: { volume: 1, mute: false, reverb: 0.28, delay: 0.08, filter: 1 },
  },
};

const DEMO_PRESETS_BY_NICKNAME = {
  mike: CLARITY_DEMO,
  miket: CLARITY_DEMO_TRUNCATED,
  demo2: LIKE_A_G6_DEMO,
  porter: WANNACRY_DEMO,
  wii: WII_DEMO,
  craft: SWEDEN_DEMO,
};

export function getDemoPresetForNickname(nickname) {
  return DEMO_PRESETS_BY_NICKNAME[String(nickname || '').trim().toLowerCase()] || null;
}
