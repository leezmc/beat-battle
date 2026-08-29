const BEAT_DRAFT_STORAGE_KEY = 'beatbattle:beatDraft';

export function saveBeatDraft(beatDraft) {
  localStorage.setItem(BEAT_DRAFT_STORAGE_KEY, JSON.stringify(beatDraft));
}

export function loadBeatDraft() {
  const savedDraft = localStorage.getItem(BEAT_DRAFT_STORAGE_KEY);
  if (!savedDraft) return null;

  const beatDraft = JSON.parse(savedDraft);
  if (!beatDraft || beatDraft.version !== 1) {
    throw new Error('Unsupported beat draft.');
  }

  return beatDraft;
}
