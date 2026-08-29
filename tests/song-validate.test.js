const test = require('node:test');
const assert = require('node:assert');
const { SONG_LIMITS, validateSong } = require('../server/song.js');

function validSong(overrides = {}) {
  return {
    version: 1,
    bpm: 120,
    steps: 16,
    drums: { kick: [0, 4], snare: [8], hihat: [0, 2, 4, 6] },
    pianoNotes: [{ note: 'C4', step: 0, duration: 2 }],
    customTracks: [],
    ...overrides,
  };
}

test('validateSong accepts a version 1 payload and sorts drum steps', () => {
  const result = validateSong(validSong({ drums: { kick: [4, 0, 4], snare: [], hihat: [] } }));
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.song.drums.kick, [0, 4]);
});

test('validateSong accepts a JSON string and rejects invalid or oversized JSON', () => {
  const ok = validateSong(JSON.stringify(validSong()));
  assert.strictEqual(ok.ok, true);

  assert.deepStrictEqual(validateSong('{'), { ok: false, error: 'Song must be valid JSON.' });
  assert.deepStrictEqual(validateSong('x'.repeat(SONG_LIMITS.maxSongBytes + 1)), {
    ok: false,
    error: 'Song is too large.',
  });
});

test('validateSong rejects contract violations', () => {
  assert.deepStrictEqual(validateSong(null), { ok: false, error: 'Song required.' });
  assert.deepStrictEqual(validateSong(validSong({ version: 2 })), { ok: false, error: 'Unsupported song version.' });
  assert.deepStrictEqual(validateSong(validSong({ bpm: 0 })), { ok: false, error: 'Invalid BPM.' });
  assert.deepStrictEqual(validateSong(validSong({ steps: 65 })), { ok: false, error: 'Invalid step count.' });
  assert.deepStrictEqual(validateSong(validSong({ extra: true })), { ok: false, error: 'Invalid song.' });
  assert.deepStrictEqual(validateSong(validSong({ drums: { kick: [99], snare: [], hihat: [] } })), {
    ok: false,
    error: 'Invalid drums.',
  });
  assert.deepStrictEqual(validateSong(validSong({ pianoNotes: [{ note: 'C8', step: 0, duration: 1 }] })), {
    ok: false,
    error: 'Invalid piano notes.',
  });
});

test('validateSong rejects unsafe custom-track synth data', () => {
  const unknownSynth = validSong({
    customTracks: [{ id: 'x', label: 'X', synth: 'Function', steps: [] }],
  });
  assert.deepStrictEqual(validateSong(unknownSynth), { ok: false, error: 'Invalid custom tracks.' });

  const polluted = validSong({
    customTracks: [{
      id: 'kick',
      label: 'Kick',
      synth: 'MembraneSynth',
      steps: [0],
      options: { attack: 1, constructor: { polluted: true } },
    }],
  });
  assert.deepStrictEqual(validateSong(polluted), { ok: false, error: 'Invalid custom tracks.' });
});

test('validateSong accepts track mix and rejects invalid mix entries', () => {
  const accepted = validateSong(validSong({
    trackMix: {
      kick: { volume: 0.5, mute: true, reverb: 0.2, delay: 0, filter: 1 },
    },
  }));
  assert.strictEqual(accepted.ok, true);
  assert.deepStrictEqual(accepted.song.trackMix.kick, {
    volume: 0.5,
    mute: true,
    reverb: 0.2,
    delay: 0,
    filter: 1,
  });

  assert.deepStrictEqual(validateSong(validSong({
    trackMix: { kick: { volume: 2, mute: false, reverb: 0, delay: 0, filter: 1 } },
  })), { ok: false, error: 'Invalid track mix.' });
});

test('validateSong accepts master mix and rejects invalid limiter values', () => {
  const accepted = validateSong(validSong({ masterMix: { volume: 0.8, limiter: 0.5 } }));
  assert.strictEqual(accepted.ok, true);
  assert.deepStrictEqual(accepted.song.masterMix, { volume: 0.8, limiter: 0.5 });

  assert.deepStrictEqual(validateSong(validSong({
    masterMix: { volume: 1, limiter: 2 },
  })), { ok: false, error: 'Invalid master mix.' });
});
