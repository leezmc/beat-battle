export function autoInitAudio(audioAdapter) {
  let started = false;

  function attempt() {
    audioAdapter.initialize().then(() => {
      started = true;
      document.removeEventListener('pointerdown', attempt);
      document.removeEventListener('keydown', attempt);
    }).catch(() => {});
  }

  attempt();
  document.addEventListener('pointerdown', attempt, { passive: true });
  document.addEventListener('keydown', attempt);

  return () => started;
}
