import { applyOrientation } from '../update';
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

export type Orient = 'auto' | 'portrait' | 'landscape';
export function getOrient(): Orient {
  try { const v = localStorage.getItem('govern.orient'); if (v === 'portrait' || v === 'landscape' || v === 'auto') return v; } catch { /* ignore */ }
  return 'auto';
}
export function setOrient(o: Orient) { try { localStorage.setItem('govern.orient', o); } catch { /* ignore */ } applyOrientation(o); }

export type Theme = 'dark' | 'light' | 'contrast';
export function getTheme(): Theme {
  try { const v = localStorage.getItem('govern.theme'); if (v === 'dark' || v === 'light' || v === 'contrast') return v; } catch { /* ignore */ }
  return 'dark';
}
export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('govern.theme', t); } catch { /* ignore */ }
}
export function getFlag(k: string, dflt: boolean): boolean {
  try { const v = localStorage.getItem('govern.' + k); if (v === '1') return true; if (v === '0') return false; } catch { /* ignore */ }
  return dflt;
}
export function setFlag(k: string, v: boolean) { try { localStorage.setItem('govern.' + k, v ? '1' : '0'); } catch { /* ignore */ } }

export function initPrefs() { applyTextSize(getTextSize()); document.documentElement.dataset.theme = getTheme(); applyOrientation(getOrient()); }
