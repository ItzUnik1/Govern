import { useState } from 'react';
import { autoInfo, deleteSlot, listSlots, loadSlot, saveSlot, SLOT_COUNT, type SlotInfo } from '../engine/save';
import { getCountry, MONTHS } from '../engine/sim';
import type { GameState } from '../engine/types';
import { Card, Seg, Stars, fmtSigned } from './common';
import type { Ctx } from './ctx';
import { getTextSize, setTextSize, type TextSize } from './prefs';

type Sub = 'history' | 'save' | 'brief' | 'help' | 'settings';

export default function More(p: Ctx & { onLoad: (s: GameState) => void; onQuit: () => void }) {
  const sub = (p.sub as Sub) || 'history';
  return (
    <>
      {sub === 'history' && <History {...p} />}
      {sub === 'save' && <SaveLoad {...p} />}
      {sub === 'brief' && <Brief {...p} />}
      {sub === 'help' && <Help />}
      {sub === 'settings' && <Settings />}
    </>
  );
}

function Settings() {
  const [sz, setSz] = useState<TextSize>(getTextSize());
  return (
    <Card title="Text size">
      <Seg value={sz} onChange={(v) => { setSz(v); setTextSize(v); }} options={[{ id: 's', label: 'Small' }, { id: 'm', label: 'Default' }, { id: 'l', label: 'Large' }]} />
      <h2 style={{ marginTop: 14 }}>Prime Minister’s briefing</h2>
      <p className="small" style={{ marginTop: 4 }}>Growth is steady at 2.4%, inflation is easing, and approval holds at 46%. Preview text updates immediately.</p>
      <p className="tiny muted">The setting is stored on this device only.</p>
    </Card>
  );
}

function History({ s }: Ctx) {
  const [t, setT] = useState<'months' | 'events' | 'effects'>('months');
  return (
    <>
      <Seg value={t} onChange={setT} options={[{ id: 'months', label: 'Months' }, { id: 'events', label: 'Events' }, { id: 'effects', label: 'Active effects' }]} />
      {t === 'months' && (s.reports.length === 0 ? <Card><div className="muted small">Advance a month to start the record.</div></Card> :
        [...s.reports].reverse().slice(0, 36).map((r, i) => (
          <Card key={i} title={`${MONTHS[r.m]} ${r.y}`}>
            <div className="grid2 small">
              {r.deltas.slice(0, 6).map((d) => {
                const ch = d.to - d.from;
                const good = d.goodWhenUp === null ? '' : (ch > 0) === d.goodWhenUp ? 'good' : 'bad';
                return <div key={d.label} className="row between"><span className="muted">{d.label.split(' (')[0]}</span><span className={Math.abs(ch) < 0.05 ? 'muted' : good}>{fmtSigned(ch)}</span></div>;
              })}
            </div>
            {r.notes.map((n, j) => <div key={j} className="small warn" style={{ marginTop: 4 }}>• {n}</div>)}
          </Card>
        )))}
      {t === 'events' && (s.eventHistory.length === 0 ? <Card><div className="muted small">No events yet.</div></Card> :
        [...s.eventHistory].reverse().map((e, i) => (
          <Card key={i}><b>{e.title}</b><div className="tiny muted">{MONTHS[e.m]} {e.y} · {e.choice}</div><div className="small" style={{ marginTop: 4 }}>{e.outcome}</div></Card>
        )))}
      {t === 'effects' && (s.modifiers.length === 0 ? <Card><div className="muted small">No lingering effects right now.</div></Card> :
        s.modifiers.filter((m) => m.id !== 'vatChange' || true).map((m, i) => {
          const bits: string[] = [];
          if (m.growth) bits.push(`growth ${fmtSigned(m.growth)}`);
          if (m.inflation) bits.push(`inflation ${fmtSigned(m.inflation)}`);
          if (m.unemployment) bits.push(`jobless ${fmtSigned(m.unemployment)}`);
          if (m.approval) bits.push(`approval ${fmtSigned(m.approval)}`);
          if (m.stability) bits.push(`stability ${fmtSigned(m.stability)}`);
          if (m.confidence) bits.push(`confidence ${fmtSigned(m.confidence)}`);
          if (m.revenuePct) bits.push(`revenue ${fmtSigned(m.revenuePct, 2)}% GDP`);
          return <Card key={i}><b>{m.label}</b><div className="small muted">{bits.join(' · ')} · {m.monthsLeft > 5000 ? 'permanent' : `${m.monthsLeft} month(s) left`}</div></Card>;
        }))}
    </>
  );
}

function SaveLoad({ s, update, toast, onLoad }: Ctx & { onLoad: (s: GameState) => void }) {
  const [slots, setSlots] = useState<SlotInfo[]>(listSlots());
  const [confirm, setConfirm] = useState<{ kind: 'overwrite' | 'delete' | 'load'; slot: number } | null>(null);
  const refresh = () => setSlots(listSlots());
  const doSave = (n: number) => { const r = saveSlot(n, s); toast(r.ok ? `Saved to slot ${n}` : `Save failed: ${r.error}`); refresh(); };
  const auto = autoInfo();
  void update;
  return (
    <>
      {slots.map((sl) => {
        const n = sl.slot as number;
        return (
          <Card key={n} title={`Slot ${n}`}>
            {sl.empty ? <div className="muted small">Empty</div> : sl.corrupt ? <div className="bad small">Corrupt save</div> : (
              <div className="row"><span style={{ fontSize: 28 }}>{sl.flag}</span><div><b>{sl.country}</b><div className="small muted">{sl.date} · term {sl.term} · approval {sl.approval?.toFixed(0)}%</div><div className="tiny muted">{sl.savedAt ? new Date(sl.savedAt).toLocaleString() : ''}</div></div></div>
            )}
            <div className="row wrap" style={{ marginTop: 8 }}>
              <button className="btn small" onClick={() => (sl.empty ? doSave(n) : setConfirm({ kind: 'overwrite', slot: n }))}>{sl.empty ? 'Save here' : 'Overwrite'}</button>
              <button className="btn small sec" disabled={sl.empty || sl.corrupt} onClick={() => setConfirm({ kind: 'load', slot: n })}>Load</button>
              <button className="btn small sec" disabled={sl.empty} onClick={() => setConfirm({ kind: 'delete', slot: n })}>Delete</button>
            </div>
          </Card>
        );
      })}
      <Card title="Autosave">
        {auto.empty ? <div className="muted small">None yet.</div> : <div className="small muted">{auto.flag} {auto.country} · {auto.date} (saved after every month)</div>}
        <button className="btn small sec" style={{ marginTop: 8 }} disabled={auto.empty || auto.corrupt} onClick={() => setConfirm({ kind: 'load', slot: 0 })}>Load autosave</button>
      </Card>
      <div className="tiny muted">Saves live on this device only and work fully offline. Uninstalling the app deletes them.</div>
      {confirm && (
        <div className="overlay center"><div className="sheet">
          <h2>{confirm.kind === 'overwrite' ? 'Overwrite this save?' : confirm.kind === 'delete' ? 'Delete this save?' : 'Load this game?'}</h2>
          <p className="muted small">{confirm.kind === 'load' ? 'Unsaved progress in the current game will be lost.' : 'This cannot be undone.'}</p>
          <div className="row">
            <button className="btn sec" onClick={() => setConfirm(null)}>Cancel</button>
            <button className={`btn ${confirm.kind === 'delete' ? 'danger' : ''}`} onClick={() => {
              const { kind, slot } = confirm; setConfirm(null);
              if (kind === 'overwrite') doSave(slot);
              else if (kind === 'delete') { deleteSlot(slot); toast('Save deleted'); refresh(); }
              else { const g = loadSlot(slot === 0 ? 'auto' : slot); if (g) { onLoad(g); toast('Game loaded'); } else toast('Could not load that save'); }
            }}>Confirm</button>
          </div>
        </div></div>
      )}
      <span hidden>{SLOT_COUNT}</span>
    </>
  );
}

function Brief({ s }: Ctx) {
  const c = getCountry(s);
  return (
    <>
      <Card><div className="row"><span style={{ fontSize: 40 }}>{c.flag}</span><div><h4>{c.name}</h4><div className="small muted">{c.title} · {c.devLevel}</div><Stars n={c.difficultyStars} /></div></div></Card>
      <Card title="Constitution"><div className="small">{c.constitution}</div></Card>
      <Card title="History & context"><div className="small">{c.history}</div></Card>
      <Card title="Challenges"><ul className="tight small">{c.challenges.map((x) => <li key={x}>{x}</li>)}</ul></Card>
      <Card title="Strengths"><ul className="tight small">{c.strengths.map((x) => <li key={x}>{x}</li>)}</ul></Card>
      <Card title="International relationships"><div className="small">{c.relationships}</div></Card>
    </>
  );
}

function Help() {
  const sec: [string, string][] = [
    ['Monthly turn', 'Each press of Advance Month calculates revenue and spending, updates debt, growth, inflation, jobs, the currency, confidence, approval and stability, then may trigger an event.'],
    ['Growth', 'Starts from your country\'s potential. Rises with better education, health, infrastructure and government efficiency (slowly), investor confidence and stability; falls with higher taxes, high interest rates and heavy debt. A sudden increase in the deficit gives a temporary boost; a permanent deficit does not.'],
    ['Inflation', 'Pulled toward the central bank target. Pushed up by overheating growth, big deficits, a weak currency, and (for importers) energy prices. The independent central bank raises rates when inflation is high, which slows growth.'],
    ['Taxes', 'Revenue rises with the rate but with diminishing returns (evasion). Past a point it falls. Tax rises cost approval immediately and growth permanently; tax cuts help less than hikes hurt.'],
    ['Public services', 'Spending moves quality indexes slowly (years). Returns diminish as quality gets high, and cuts erode quality faster. Government efficiency makes each dollar work harder.'],
    ['Debt', 'Deficits add to debt. Interest costs follow market rates, and lenders charge a premium for high debt (less so for reserve-currency and domestic-savings countries).'],
    ['Approval & stability', 'Approval tracks growth, jobs, inflation, tax changes, welfare spending, service quality and living standards, relative to where you started. Long tenure causes fatigue. Stability follows approval, the economy and security, and rebellions can follow when it is low.'],
    ['Elections', 'Vote share depends mainly on approval and stability at election time plus a random swing. The bar rises with each term. Lose and your career ends; some countries have term limits.'],
    ['Events', 'Events depend on conditions (e.g. inflation crises appear when inflation is high). Every choice has trade-offs and many have lasting effects – check Active Effects.'],
  ];
  return <>{sec.map(([t, d]) => <Card key={t} title={t}><div className="small">{d}</div></Card>)}</>;
}
