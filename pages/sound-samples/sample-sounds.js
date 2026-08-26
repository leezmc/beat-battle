
export const SoundSets = [
  {
    name: 'Techno',
    sounds: [
      { id: 'techno-sub-kick', label: 'Sub Kick', synth: 'MembraneSynth', note: 'C1', duration: '8n', options: { pitchDecay: 0.05, octaves: 6 } },
      { id: 'techno-clap', label: 'Clap', synth: 'NoiseSynth', duration: '16n', options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } } },
      { id: 'techno-rim', label: 'Rim Shot', synth: 'MetalSynth', note: 'G5', duration: '32n', options: { harmonicity: 3.1, modulationIndex: 16, resonance: 4000, envelope: { attack: 0.001, decay: 0.1, release: 0.05 } } },
      { id: 'techno-tom', label: 'Perc Tom', synth: 'MembraneSynth', note: 'G2', duration: '8n', options: { pitchDecay: 0.02, octaves: 4 } },
      { id: 'techno-zap', label: 'Zap', synth: 'FMSynth', note: 'C5', duration: '16n', options: { harmonicity: 8, modulationIndex: 2 } },
      { id: 'techno-laser', label: 'Laser', synth: 'Synth', note: 'C6', duration: '32n', options: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
      { id: 'techno-blip', label: 'Blip', synth: 'AMSynth', note: 'E5', duration: '16n', options: {} },
      { id: 'techno-noise-hat', label: 'Noise Hat', synth: 'NoiseSynth', duration: '32n', options: { noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
    ],
  },
  {
    name: 'Lo-Fi',
    sounds: [
      { id: 'lofi-kick', label: 'Dusty Kick', synth: 'MembraneSynth', note: 'C1', duration: '8n', options: { pitchDecay: 0.03, octaves: 3 } },
      { id: 'lofi-snare', label: 'Soft Snare', synth: 'NoiseSynth', duration: '16n', options: { noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } } },
      { id: 'lofi-crackle', label: 'Vinyl Crackle', synth: 'NoiseSynth', duration: '8n', options: { noise: { type: 'brown' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0 }, volume: -10 } },
      { id: 'lofi-tom', label: 'Mellow Tom', synth: 'MembraneSynth', note: 'A2', duration: '8n', options: { pitchDecay: 0.02, octaves: 3 } },
      { id: 'lofi-bell', label: 'Rhodes Bell', synth: 'FMSynth', note: 'E4', duration: '8n', options: { harmonicity: 2, modulationIndex: 3 } },
      { id: 'lofi-pluck', label: 'Dream Pluck', synth: 'AMSynth', note: 'A4', duration: '8n', options: {} },
      { id: 'lofi-bass', label: 'Sub Bass', synth: 'Synth', note: 'C2', duration: '4n', options: { oscillator: { type: 'sine' } } },
      { id: 'lofi-hiss', label: 'Tape Hiss', synth: 'NoiseSynth', duration: '4n', options: { noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0 }, volume: -18 } },
    ],
  },
  {
    name: 'Trap',
    sounds: [
      { id: 'trap-808', label: '808 Kick', synth: 'MembraneSynth', note: 'C1', duration: '4n', options: { pitchDecay: 0.08, octaves: 8 } },
      { id: 'trap-snare', label: 'Trap Snare', synth: 'NoiseSynth', duration: '16n', options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.18, sustain: 0 } } },
      { id: 'trap-hat-closed', label: 'Closed Hat', synth: 'NoiseSynth', duration: '32n', options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
      { id: 'trap-hat-open', label: 'Open Hat', synth: 'NoiseSynth', duration: '8n', options: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0 } } },
      { id: 'trap-snap', label: 'Snap', synth: 'MetalSynth', note: 'A5', duration: '32n', options: { harmonicity: 4, modulationIndex: 12, resonance: 3000, envelope: { attack: 0.001, decay: 0.08, release: 0.04 } } },
      { id: 'trap-sub-zap', label: 'Sub Zap', synth: 'FMSynth', note: 'C3', duration: '16n', options: { harmonicity: 4, modulationIndex: 6 } },
      { id: 'trap-bell', label: 'Bell', synth: 'AMSynth', note: 'C6', duration: '8n', options: {} },
      { id: 'trap-stab', label: 'Stab', synth: 'Synth', note: 'C5', duration: '16n', options: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } } },
    ],
  },
];

export const ELECTRIC_BASS = {
  id: 'electric-bass',
  label: 'Electric Bass',
  synth: 'MembraneSynth',
  note: 'C2',
  duration: '4n',
  options: {
    pitchDecay: 0.05,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.25 },
  },
};

export const CUSTOM_TRACKS_STORAGE_KEY = 'beatbattle:customTracks';
