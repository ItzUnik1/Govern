// Small dependency-free SVG charts (work offline, light on the phone's CPU).
import type { HistoryPoint } from '../engine/types';

export function LineChart({ data, years, color = '#4f8cff', fmt = (x: number) => x.toFixed(1), refLine, height = 120 }: {
  data: number[]; years: number[]; color?: string; fmt?: (x: number) => string; refLine?: number; height?: number;
}) {
  const W = 320, H = height, pl = 34, pr = 6, pt = 8, pb = 16;
  if (data.length < 2) return <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>Advance a few months to see the trend.</div>;
  let lo = Math.min(...data), hi = Math.max(...data);
  if (refLine !== undefined) { lo = Math.min(lo, refLine); hi = Math.max(hi, refLine); }
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = (i: number) => pl + (i / (data.length - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const yl = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="#26334f" strokeWidth="0.6" />
          <text x={pl - 4} y={y(t) + 3} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      {refLine !== undefined && <line x1={pl} x2={W - pr} y1={y(refLine)} y2={y(refLine)} stroke="#f5b84b" strokeDasharray="3 3" strokeWidth="0.9" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {yl.map((i) => (
        <text key={i} x={x(i)} y={H - 3} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{years[i]}</text>
      ))}
    </svg>
  );
}

export type SeriesKey = 'growth' | 'inflation' | 'unemployment' | 'debtPct' | 'balancePct' | 'approval' | 'stability' | 'confidence' | 'currency' | 'rate' | 'gdp';
export const series = (h: HistoryPoint[], k: SeriesKey) => ({ data: h.map((p) => p[k] as number), years: h.map((p) => p.y) });

export function StackBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', background: '#1a2640' }}>
        {parts.map((p) => <i key={p.label} style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="row wrap" style={{ marginTop: 8, gap: '4px 12px' }}>
        {parts.map((p) => (
          <span key={p.label} className="tiny"><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 5 }} />{p.label} {p.value.toFixed(1)}%</span>
        ))}
      </div>
    </div>
  );
}
