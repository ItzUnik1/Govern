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

const PINS = 'govern.pins';
const DEFAULT_PINS = ['parliament', 'projects', 'save'];
export function getPins(): string[] {
  try {
    const v = localStorage.getItem(PINS);
    if (v) { const a = JSON.parse(v); if (Array.isArray(a)) return a.filter((x) => typeof x === 'string'); }
  } catch { /* storage unavailable */ }
  return DEFAULT_PINS;
}
export function togglePin(id: string): string[] {
  const cur = getPins();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  try { localStorage.setItem(PINS, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function initPrefs() { applyTextSize(getTextSize()); }
