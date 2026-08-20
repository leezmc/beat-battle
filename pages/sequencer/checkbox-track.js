export function buildCheckboxTrack(trackEl, steps, prevChecked) {
  while (trackEl.children.length > 1) trackEl.removeChild(trackEl.lastChild);

  return Array.from({ length: steps }, (_, step) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(prevChecked && prevChecked[step]);
    trackEl.appendChild(checkbox);
    return checkbox;
  });
}
