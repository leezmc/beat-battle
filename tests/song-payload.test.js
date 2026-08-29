const test = require('node:test');
const assert = require('node:assert');
const { validateSong } = require('../server/song.js');

test('createSongPayload keeps only contract fields and is JSON-safe', async () => {
  const { createSongPayload, SONG_VERSION } = await import('../pages/sequencer/song-payload.mjs');

  const payload = createSongPayload({
    bpm: '128',
    steps: '16',
    drums: { kick: [0], snare: [4], hihat: [2], extra: [9] },
    pianoNotes: [{ note: 'G4', step: 3, duration: 1, selected: true }],
    customTracks: [{
      id: 'techno-zap',
      label: 'Zap',
      synth: 'FMSynth',
      note: 'C5',
      duration: '16n',
      theme: 'Techno',
      options: { harmonicity: 8, modulationIndex: 2 },
      steps: [1, 5],
      trackEl: { not: 'serializable-on-purpose' },
      boxes: [{ checked: true }],
    }],
  });

  assert.strictEqual(payload.version, SONG_VERSION);
  assert.strictEqual(payload.bpm, 128);
  assert.strictEqual(payload.steps, 16);
  assert.deepStrictEqual(payload.drums, { kick: [0], snare: [4], hihat: [2] });
  assert.deepStrictEqual(payload.pianoNotes, [{ note: 'G4', step: 3, duration: 1 }]);
  assert.deepStrictEqual(payload.customTracks, [{
    id: 'techno-zap',
    label: 'Zap',
    synth: 'FMSynth',
    note: 'C5',
    duration: '16n',
    theme: 'Techno',
    options: { harmonicity: 8, modulationIndex: 2 },
    steps: [1, 5],
  }]);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(payload)));
});

test('client submit message matches the server song contract', async () => {
  const { buildSubmitBeatMessage } = await import('../pages/sequencer/song-payload.mjs');

  const message = buildSubmitBeatMessage({
    bpm: 100,
    steps: 8,
    drums: { kick: [0], snare: [], hihat: [] },
    pianoNotes: [{ note: 'C3', step: 1, duration: 1 }],
    customTracks: [],
  });

  assert.strictEqual(message.type, 'submit-beat');
  const result = validateSong(message.beat);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.song.bpm, 100);
  assert.strictEqual(result.song.steps, 8);
});
