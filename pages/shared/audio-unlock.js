export function autoInitAudio(audioAdapter) {
  function attempt() {
    audioAdapter.initialize().then(() => {
      document.removeEventListener('pointerdown', attempt);
      document.removeEventListener('keydown', attempt);
    }).catch(() => {});
  }

  attempt();
  document.addEventListener('pointerdown', attempt, { passive: true });
  document.addEventListener('keydown', attempt);
}
