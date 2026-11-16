import { useState } from 'react';
import { COUNTRY_LIST } from '../engine/countries';
import { autoInfo, listSlots, loadSlot } from '../engine/save';
import { DIFFICULTY_PRESETS, newGame } from '../engine/sim';
import { SYSTEMS } from '../engine/parties';
import type { CountryDef, Difficulty, GameState } from '../engine/types';
import { Card, Seg, Stars, fmtMoney } from './common';

type Step = 'title' | 'select' | 'detail' | 'difficulty' | 'party' | 'load';

export default function Title({ onStart, onLoad }: { onStart: (s: GameState) => void; onLoad: (s: GameState) => void }) {
  const [step, setStep] = useState<Step>('title');
  const [country, setCountry] = useState<CountryDef | null>(null);
  const [diff, setDiff] = useState<Difficulty>(DIFFICULTY_PRESETS.standard);
  const auto = autoInfo();

  if (step === 'title') {
    return (
      <div className="title-screen">
        <img className="logo" src="/logo.png" alt="GOVERN – Political Simulation" width={220} height={220} />
        <h1 className="sr">GOVERN</h1>
        <p className="muted">Lead a nation. Make hard choices. Build a legacy.</p>
        <button className="btn big" onClick={() => setStep('select')}>New career</button>
        <button className="btn sec big" disabled={auto.empty || auto.corrupt} onClick={() => { const g = loadSlot('auto'); if (g) onLoad(g); }}>
          {auto.empty ? 'Continue (no autosave yet)' : `Continue – ${auto.flag} ${auto.country}, ${auto.date}`}
        </button>
        <button className="btn sec big" onClick={() => setStep('load')}>Load game</button>
        <p className="tiny muted">Works fully offline</p>
      </div>
    );
  }
  if (step === 'load') {
    const slots = listSlots();
    return (
      <div className="page">
        <button className="back" onClick={() => setStep('title')}>‹ Back</button>
        <h2>Load game</h2>
        {slots.map((sl) => (
          <button key={String(sl.slot)} className="country-card" disabled={sl.empty || sl.corrupt} onClick={() => { const g = loadSlot(sl.slot as number); if (g) onLoad(g); }}>
            <span className="fl">{sl.empty ? '▫️' : sl.flag}</span>
            <div><b>Slot {sl.slot}{sl.empty ? ' – empty' : sl.corrupt ? ' – corrupt' : `: ${sl.country}`}</b>{!sl.empty && !sl.corrupt && <div className="small muted">{sl.date} · term {sl.term} · approval {sl.approval?.toFixed(0)}%</div>}</div>
          </button>
        ))}
      </div>
    );
  }
  if (step === 'select') {
    return (
      <div className="page">
        <button className="back" onClick={() => setStep('title')}>‹ Back</button>
        <h2>Choose your country</h2>
        <div className="country-grid">{COUNTRY_LIST.map((c) => (
          <button key={c.id} className="country-card" onClick={() => { setCountry(c); setStep('detail'); }}>
            <span className="fl">{c.flag}</span>
            <div style={{ flex: 1 }}>
              <b>{c.name}</b> <span className="muted small">· {c.title}</span>
              <div className="small muted">{c.devLevel} · pop {c.population >= 1000 ? (c.population / 1000).toFixed(2) + ' bn' : c.population + ' m'} · GDP {fmtMoney(c.gdp)}</div>
              <div className="small"><Stars n={c.difficultyStars} /> <span className="muted">difficulty</span></div>
            </div>
          </button>
        ))}</div>
        <div className="tiny muted">More countries arrive in Stage 4 (target 15–20).</div>
      </div>
    );
  }
  if (step === 'detail' && country) {
    const c = country;
    return (
      <div className="page">
        <button className="back" onClick={() => setStep('select')}>‹ Countries</button>
        <div className="row"><span style={{ fontSize: 48 }}>{c.flag}</span><div><h2>{c.name}</h2><div className="muted">{c.title} · {c.government}</div><Stars n={c.difficultyStars} /></div></div>
        <Card title="Starting position">
          <div className="grid2 small">
            <div>GDP <b>{fmtMoney(c.gdp)}</b></div><div>Growth potential <b>{c.potentialGrowth}%</b></div>
            <div>Inflation <b>{c.inflation0}%</b></div><div>Unemployment <b>{c.unemployment0}%</b></div>
            <div>Debt <b>{c.debtPct0}% GDP</b></div><div>Deficit <b>{c.deficitPct0}% GDP</b></div>
            <div>Approval <b>{c.approval0}%</b></div><div>Term <b>{c.termYears} years</b></div>
          </div>
        </Card>
        <Card title="Constitution"><div className="small">{c.constitution}</div></Card>
        <Card title="Context"><div className="small">{c.history}</div></Card>
        <Card title="Your challenges"><ul className="tight small">{c.challenges.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <Card title="Your strengths"><ul className="tight small">{c.strengths.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        <div className="tiny muted">Figures are approximate (circa 2024-25), rounded for gameplay. The game starts in January 2026 in a fictional timeline.</div>
        <button className="btn big" onClick={() => setStep('difficulty')}>Choose difficulty ›</button>
      </div>
    );
  }
  if (step === 'difficulty' && country) {
    const set = (k: keyof Omit<Difficulty, 'preset'>, v: number) => setDiff({ ...diff, preset: 'custom', [k]: v });
    const sl: [keyof Omit<Difficulty, 'preset'>, string, string][] = [
      ['economy', 'Economic volatility', 'Bigger shocks and noisier growth'],
      ['stability', 'Political fragility', 'Lower starting stability, harsher unrest'],
      ['election', 'Election competitiveness', 'A stronger opposition raises the bar'],
      ['crisis', 'Crisis frequency', 'How often events strike'],
      ['pressure', 'International pressure', 'Rivals, lenders and sanctions push harder'],
      ['start', 'Starting conditions', 'A worse inheritance: more debt, inflation and joblessness'],
    ];
    return (
      <div className="page">
        <button className="back" onClick={() => setStep('detail')}>‹ {country.name}</button>
        <h2>Difficulty</h2>
        <Seg value={diff.preset === 'custom' ? ('standard' as const) : diff.preset} onChange={(p) => setDiff({ ...DIFFICULTY_PRESETS[p as 'relaxed' | 'standard' | 'hard'] })}
          options={[{ id: 'relaxed', label: 'Relaxed' }, { id: 'standard', label: 'Standard' }, { id: 'hard', label: 'Hard' }]} />
        {diff.preset === 'custom' && <div className="chip">Custom challenge</div>}
        <Card title="Fine-tune your own challenge">
          {sl.map(([k, n, d]) => (
            <div className="slider" key={k}>
              <div className="top"><span className="name">{n}</span><span className="val">×{diff[k].toFixed(2)}</span></div>
              <input type="range" min={0.5} max={1.5} step={0.05} value={diff[k]} onChange={(e) => set(k, parseFloat(e.target.value))} />
              <div className="tiny muted">{d}</div>
            </div>
          ))}
        </Card>
        <button className="btn big" onClick={() => setStep('party')}>Choose your party ›</button>
      </div>
    );
  }
  if (step === 'party' && country) {
    const sy = SYSTEMS[country.id];
    const opts = sy.leadable.map((id) => sy.parties.find((p) => p.id === id)!);
    const lab = (x: number, a: string, b: string) => (x < -0.35 ? a : x > 0.35 ? b : 'centrist');
    return (
      <div className="page">
        <button className="back" onClick={() => setStep('difficulty')}>‹ Difficulty</button>
        <h2>Your party</h2>
        <div className="small muted">You lead one of the two parties able to form a government. {sy.electionNote}</div>
        {opts.map((p) => (
          <button key={p.id} className="country-card" style={{ borderColor: p.color }} onClick={() => onStart(newGame(country.id, diff, undefined, 'You', p.id))}>
            <span className="fl" style={{ color: p.color }}>●</span>
            <div><b>{p.name}</b><div className="small muted">{p.blurb}</div><div className="tiny muted">{lab(p.econ, 'Left on economy', 'Market-oriented')} · {lab(p.social, 'liberal', 'conservative')} · ~{p.base}% of voters</div><div className="tiny" style={{ marginTop: 4 }}>Take office as {country.title} ▶</div></div>
          </button>
        ))}
      </div>
    );
  }
  return null;
}
