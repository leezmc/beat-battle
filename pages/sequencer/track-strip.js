import { normalizeTrackMix } from './track-mix.mjs';

let openFx = null;

function percent(value) {
  return String(Math.round(value * 100));
}

function volumeSlider(value) {
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'track-volume-input';
  input.min = '0';
  input.max = '100';
  input.value = percent(value);
  input.title = 'Volume';
  input.setAttribute('aria-label', 'Volume');
  return input;
}

function fxSlider(labelText, value) {
  const wrap = document.createElement('label');
  wrap.className = 'track-strip-slider';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = percent(value);
  wrap.append(caption, input);
  return { wrap, input };
}

function placePanel(panel, anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = 200;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  let top = rect.bottom + 6;
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  const panelHeight = panel.getBoundingClientRect().height;
  if (top + panelHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - panelHeight - 6);
    panel.style.top = `${top}px`;
  }
}

export function createTrackStrip({ label, mix, onChange, hideLabel = false }) {
  const state = normalizeTrackMix(mix);

  const root = document.createElement('div');
  root.className = 'track-strip';

  if (!hideLabel) {
    const name = document.createElement('span');
    name.className = 'track-strip-name';
    name.textContent = label;
    name.title = label;
    root.appendChild(name);
  }

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'track-mute-btn';
  muteBtn.textContent = 'M';
  muteBtn.title = 'Mute track';

  const volume = volumeSlider(state.volume);

  const fxBtn = document.createElement('button');
  fxBtn.type = 'button';
  fxBtn.className = 'track-fx-btn';
  fxBtn.textContent = 'FX';
  fxBtn.title = 'Open effects: reverb, delay, filter';

  root.append(muteBtn, volume, fxBtn);

  const fxPanel = document.createElement('div');
  fxPanel.className = 'track-fx-popover';
  fxPanel.hidden = true;

  const heading = document.createElement('p');
  heading.className = 'track-fx-popover-title';
  heading.textContent = `${label || 'Track'} effects`;
  fxPanel.appendChild(heading);

  const reverb = fxSlider('Reverb', state.reverb);
  const delay = fxSlider('Delay', state.delay);
  const filter = fxSlider('Filter', state.filter);
  fxPanel.append(reverb.wrap, delay.wrap, filter.wrap);
  document.body.appendChild(fxPanel);

  function sync() {
    muteBtn.classList.toggle('is-muted', state.mute);
    muteBtn.setAttribute('aria-pressed', String(state.mute));
    root.classList.toggle('is-muted', state.mute);
    volume.value = percent(state.volume);
    reverb.input.value = percent(state.reverb);
    delay.input.value = percent(state.delay);
    filter.input.value = percent(state.filter);
  }

  function emit() {
    sync();
    onChange(normalizeTrackMix(state));
  }

  function closeFx() {
    fxPanel.hidden = true;
    fxBtn.classList.remove('is-open');
    if (openFx?.panel === fxPanel) openFx = null;
  }

  function openFxPanel() {
    openFx?.close();
    fxPanel.hidden = false;
    fxBtn.classList.add('is-open');
    placePanel(fxPanel, fxBtn);
    openFx = { panel: fxPanel, button: fxBtn, close: closeFx };
  }

  muteBtn.addEventListener('click', () => {
    state.mute = !state.mute;
    emit();
  });

  volume.addEventListener('input', () => {
    state.volume = Number(volume.value) / 100;
    emit();
  });

  reverb.input.addEventListener('input', () => {
    state.reverb = Number(reverb.input.value) / 100;
    emit();
  });
  delay.input.addEventListener('input', () => {
    state.delay = Number(delay.input.value) / 100;
    emit();
  });
  filter.input.addEventListener('input', () => {
    state.filter = Number(filter.input.value) / 100;
    emit();
  });

  fxBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (fxPanel.hidden) openFxPanel();
    else closeFx();
  });

  sync();

  return {
    root,
    setMix(next) {
      Object.assign(state, normalizeTrackMix(next));
      sync();
    },
  };
}

document.addEventListener('click', (event) => {
  if (!openFx) return;
  if (openFx.panel.contains(event.target) || openFx.button.contains(event.target)) return;
  openFx.close();
});

window.addEventListener('scroll', () => openFx?.close(), true);
window.addEventListener('resize', () => openFx?.close());
