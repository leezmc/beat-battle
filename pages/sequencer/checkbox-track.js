export function buildCheckboxTrack(trackEl, steps, prevChecked, onCheck) {
  while (trackEl.children.length > 1) trackEl.removeChild(trackEl.lastChild);

  return Array.from({ length: steps }, (_, step) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!prevChecked?.[step];
    if (onCheck) {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) onCheck(step);
      });
    }
    trackEl.appendChild(checkbox);
    return checkbox;
  });
}
