import { Sounds } from './sounds.js';
import { DRUM_TRACK_IDS, PIANO_TRACK_ID, normalizeTrackMix, normalizeMasterMix } from './track-mix.mjs';

const Tone = window.Tone;

const DRUM_SOUND_BY_ID = {
  kick: Sounds.Kick,
  snare: Sounds.Snare,
  hihat: Sounds.HiHat,
};

function filterHz(value) {
  return 200 * (100 ** value);
}

function limiterThresholdDb(value) {
  return -24 * value;
}

export class AudioEngineAdapter {
  constructor() {
    Tone.Transport.bpm.value = 120;

    this.limiter = new Tone.Limiter(0).toDestination();
    this.masterGain = new Tone.Gain(1).connect(this.limiter);
    this.reverb = new Tone.Reverb({ decay: 1.6, preDelay: 0.02, wet: 1 });
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.28, wet: 1 });
    this.reverb.connect(this.masterGain);
    this.delay.connect(this.masterGain);

    this.channels = new Map();
    this.sampleInstruments = {};
    this._repeatEventId = null;
    this._runId = 0;
    this._initialized = false;

    this.synthPlayer = new Tone.PolySynth(Tone.Synth);
    this.synthPlayer.disconnect();
    this.synthPlayer.connect(this.ensureChannel(PIANO_TRACK_ID).filter);

    this.players = {};
    for (const id of DRUM_TRACK_IDS) {
      const player = new Tone.Player(Sounds.BasePath + DRUM_SOUND_BY_ID[id]);
      player.disconnect();
      player.connect(this.ensureChannel(id).filter);
      this.players[DRUM_SOUND_BY_ID[id]] = player;
    }
  }

  ensureChannel(trackId) {
    let channel = this.channels.get(trackId);
    if (channel) return channel;

    const filter = new Tone.Filter(20000, 'lowpass');
    const volume = new Tone.Gain(1);
    const reverbSend = new Tone.Gain(0);
    const delaySend = new Tone.Gain(0);

    // 1. source -> filter -> volume -> master (dry)
    // 2. reverb send -> shared reverb -> master
    // 3. delay send  -> shared delay  -> master

    filter.connect(volume);
    volume.connect(this.masterGain);
    volume.connect(reverbSend);
    volume.connect(delaySend);
    reverbSend.connect(this.reverb);
    delaySend.connect(this.delay);

    channel = { filter, volume, reverbSend, delaySend };
    this.channels.set(trackId, channel);
    this.applyChannelMix(trackId, normalizeTrackMix());
    return channel;
  }

  applyChannelMix(trackId, mix) {
    const channel = this.ensureChannel(trackId);
    const next = normalizeTrackMix(mix);
    channel.volume.gain.value = next.mute ? 0 : next.volume;
    channel.reverbSend.gain.value = next.reverb;
    channel.delaySend.gain.value = next.delay;
    channel.filter.frequency.value = filterHz(next.filter);
  }

  applyMasterMix(mix = {}) {
    const next = normalizeMasterMix(mix);
    this.masterGain.gain.value = next.volume;
    this.limiter.threshold.value = limiterThresholdDb(next.limiter);
  }

  applyTrackMix(trackMix = {}) {
    const ids = new Set([...DRUM_TRACK_IDS, PIANO_TRACK_ID, ...Object.keys(trackMix)]);
    for (const id of ids) {
      this.applyChannelMix(id, trackMix[id]);
    }
  }

  async initialize() {
    await Tone.start();
    if (this._initialized) return;
    if (this.reverb.generate) await this.reverb.generate();
    else if (this.reverb.ready) await this.reverb.ready;
    await Tone.loaded();
    this._initialized = true;
  }

  playSound(soundEnum, time) {
    this.players[soundEnum].start(time);
  }

  playSynthNote(note, durationInSteps, time) {
    const durationSecs = Tone.Time('16n').toSeconds() * durationInSteps;
    this.synthPlayer.triggerAttackRelease(note, durationSecs, time);
  }

  playSample(sampleDef, time) {
    let instrument = this.sampleInstruments[sampleDef.id];
    if (!instrument) {
      const SynthClass = Tone[sampleDef.synth];
      instrument = new SynthClass(sampleDef.options || {});
      instrument.disconnect();
      instrument.connect(this.ensureChannel(sampleDef.id).filter);
      this.sampleInstruments[sampleDef.id] = instrument;
    }

    if (sampleDef.note) {
      instrument.triggerAttackRelease(sampleDef.note, sampleDef.duration || '8n', time);
    } else {
      instrument.triggerAttackRelease(sampleDef.duration || '8n', time);
    }
  }

  setBPM(newBPM) {
    Tone.Transport.bpm.value = newBPM;
  }

  scheduleUIUpdate(time, uiCallback) {
    const runId = this._runId;
    Tone.Draw.schedule(() => {
      if (runId !== this._runId) return;
      uiCallback();
    }, time);
  }

  startSequencer(onStepCallback, total_steps) {
    this.stopSequencer();
    const runId = this._runId;
    let step = 0;

    this._repeatEventId = Tone.Transport.scheduleRepeat((time) => {
      if (runId !== this._runId) return;
      onStepCallback(time, step);
      step = (step + 1) % total_steps;
    }, '16n');

    Tone.Transport.start();
  }

  stopSequencer() {
    this._runId += 1;
    if (this._repeatEventId != null) {
      Tone.Transport.clear(this._repeatEventId);
      this._repeatEventId = null;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Draw.cancel();
    Tone.Transport.position = 0;
  }
}
