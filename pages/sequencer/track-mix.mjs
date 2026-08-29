export const DRUM_TRACK_IDS = ['kick', 'snare', 'hihat'];
export const PIANO_TRACK_ID = 'piano';

export const DEFAULT_TRACK_MIX = Object.freeze({
  volume: 1,
  mute: false,
  reverb: 0,
  delay: 0,
  filter: 1,
});

export function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function normalizeTrackMix(mix = {}) {
  return {
    volume: clamp01(mix.volume, DEFAULT_TRACK_MIX.volume),
    mute: Boolean(mix.mute),
    reverb: clamp01(mix.reverb, DEFAULT_TRACK_MIX.reverb),
    delay: clamp01(mix.delay, DEFAULT_TRACK_MIX.delay),
    filter: clamp01(mix.filter, DEFAULT_TRACK_MIX.filter),
  };
}

export function copyTrackMix(trackMix = {}, extraIds = []) {
  const ids = [...DRUM_TRACK_IDS, PIANO_TRACK_ID, ...extraIds];
  const copied = {};
  for (const id of ids) {
    if (!id || copied[id]) continue;
    copied[id] = normalizeTrackMix(trackMix[id]);
  }
  return copied;
}
