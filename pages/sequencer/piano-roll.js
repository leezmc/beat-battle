import { PIANO_NOTES, UI_CONSTANTS } from './config.js';

export class PianoRoll {
  constructor(canvasId, onNoteAdded) {
    this.onNoteAdded = onNoteAdded || (() => {});
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.height = PIANO_NOTES.length * UI_CONSTANTS.MIN_ROW_HEIGHT;

    this.stepCount = 0;
    this.currentPlayStep = -1;
    this.pianoNotes = [];

    this.isDragging = false;
    this.isResizing = false;
    this.dragStartCol = -1;
    this.dragStartRow = -1;
    this.dragDuration = 1;

    this._bindEvents();
  }

  resizeSteps(newStepCount) {
    const oldNotes = this.pianoNotes;
    this.stepCount = newStepCount;

    this.pianoNotes = Array(PIANO_NOTES.length).fill().map((_, row) => {
      const newRow = Array(this.stepCount).fill().map(() => ({ active: false, duration: 1 }));
      if (oldNotes.length > 0) {
        for (let col = 0; col < Math.min(oldNotes[row].length, this.stepCount); col++) {
          newRow[col] = oldNotes[row][col];
        }
      }
      return newRow;
    });

    const { LABEL_WIDTH, MIN_CELL_WIDTH } = UI_CONSTANTS;
    this.canvas.width = Math.max(750, LABEL_WIDTH + this.stepCount * MIN_CELL_WIDTH);

    this.draw();
  }

  clear() {
    this.pianoNotes.forEach(row => row.forEach(note => {
      note.active = false;
      note.duration = 1;
    }));
    this.draw();
  }

  loadNotes(notes) {
    notes.forEach(({ note, step, duration = 1 }) => {
      const row = PIANO_NOTES.indexOf(note);
      if (row === -1 || step < 0 || step >= this.stepCount) return;
      this.pianoNotes[row][step] = { active: true, duration };
    });
    this.draw();
  }

  setPlayhead(stepIndex) {
    if (stepIndex === this.currentPlayStep) return;
    this.currentPlayStep = stepIndex;
    this.draw();
  }

  getActiveNotes(stepIndex) {
    const activeNotes = [];
    for (let row = 0; row < PIANO_NOTES.length; row++) {
      const noteData = this.pianoNotes[row][stepIndex];
      if (noteData.active) {
        activeNotes.push({
          note: PIANO_NOTES[row],
          duration: noteData.duration
        });
      }
    }
    return activeNotes;
  }

  draw() {
    const { LABEL_WIDTH } = UI_CONSTANTS;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const gridWidth = this.canvas.width - LABEL_WIDTH;
    const cellWidth = gridWidth / this.stepCount;
    const cellHeight = this.canvas.height / PIANO_NOTES.length;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "bold 11px sans-serif";

    for (let row = 0; row < PIANO_NOTES.length; row++) {
      const y = row * cellHeight;
      this.ctx.fillStyle = row % 2 === 0 ? '#1a1a2e' : '#12121e';
      this.ctx.fillRect(0, y, LABEL_WIDTH, cellHeight);
      this.ctx.fillStyle = '#8888a0';
      this.ctx.fillText(PIANO_NOTES[row], LABEL_WIDTH / 2, y + (cellHeight / 2));

      this.ctx.strokeStyle = '#2a2a45';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + cellHeight);
      this.ctx.lineTo(this.canvas.width, y + cellHeight);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = '#4fc3f7';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(LABEL_WIDTH, 0);
    this.ctx.lineTo(LABEL_WIDTH, this.canvas.height);
    this.ctx.stroke();

    this.ctx.lineWidth = 1;
    for (let col = 0; col <= this.stepCount; col++) {
      this.ctx.strokeStyle = col % 4 === 0 ? '#4fc3f7' : '#2a2a45';
      this.ctx.beginPath();
      this.ctx.moveTo(LABEL_WIDTH + (col * cellWidth), 0);
      this.ctx.lineTo(LABEL_WIDTH + (col * cellWidth), this.canvas.height);
      this.ctx.stroke();
    }

    for (let row = 0; row < PIANO_NOTES.length; row++) {
      for (let col = 0; col < this.stepCount; col++) {
        const note = this.pianoNotes[row][col];
        if (note.active) {
          const x = LABEL_WIDTH + (col * cellWidth);
          const y = row * cellHeight;
          const width = cellWidth * note.duration;

          this.ctx.fillStyle = '#00ff87';
          this.ctx.fillRect(x + 1, y + 1, width - 2, cellHeight - 2);
        }
      }
    }

    if (this.isDragging) {
      const x = LABEL_WIDTH + (this.dragStartCol * cellWidth);
      const y = this.dragStartRow * cellHeight;
      const width = cellWidth * this.dragDuration;

      this.ctx.fillStyle = 'rgba(0, 255, 135, 0.5)';
      this.ctx.fillRect(x + 1, y + 1, width - 2, cellHeight - 2);
    }

    if (this.currentPlayStep >= 0) {
      const playheadX = LABEL_WIDTH + (this.currentPlayStep * cellWidth);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(playheadX, 0);
      this.ctx.lineTo(playheadX, this.canvas.height);
      this.ctx.stroke();
    }
  }

  _bindEvents() {
    const { LABEL_WIDTH } = UI_CONSTANTS;

    this.canvas.addEventListener('pointerdown', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      const x = rawX - LABEL_WIDTH;

      if (x < 0) return;

      const gridWidth = this.canvas.width - LABEL_WIDTH;
      const cellWidth = gridWidth / this.stepCount;
      const cellHeight = this.canvas.height / PIANO_NOTES.length;
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      if (row >= 0 && row < PIANO_NOTES.length && col >= 0 && col < this.stepCount) {
        let clickedNoteStartCol = -1;
        for (let c = col; c >= 0; c--) {
          if (this.pianoNotes[row][c].active && c + this.pianoNotes[row][c].duration > col) {
            clickedNoteStartCol = c;
            break;
          }
        }

        if (clickedNoteStartCol !== -1) {
          const note = this.pianoNotes[row][clickedNoteStartCol];
          const noteRightEdgePixel = (clickedNoteStartCol + note.duration) * cellWidth;

          if (noteRightEdgePixel - x < 15) {
            this.isResizing = true;
            this.dragStartCol = clickedNoteStartCol;
            this.dragStartRow = row;
          } else {
            note.active = false;
            this.draw();
          }
        } else {
          this.isDragging = true;
          this.dragStartCol = col;
          this.dragStartRow = row;
          this.dragDuration = 1;
          this.draw();
        }
      }
    });

    this.canvas.addEventListener('pointermove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      const x = rawX - LABEL_WIDTH;

      const gridWidth = this.canvas.width - LABEL_WIDTH;
      const cellWidth = gridWidth / this.stepCount;
      const cellHeight = this.canvas.height / PIANO_NOTES.length;
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      if (!this.isDragging && !this.isResizing) {
        let cursor = 'default';
        if (x >= 0 && row >= 0 && row < PIANO_NOTES.length && col >= 0 && col < this.stepCount) {
          for (let c = col; c >= 0; c--) {
            if (this.pianoNotes[row][c].active && c + this.pianoNotes[row][c].duration > col) {
              const edgeX = (c + this.pianoNotes[row][c].duration) * cellWidth;
              cursor = (edgeX - x < 15) ? 'ew-resize' : 'pointer';
              break;
            }
          }
        }
        this.canvas.style.cursor = cursor;
        return;
      }

      if (x < 0) return;

      let maxDuration = this.stepCount - this.dragStartCol;
      for (let c = this.dragStartCol + 1; c < this.stepCount; c++) {
        if (this.pianoNotes[this.dragStartRow][c].active && c !== this.dragStartCol) {
          maxDuration = c - this.dragStartCol;
          break;
        }
      }

      const rawDuration = col - this.dragStartCol + 1;
      this.dragDuration = Math.max(1, Math.min(rawDuration, maxDuration));

      if (this.isResizing) {
        this.pianoNotes[this.dragStartRow][this.dragStartCol].duration = this.dragDuration;
      }

      this.draw();
    });

    window.addEventListener('pointerup', () => {
      if (!this.isDragging && !this.isResizing) return;

      if (this.isDragging) {
        this.pianoNotes[this.dragStartRow][this.dragStartCol].active = true;
        this.pianoNotes[this.dragStartRow][this.dragStartCol].duration = this.dragDuration;
        this.onNoteAdded(PIANO_NOTES[this.dragStartRow], this.dragDuration);
      }

      this.isDragging = false;
      this.isResizing = false;
      this.dragStartCol = -1;
      this.dragStartRow = -1;
      this.dragDuration = 1;

      this.draw();
    });
  }
}
