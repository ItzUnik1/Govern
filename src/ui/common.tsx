import type { ReactNode } from 'react';
import type { GameState } from '../engine/types';

export const fmtPct = (x: number, d = 1) => `${x.toFixed(d)}%`;
/** Signed number with a true minus sign (U+2212). Values that round to zero show without a sign. */
export const fmtSigned = (x: number, d = 1) => {
  const r = Number(x.toFixed(d));
  return r === 0 ? (0).toFixed(d) : `${r > 0 ? '+' : '\u2212'}${Math.abs(r).toFixed(d)}`;
};

/** USD billions → "$1.23 trn" / "$456 bn" */
export function fmtMoney(bn: number, d = 1): string {
  const sign = bn < 0 ? '\u2212' : '';
  const a = Math.abs(bn);
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(2)} trn`;
  if (a >= 100) return `${sign}$${a.toFixed(0)} bn`;
  if (a >= 10) return `${sign}$${a.toFixed(d)} bn`;
  if (a >= 1) return `${sign}$${a.toFixed(2)} bn`;
  return `${sign}$${(a * 1000).toFixed(0)} m`;
}

export const Card = ({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) => (
  <div className="card">
    {title && (
      <div className="row between"><h3>{title}</h3>{right}</div>
    )}
    {children}
  </div>
);

export const Stat = ({ label, value, sub, cls }: { label: string; value: ReactNode; sub?: ReactNode; cls?: string }) => (
  <div className="stat">
    <div className="l">{label}</div>
    <div className={`v ${cls ?? ''}`}>{value}</div>
    {sub !== undefined && <div className="s">{sub}</div>}
  </div>
);

export const Bar = ({ value, max = 100, tone }: { value: number; max?: number; tone?: 'good' | 'bad' | 'warn' }) => (
  <div className={`bar ${tone ?? ''}`}><i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></div>
);

export const Seg = <T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) => (
  <div className="seg">
    {options.map((o) => (
      <button key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
    ))}
  </div>
);

export const toneFor = (v: number, good: number, bad: number): 'good' | 'bad' | 'warn' => (v >= good ? 'good' : v <= bad ? 'bad' : 'warn');

export const Stars = ({ n }: { n: number }) => <span className="stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export function stability_label(s: GameState): string {
  return s.stability >= 70 ? 'Stable' : s.stability >= 50 ? 'Steady' : s.stability >= 35 ? 'Fragile' : 'Volatile';
}
