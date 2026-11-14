import { useState } from 'react';
import { availableChoices, getEvent } from '../engine/events';
import { computeLegacy, getCountry, MONTHS } from '../engine/sim';
import type { GameState } from '../engine/types';
import { Card, fmtSigned } from './common';

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
      <h2>{e.won ? '🎉 Victory' : '🗳️ Defeat'}</h2>
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
