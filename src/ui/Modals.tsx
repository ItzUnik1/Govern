import { useState } from 'react';
import { availableChoices, getEvent } from '../engine/events';
import { computeLegacy, getCountry, MONTHS } from '../engine/sim';
import type { GameState } from '../engine/types';
import { Card, fmtSigned } from './common';
import { SeatBar } from './Politics';
import { pdef, sysOf } from '../engine/politics';
import { resolveFormation } from '../engine/sim';
import type { Ctx } from './ctx';

export function Briefing({ s, onClose }: { s: GameState; onClose: () => void }) {
  const r = s.lastReport;
  if (!r) return null;
  return (
    <div className="overlay"><div className="sheet">
      <h2>📋 Briefing – {MONTHS[(r.m + 11) % 12]} {r.m === 0 ? r.y - 1 : r.y}</h2>
      <div>
        {r.deltas.map((d) => {
          const ch = d.to - d.from;
          const dir = d.goodWhenUp === null || Math.abs(ch) < 0.05 ? '' : (ch > 0) === d.goodWhenUp ? 'good' : 'bad';
          return (
            <div className="delta" key={d.label}>
              <span>{d.label}</span>
              <span><b>{d.to.toFixed(d.digits)}{d.unit && d.unit !== '' ? (d.unit.startsWith('%') ? '%' : '') : ''}</b> <span className={dir}>({fmtSigned(ch)})</span></span>
            </div>
          );
        })}
      </div>
      {r.notes.map((n, i) => <div key={i} className="adv warn">⚠️ <span>{n}</span></div>)}
      <button className="btn" onClick={onClose}>Continue</button>
    </div></div>
  );
}

export interface PeriodSummary {
  requested: number; done: number; reason: string | null; startLabel: string; endLabel: string;
  from: Record<string, number>; to: Record<string, number>; notes: string[]; totalNotes: number;
}
const PERIOD_ROWS: { k: string; label: string; unit: string; dp: number; goodUp: boolean }[] = [
  { k: 'approval', label: 'Approval', unit: '%', dp: 0, goodUp: true }, { k: 'stability', label: 'Stability', unit: '', dp: 0, goodUp: true },
  { k: 'growth', label: 'GDP growth', unit: '%', dp: 1, goodUp: true }, { k: 'inflation', label: 'Inflation', unit: '%', dp: 1, goodUp: false },
  { k: 'unemployment', label: 'Unemployment', unit: '%', dp: 1, goodUp: false }, { k: 'debtPct', label: 'Debt / GDP', unit: '%', dp: 0, goodUp: false },
  { k: 'balance', label: 'Budget balance', unit: '%', dp: 1, goodUp: true },
];
export function PeriodModal({ p, onClose }: { p: PeriodSummary; onClose: () => void }) {
  const gdpCh = ((p.to.gdp / p.from.gdp) - 1) * 100;
  return (
    <div className="overlay"><div className="sheet">
      <h2>⏩ {p.done} month{p.done > 1 ? 's' : ''} passed</h2>
      <div className="small muted">{p.startLabel} to {p.endLabel}{p.done < p.requested ? ` · paused (${p.done} of ${p.requested})` : ''}</div>
      {p.reason && <div className="adv warn">⏸ <span>{p.reason}</span></div>}
      <div>
        <div className="delta"><span>GDP</span><span><b>{gdpCh >= 0 ? '+' : ''}{gdpCh.toFixed(1)}%</b> <span className="small muted">over the period (nominal)</span></span></div>
        {PERIOD_ROWS.map((r) => {
          const ch = p.to[r.k] - p.from[r.k]; const dir = Math.abs(ch) < 0.05 ? '' : (ch > 0) === r.goodUp ? 'good' : 'bad';
          return <div className="delta" key={r.k}><span>{r.label}</span><span><b>{p.to[r.k].toFixed(r.dp)}{r.unit}</b> <span className={dir}>({ch >= 0 ? '+' : ''}{ch.toFixed(r.dp)})</span></span></div>;
        })}
      </div>
      {p.notes.length > 0 && <div className="eyebrow" style={{ marginTop: 10 }}>What happened{p.totalNotes > p.notes.length ? ` (latest ${p.notes.length} of ${p.totalNotes})` : ''}</div>}
      {p.notes.map((n, i) => <div key={i} className="adv warn">⚠️ <span>{n}</span></div>)}
      <button className="btn" onClick={onClose}>Continue</button>
    </div></div>
  );
}

export function EventModal({ s, onChoose, onClose }: { s: GameState; onChoose: (i: number) => void; onClose: () => void }) {
  const [chosen, setChosen] = useState(false);
  const c = getCountry(s);
  if (chosen) {
    return (
      <div className="overlay"><div className="sheet">
        <h2>Outcome</h2><p>{s.lastEventOutcome ?? ''}</p>
        <button className="btn" onClick={onClose}>Continue</button>
      </div></div>
    );
  }
  const def = s.pendingEvent ? getEvent(s.pendingEvent) : null;
  if (!def) return null;
  const choices = availableChoices(def, s, c);
  return (
    <div className="overlay"><div className="sheet">
      <div className="muted small">{def.category}</div>
      <h2>{def.icon} {def.title}</h2>
      <p>{def.text(s, c)}</p>
      {choices.map((ch, i) => (
        <button key={i} className="choice" onClick={() => { onChoose(i); setChosen(true); }}>
          <b>{ch.label}</b><span>{ch.hint}</span>
        </button>
      ))}
    </div></div>
  );
}

export function ElectionModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const e = s.lastElection;
  if (!e) return null;
  return (
    <div className="overlay center"><div className="sheet">
      <div className="muted small">Election night · {MONTHS[e.m]} {e.y}</div>
      <h2>{e.kind === 'midterm' ? '🗳️ Midterm results' : s.pol.pending ? '🗳️ Hung parliament' : e.won ? '🎉 Victory' : '🗳️ Defeat'}</h2>
      {e.seats && <SeatBar s={s} seats={e.seats} />}
      <div className="grid3">
        <div className="stat"><div className="l">Vote share</div><div className="v">{e.voteShare}%</div></div>
        <div className="stat"><div className="l">Turnout</div><div className="v">{e.turnout}%</div></div>
        <div className="stat"><div className="l">Approval</div><div className="v">{e.approval}%</div></div>
      </div>
      <p>{e.note}</p>
      <button className="btn" onClick={onClose}>Continue</button>
    </div></div>
  );
}

export function GameOver({ s, onTitle, onLoad }: { s: GameState; onTitle: () => void; onLoad: () => void }) {
  const g = s.gameOver;
  if (!g) return null;
  const lg = computeLegacy(s);
  const c = getCountry(s);
  return (
    <div className="overlay center"><div className="sheet">
      <div className="muted small">{c.flag} {c.name} · {Math.floor(s.turn / 12)} years {s.turn % 12} months in office</div>
      <h2>{g.title}</h2>
      <p>{g.text}</p>
      <Card title="Final legacy">
        <div className="legacy-big">{lg.total.toFixed(0)}</div>
        <div className="good" style={{ fontWeight: 700 }}>{lg.rank}</div>
        {lg.parts.map((p) => <div key={p.label} className="row between small"><span>{p.label}</span><b>{p.value}</b></div>)}
      </Card>
      <button className="btn" onClick={onTitle}>New career</button>
      <button className="btn sec" onClick={onLoad}>Load a saved game</button>
    </div></div>
  );
}

export function FormationModal({ s, update, toast, onDone }: { s: GameState; update: Ctx['update']; toast: Ctx['toast']; onDone: () => void }) {
  const F = s.pol.formation;
  const [sel, setSel] = useState<string[]>([]);
  if (!F) return null;
  const sy = sysOf(s);
  const mine = s.pol.parties[s.pol.playerParty].seats;
  const tot = F.seatsTotal;
  const seats = mine + sel.reduce((a, id) => a + s.pol.parties[id].seats, 0);
  const posts = sel.reduce((a, id) => a + F.ask[id], 0);
  const major = Math.floor(tot / 2) + 1;
  const ids = Object.keys(F.ask).sort((a, b) => s.pol.parties[b].seats - s.pol.parties[a].seats);
  const toggle = (id: string) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const go = (partners: string[] | null) => {
    let err: string | null = null;
    update((g) => { err = resolveFormation(g, partners); });
    if (err) toast(err); else onDone();
  };
  return (
    <div className="overlay center"><div className="sheet">
      <div className="muted small">Coalition talks</div>
      <h2>🤝 Form a government</h2>
      <p className="small">{F.note}</p>
      <SeatBar s={s} />
      <div className="row between small" style={{ margin: '8px 0' }}><span>Your bloc: <b className={seats >= major ? 'good' : 'warn'}>{seats}</b> / {major} needed</span><span>Ministries offered: <b>{posts}</b></span></div>
      {ids.length === 0 && <div className="small muted">No party is willing to join you.</div>}
      {ids.map((id) => {
        const p = pdef(sy, id); const on = sel.includes(id);
        return (
          <button key={id} className="choice" style={on ? { borderColor: p.color, background: 'var(--panel2)' } : undefined} onClick={() => toggle(id)}>
            <b>{on ? '✔ ' : ''}{p.name} ({s.pol.parties[id].seats} seats)</b>
            <span>Asks for {F.ask[id]} ministr{F.ask[id] === 1 ? 'y' : 'ies'}</span>
          </button>
        );
      })}
      <button className="btn" disabled={sel.length === 0 && mine < major} onClick={() => go(sel)}>{seats >= major ? 'Form government' : 'Form minority government'}</button>
      <button className="btn sec" onClick={() => go(null)}>Go into opposition</button>
    </div></div>
  );
}
