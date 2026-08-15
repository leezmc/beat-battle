import { Sounds } from './sounds.js';
import * as Tone from 'https://unpkg.com/tone?module';

export class AudioEngineAdapter {
  constructor() {
    Tone.Transport.bpm.value = 120;

    this.synthPlayer = new Tone.PolySynth(Tone.Synth).toDestination();

    this.players = {
      [Sounds.Kick]: new Tone.Player(Sounds.BasePath + Sounds.Kick).toDestination(),
      [Sounds.Snare]: new Tone.Player(Sounds.BasePath + Sounds.Snare).toDestination(),
      [Sounds.HiHat]: new Tone.Player(Sounds.BasePath + Sounds.HiHat).toDestination()
    };
  }

  async initialize() {
    await Tone.start();
    await Tone.loaded();
  }

  playSound(soundEnum, time) {
    const player = this.players[soundEnum];
    if (player) player.restart(time);
  }

  playSynthNotes(notes, time) {
    this.synthPlayer.triggerAttackRelease(notes, "16n", time);
  }

  setBPM(newBPM) {
    Tone.Transport.bpm.value = newBPM;
  }

  scheduleUIUpdate(time, uiCallback) {
    Tone.Draw.schedule(uiCallback, time);
  }

  startSequencer(onStepCallback, total_steps) {
    let step = 0;

    Tone.Transport.scheduleRepeat((time) => {
      onStepCallback(time, step);
      step = (step + 1) % total_steps;
    }, "16n");

    Tone.Transport.start();
  }

  stopSequencer() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }
}
