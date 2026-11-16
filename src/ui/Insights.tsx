import { debtPct, fiscal, getCountry } from '../engine/sim';
import type { GameState } from '../engine/types';
import { Card } from './common';
import { series, type SeriesKey } from './charts';
import type { Ctx, Tab } from './ctx';

interface Rec { who: string; ico: string; text: string; go?: [Tab, string?]; label?: string }

/** Three advisers, each giving at most one prioritised, actionable recommendation. */
export function advice(s: GameState): Rec[] {
  const c = getCountry(s);
  const f = fiscal(s);
  const out: Rec[] = [];
  // Treasury
  if (s.inflation > c.inflationTarget + 2) out.push({ who: 'Treasury', ico: '💷', text: `Inflation is ${s.inflation.toFixed(1)}%, well above target. Cut the deficit or avoid tax cuts and new spending until it eases.`, go: ['government'], label: 'Open budget' });
  else if (s.growth < 0 || s.unemployment > c.unemployment0 + 2) out.push({ who: 'Treasury', ico: '💷', text: 'The economy is weak. A short stimulus (infrastructure or welfare) can help, but check how much debt you can afford.', go: ['government'], label: 'Open budget' });
  else if (f.deficitPct > Math.max(4, c.deficitPct0 + 1.5)) out.push({ who: 'Treasury', ico: '💷', text: `The deficit is ${f.deficitPct.toFixed(1)}% of GDP. Plan a gradual fix: small tax rises or spending trims hurt less than a crisis later.`, go: ['government'], label: 'Open budget' });
  else out.push({ who: 'Treasury', ico: '💷', text: 'Public finances look steady. Good time to invest in schools, health or infrastructure that pays back over years.', go: ['build', 'projects'], label: 'See projects' });
  // Political
  if (s.approval < 35) out.push({ who: 'Political', ico: '🗳️', text: `Approval is ${s.approval.toFixed(0)}%. Voters are unhappy: ease the tax burden, fix visible problems and avoid unpopular bills.`, go: ['politics', 'elections'], label: 'Check polls' });
  else if (s.monthsToElection <= 12) out.push({ who: 'Political', ico: '🗳️', text: `Election in ${s.monthsToElection} months. Campaign, keep promises and avoid shocks.`, go: ['politics', 'elections'], label: 'Elections' });
  else if (!s.pol.inGovernment) out.push({ who: 'Political', ico: '🗳️', text: 'You are in opposition. Build support and prepare for the next election.', go: ['politics', 'parliament'], label: 'Parliament' });
  else out.push({ who: 'Political', ico: '🗳️', text: 'Your position is secure. Use the time to pass reforms before the next campaign begins.', go: ['politics', 'laws'], label: 'Laws & bills' });
  // Foreign
  if (s.currency < 90 || s.confidence < 40) out.push({ who: 'Foreign', ico: '🌍', text: 'Investors and the currency are nervous. Steady relations, trade deals and credible policy restore confidence.', go: ['world'], label: 'Open diplomacy' });
  else out.push({ who: 'Foreign', ico: '🌍', text: 'The external picture is calm. Strengthen trade ties and organisations while relations are good.', go: ['world'], label: 'Open diplomacy' });
  return out;
}

export function Advisers({ s, go }: Ctx) {
  return (
    <>
      <div className="small muted">Your advisers give one priority each. They advise; you decide.</div>
      {advice(s).map((r) => (
        <Card key={r.who} title={`${r.ico} ${r.who} adviser`}>
          <div className="small">{r.text}</div>
          {r.go && <button className="btn sec small" style={{ marginTop: 8 }} onClick={() => go(r.go![0], r.go![1])}>{r.label}</button>}
        </Card>
      ))}
    </>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <svg className="spark" />;
  const lo = Math.min(...data), hi = Math.max(...data), r = hi - lo || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(22 - ((v - lo) / r) * 20).toFixed(1)}`).join(' ');
  return <svg className="spark" viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>;
}

const ROWS: { k: SeriesKey; label: string; unit: string; goodUp: boolean | null; dp: number }[] = [
  { k: 'approval', label: 'Approval', unit: '%', goodUp: true, dp: 0 },
  { k: 'stability', label: 'Stability', unit: '', goodUp: true, dp: 0 },
  { k: 'growth', label: 'GDP growth', unit: '%', goodUp: true, dp: 1 },
  { k: 'inflation', label: 'Inflation', unit: '%', goodUp: false, dp: 1 },
  { k: 'unemployment', label: 'Unemployment', unit: '%', goodUp: false, dp: 1 },
  { k: 'debtPct', label: 'Debt / GDP', unit: '%', goodUp: false, dp: 0 },
  { k: 'balancePct', label: 'Budget balance', unit: '%', goodUp: true, dp: 1 },
  { k: 'gdppc', label: 'GDP per head', unit: '', goodUp: true, dp: 0 },
  { k: 'currency', label: 'Currency', unit: '', goodUp: true, dp: 0 },
  { k: 'confidence', label: 'Confidence', unit: '', goodUp: true, dp: 0 },
];

export function Stats({ s }: Ctx) {
  const h = s.history;
  void debtPct;
  return (
    <>
      <div className="small muted">Since you took office, with the change over the last 12 months.</div>
      {ROWS.map((r) => {
        const { data } = series(h, r.k);
        const now = data.length ? data[data.length - 1] : 0;
        const first = data.length ? data[0] : 0;
        const yr = data.length > 12 ? data[data.length - 13] : first;
        const ch = now - yr;
        const tone = r.goodUp === null || Math.abs(ch) < 0.05 ? '' : (ch > 0) === r.goodUp ? 'good' : 'bad';
        return (
          <Card key={r.k}>
            <div className="row between"><b>{r.label}</b><span><b>{now.toFixed(r.dp)}{r.unit}</b> <span className={`small ${tone}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(r.dp)}</span></span></div>
            <Spark data={data} color={tone === 'bad' ? 'var(--bad)' : tone === 'good' ? 'var(--good)' : 'var(--accent)'} />
            <div className="tiny muted">Start {first.toFixed(r.dp)}{r.unit} · low {Math.min(...(data.length ? data : [0])).toFixed(r.dp)} · high {Math.max(...(data.length ? data : [0])).toFixed(r.dp)}</div>
          </Card>
        );
      })}
    </>
  );
}
