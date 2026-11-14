// UI preferences (device-local, not part of saved games). All storage access is guarded.
export type TextSize = 's' | 'm' | 'l';
const KEY = 'govern.textSize';

export function getTextSize(): TextSize {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 's' || v === 'm' || v === 'l') return v;
  } catch { /* storage unavailable */ }
  return 'm';
}

export function applyTextSize(t: TextSize) {
  document.documentElement.dataset.text = t;
}

export function setTextSize(t: TextSize) {
  applyTextSize(t);
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export function initPrefs() { applyTextSize(getTextSize()); }
