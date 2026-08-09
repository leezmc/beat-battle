class BeatOrchestrator {
  constructor(audioAdapter) {
    this.audio = audioAdapter;
    this.targetDurationSeconds = 30;
    this.totalSteps = 0;
    this.tracks = {};
    this.uiSteps = [];
  }

  calculateSteps() {
    const bpm = this.audio.getBPM();
    const beatsPerSecond = bpm / 60;
    const totalBeats = beatsPerSecond * this.targetDurationSeconds;

    this.totalSteps = Math.floor(totalBeats * 4);
  }

  initTracks() {
    this.calculateSteps();

    this.tracks = {
      kick: Array(this.totalSteps).fill(false)
    };
  }
}
