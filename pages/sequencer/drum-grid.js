import { buildCheckboxTrack } from './checkbox-track.js';

export class DrumGrid {
  constructor() {
    this.kickTrack = document.getElementById('kick-track');
    this.snareTrack = document.getElementById('snare-track');
    this.hihatTrack = document.getElementById('hihat-track');

    this.kickBoxes = [];
    this.snareBoxes = [];
    this.hihatBoxes = [];
    this.stepCount = 0;
  }

  buildGrid(newStepCount) {
    // save previous states in case the user is just changing the step count
    const previousDrums = {
      kick: this.kickBoxes.map((box) => box.checked),
      snare: this.snareBoxes.map((box) => box.checked),
      hihat: this.hihatBoxes.map((box) => box.checked),
    };

    this.stepCount = newStepCount;

    this.kickBoxes = buildCheckboxTrack(this.kickTrack, this.stepCount, previousDrums.kick);
    this.snareBoxes = buildCheckboxTrack(this.snareTrack, this.stepCount, previousDrums.snare);
    this.hihatBoxes = buildCheckboxTrack(this.hihatTrack, this.stepCount, previousDrums.hihat);
  }

  clear() {
    [...this.kickBoxes, ...this.snareBoxes, ...this.hihatBoxes].forEach((box) => {
      box.checked = false;
    });
  }

  loadPattern({ kick = [], snare = [], hihat = [] } = {}) {
    kick.forEach(step => { if (this.kickBoxes[step]) this.kickBoxes[step].checked = true; });
    snare.forEach(step => { if (this.snareBoxes[step]) this.snareBoxes[step].checked = true; });
    hihat.forEach(step => { if (this.hihatBoxes[step]) this.hihatBoxes[step].checked = true; });
  }

  clearHighlights() {
    [...this.kickBoxes, ...this.snareBoxes, ...this.hihatBoxes].forEach((box) => {
      box.classList.remove('playing');
    });
  }

  highlightPlayingStep(stepIndex) {
    this.clearHighlights();
    this.kickBoxes[stepIndex].classList.add('playing');
    this.snareBoxes[stepIndex].classList.add('playing');
    this.hihatBoxes[stepIndex].classList.add('playing');
  }

  getActiveDrums(stepIndex) {
    return {
      kick: this.kickBoxes[stepIndex].checked,
      snare: this.snareBoxes[stepIndex].checked,
      hihat: this.hihatBoxes[stepIndex].checked,
    };
  }
}
