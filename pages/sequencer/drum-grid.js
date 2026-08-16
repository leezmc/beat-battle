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

    this.kickBoxes = this._buildDrumTrack(this.kickTrack, previousDrums.kick);
    this.snareBoxes = this._buildDrumTrack(this.snareTrack, previousDrums.snare);
    this.hihatBoxes = this._buildDrumTrack(this.hihatTrack, previousDrums.hihat);
  }

  _buildDrumTrack(track, previousValues) {
    while (track.children.length > 1) track.removeChild(track.lastChild);
    return Array.from({ length: this.stepCount }, (_, step) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(previousValues && previousValues[step]);
      track.appendChild(checkbox);
      return checkbox;
    });
  }

  clear() {
    [...this.kickBoxes, ...this.snareBoxes, ...this.hihatBoxes].forEach((box) => {
      box.checked = false;
    });
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
