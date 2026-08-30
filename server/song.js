const SONG_VERSION = 1;
const SONG_LIMITS = {
  minBpm: 1,
  maxBpm: 300,
  minSteps: 1,
  maxSteps: 256,
  maxCustomTracks: 24,
  maxSongBytes: 128 * 1024,
  maxString: 40,
  maxOptionsDepth: 4,
  maxOptionsKeys: 24,
  maxTrackMixEntries: 28,
};

const ALLOWED_PIANO_NOTES = new Set([
  'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4',
  'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3',
]);

const ALLOWED_SYNTHS = new Set([
  'MembraneSynth', 'NoiseSynth', 'MetalSynth', 'FMSynth', 'Synth', 'AMSynth',
]);

const ALLOWED_TONE_DURATIONS = new Set(['32n', '16n', '8n', '4n', '2n', '1n']);
const CUSTOM_NOTE_PATTERN = /^[A-G](?:#|b)?[0-8]$/;
const SONG_KEYS = new Set(['version', 'bpm', 'steps', 'drums', 'pianoNotes', 'customTracks', 'trackMix', 'masterMix']);
const DRUM_KEYS = new Set(['kick', 'snare', 'hihat']);
const PIANO_NOTE_KEYS = new Set(['note', 'step', 'duration']);
const CUSTOM_TRACK_KEYS = new Set(['id', 'label', 'synth', 'note', 'duration', 'options', 'theme', 'steps']);
const TRACK_MIX_KEYS = new Set(['volume', 'mute', 'reverb', 'delay', 'filter']);
const MASTER_MIX_KEYS = new Set(['volume', 'limiter']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(error) {
  return { ok: false, error };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

function hasOnlyKeys(object, allowed) {
  return Object.keys(object).every((key) => allowed.has(key));
}

function isBoundedString(value, max = SONG_LIMITS.maxString) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function parseSongInput(input) {
  if (typeof input === 'string') {
    if (Buffer.byteLength(input) > SONG_LIMITS.maxSongBytes) return fail('Song is too large.');
    try {
      return { ok: true, song: JSON.parse(input) };
    } catch {
      return fail('Song must be valid JSON.');
    }
  }
  if (!isPlainObject(input)) return fail('Song required.');
  if (Buffer.byteLength(JSON.stringify(input)) > SONG_LIMITS.maxSongBytes) return fail('Song is too large.');
  return { ok: true, song: input };
}

function normalizeSteps(steps, stepCount) {
  if (!Array.isArray(steps)) return null;
  const unique = new Set();
  for (const step of steps) {
    if (!Number.isInteger(step) || step < 0 || step >= stepCount) return null;
    unique.add(step);
  }
  return [...unique].sort((a, b) => a - b);
}

function validateOptions(value, depth) {
  if (depth > SONG_LIMITS.maxOptionsDepth || !isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length > SONG_LIMITS.maxOptionsKeys) return false;
  for (const key of keys) {
    if (UNSAFE_KEYS.has(key) || !isBoundedString(key)) return false;
    const nested = value[key];
    const type = typeof nested;
    if (type === 'number') {
      if (!Number.isFinite(nested)) return false;
    } else if (type === 'string') {
      if (nested.length > SONG_LIMITS.maxString) return false;
    } else if (type === 'boolean') {
      continue;
    } else if (isPlainObject(nested)) {
      if (!validateOptions(nested, depth + 1)) return false;
    } else {
      return false;
    }
  }
  return true;
}

function validateDrums(drums, stepCount) {
  if (!isPlainObject(drums) || !hasOnlyKeys(drums, DRUM_KEYS)) return null;
  const normalized = {};
  for (const name of DRUM_KEYS) {
    const steps = normalizeSteps(drums[name] || [], stepCount);
    if (!steps) return null;
    normalized[name] = steps;
  }
  return normalized;
}

function validatePianoNotes(pianoNotes, stepCount) {
  if (!Array.isArray(pianoNotes) || pianoNotes.length > stepCount * ALLOWED_PIANO_NOTES.size) return null;
  const normalized = [];
  for (const item of pianoNotes) {
    if (!isPlainObject(item) || !hasOnlyKeys(item, PIANO_NOTE_KEYS)) return null;
    if (!ALLOWED_PIANO_NOTES.has(item.note)) return null;
    if (!Number.isInteger(item.step) || item.step < 0 || item.step >= stepCount) return null;
    if (!Number.isInteger(item.duration) || item.duration < 1 || item.duration > SONG_LIMITS.maxSteps) return null;
    normalized.push({ note: item.note, step: item.step, duration: item.duration });
  }
  return normalized;
}

function validateCustomTrack(track, stepCount) {
  if (!isPlainObject(track) || !hasOnlyKeys(track, CUSTOM_TRACK_KEYS)) return null;
  if (!isBoundedString(track.id) || !isBoundedString(track.label) || !ALLOWED_SYNTHS.has(track.synth)) return null;

  const steps = normalizeSteps(track.steps || [], stepCount);
  if (!steps) return null;

  const normalized = { id: track.id, label: track.label, synth: track.synth, steps };
  if (track.note !== undefined) {
    if (typeof track.note !== 'string' || !CUSTOM_NOTE_PATTERN.test(track.note)) return null;
    normalized.note = track.note;
  }
  if (track.duration !== undefined) {
    if (!ALLOWED_TONE_DURATIONS.has(track.duration)) return null;
    normalized.duration = track.duration;
  }
  if (track.theme !== undefined) {
    if (!isBoundedString(track.theme)) return null;
    normalized.theme = track.theme;
  }
  if (track.options !== undefined) {
    if (!validateOptions(track.options, 1)) return null;
    normalized.options = JSON.parse(JSON.stringify(track.options));
  }
  return normalized;
}

function isUnit(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateTrackMixEntry(entry) {
  if (!isPlainObject(entry) || !hasOnlyKeys(entry, TRACK_MIX_KEYS)) return null;
  if (!isUnit(entry.volume) || !isUnit(entry.reverb) || !isUnit(entry.delay) || !isUnit(entry.filter)) return null;
  if (typeof entry.mute !== 'boolean') return null;
  return {
    volume: entry.volume,
    mute: entry.mute,
    reverb: entry.reverb,
    delay: entry.delay,
    filter: entry.filter,
  };
}

function validateTrackMix(trackMix) {
  if (trackMix === undefined) return {};
  if (!isPlainObject(trackMix)) return null;
  const keys = Object.keys(trackMix);
  if (keys.length > SONG_LIMITS.maxTrackMixEntries) return null;
  const normalized = {};
  for (const key of keys) {
    if (UNSAFE_KEYS.has(key) || !isBoundedString(key)) return null;
    const entry = validateTrackMixEntry(trackMix[key]);
    if (!entry) return null;
    normalized[key] = entry;
  }
  return normalized;
}

function validateCustomTracks(customTracks, stepCount) {
  if (!Array.isArray(customTracks) || customTracks.length > SONG_LIMITS.maxCustomTracks) return null;
  const seen = new Set();
  const normalized = [];
  for (const track of customTracks) {
    const item = validateCustomTrack(track, stepCount);
    if (!item || seen.has(item.id)) return null;
    seen.add(item.id);
    normalized.push(item);
  }
  return normalized;
}

function validateMasterMix(masterMix) {
  if (masterMix === undefined) return { volume: 1, limiter: 0 };
  if (!isPlainObject(masterMix) || !hasOnlyKeys(masterMix, MASTER_MIX_KEYS)) return null;
  if (!isUnit(masterMix.volume) || !isUnit(masterMix.limiter)) return null;
  return { volume: masterMix.volume, limiter: masterMix.limiter };
}

function validateSong(input) {
  const parsed = parseSongInput(input);
  if (!parsed.ok) return parsed;

  const song = parsed.song;
  if (!isPlainObject(song) || !hasOnlyKeys(song, SONG_KEYS)) return fail('Invalid song.');
  if (song.version !== SONG_VERSION) return fail('Unsupported song version.');
  if (!Number.isInteger(song.bpm) || song.bpm < SONG_LIMITS.minBpm || song.bpm > SONG_LIMITS.maxBpm) {
    return fail('Invalid BPM.');
  }
  if (!Number.isInteger(song.steps) || song.steps < SONG_LIMITS.minSteps || song.steps > SONG_LIMITS.maxSteps) {
    return fail('Invalid step count.');
  }

  const drums = validateDrums(song.drums, song.steps);
  if (!drums) return fail('Invalid drums.');
  const pianoNotes = validatePianoNotes(song.pianoNotes, song.steps);
  if (!pianoNotes) return fail('Invalid piano notes.');
  const customTracks = validateCustomTracks(song.customTracks, song.steps);
  if (!customTracks) return fail('Invalid custom tracks.');
  const trackMix = validateTrackMix(song.trackMix);
  if (!trackMix) return fail('Invalid track mix.');
  const masterMix = validateMasterMix(song.masterMix);
  if (!masterMix) return fail('Invalid master mix.');

  return {
    ok: true,
    song: {
      version: SONG_VERSION,
      bpm: song.bpm,
      steps: song.steps,
      drums,
      pianoNotes,
      customTracks,
      trackMix,
      masterMix,
    },
  };
}

class SongRegistry {
  constructor() {
    this.byPlayer = new Map();
  }

  submit(playerId, input) {
    const result = validateSong(input);
    if (!result.ok) return result;

    this.byPlayer.set(playerId, result.song);
    return { ok: true, song: result.song };
  }

  has(playerId) {
    return this.byPlayer.has(playerId);
  }

  getSong(playerId) {
    return this.byPlayer.get(playerId) ?? null;
  }

  playerIds() {
    return Array.from(this.byPlayer.keys());
  }

  clear() {
    this.byPlayer.clear();
  }

  get size() {
    return this.byPlayer.size;
  }
}

module.exports = {
  SONG_LIMITS,
  SongRegistry,
  validateSong,
};
