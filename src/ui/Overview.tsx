import { advisories, dateLabel, debtPct, fiscal, MONTHS, getCountry } from '../engine/sim';
import { getEvent } from '../engine/events';
import { Bar, Card, Stat, fmtMoney, fmtPct, fmtSigned, stability_label, toneFor } from './common';
import { defOf, eta } from '../engine/projects';
import type { Ctx } from './ctx';

export default function Overview({ s, advance, advanceMany, openEvent, openBriefing, go }: Ctx) {
  const c = getCountry(s);
  const f = fiscal(s);
  const adv = advisories(s);
  const nextM = MONTHS[(s.m + 1) % 12] + ' ' + (s.m === 11 ? s.y + 1 : s.y);
  const lastEv = s.eventHistory[s.eventHistory.length - 1];
  const pending = s.pendingEvent ? getEvent(s.pendingEvent) : null;
  const gTone = s.growth >= c.potentialGrowth ? 'good' : s.growth < 0 ? 'bad' : '';
  const iTone = s.inflation > c.inflationTarget + 2 ? 'bad' : s.inflation > c.inflationTarget + 0.8 ? 'warn' : 'good';
  const dTone = f.deficitPct <= 0 ? 'good' : f.deficitPct > Math.max(6, c.deficitPct0 + 2) ? 'bad' : '';
  return (
    <>
      {pending && (
        <button className="card" style={{ width: '100%', textAlign: 'left', borderColor: '#f5b84b' }} onClick={openEvent}>
          <div className="row"><span style={{ fontSize: 26 }}>{pending.icon}</span><div><b>Decision required: {pending.title}</b><div className="small muted">Tap to respond before the next month.</div></div></div>
        </button>
      )}

      {s.pol.inGovernment && s.ai.offers.length > 0 && (
        <button className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('world')}>
          <div className="row"><span style={{ fontSize: 22 }}>📨</span><div><b>{s.ai.offers.length} proposal{s.ai.offers.length > 1 ? 's' : ''} from foreign governments</b><div className="small muted">Tap to answer in World.</div></div></div>
        </button>
      )}
      <div className="grid2">
        <Stat label="Approval" value={fmtPct(s.approval, 0)} sub={<Bar value={s.approval} tone={toneFor(s.approval, 45, 30)} />} />
        <Stat label="Stability" value={s.stability.toFixed(0)} sub={<><Bar value={s.stability} tone={toneFor(s.stability, 55, 35)} /> <span className="tiny">{stability_label(s)}</span></>} />
        <Stat label="GDP" value={fmtMoney(s.gdp)} sub={`Growth ${fmtSigned(s.growth)}%`} cls={gTone} />
        <Stat label="Inflation" value={fmtPct(s.inflation)} sub={`Target ${c.inflationTarget}%`} cls={iTone} />
        <Stat label="Unemployment" value={fmtPct(s.unemployment)} sub={`Start ${c.unemployment0}%`} cls={s.unemployment > c.unemployment0 + 1.5 ? 'bad' : ''} />
        <Stat label="National debt" value={fmtPct(debtPct(s), 0)} sub={`${fmtMoney(s.debt)} of GDP`} cls={debtPct(s) > Math.max(100, c.debtPct0 + 25) ? 'warn' : ''} />
        <Stat label="Budget balance" value={`${fmtSigned(-f.deficitPct)}% GDP`} sub={`${fmtMoney(f.balanceM)} / month`} cls={dTone} />
        <Stat label="Next election" value={`${s.monthsToElection} mo`} sub={`${s.term > 1 ? `Term ${s.term}` : 'First term'}`} />
      </div>

      <Card title="Issues & advice">
        {adv.map((a, i) => (
          <div key={i} className={`adv ${a.level}`}>{a.level === 'bad' ? '⚠️' : a.level === 'warn' ? '❗' : a.level === 'good' ? '✅' : 'ℹ️'} <span>{a.text}</span></div>
        ))}
      </Card>

      {s.projects.some((p) => p.status !== 'complete') && (
        <Card title="Major projects" right={<button className="btn sec small" onClick={() => go('build')}>Open</button>}>
          {s.projects.filter((p) => p.status !== 'complete').slice(0, 3).map((p) => (
            <div key={p.id} style={{ margin: '6px 0' }}>
              <div className="row between small"><span>{defOf(p)?.icon} {defOf(p)?.name}</span><b>{p.progress.toFixed(0)}%</b></div>
              <Bar value={p.progress} tone={p.status === 'paused' ? 'warn' : 'good'} />
              <div className="tiny muted">{p.status === 'paused' ? 'Paused' : `~${eta(s, p)} months to go`}</div>
            </div>
          ))}
        </Card>
      )}

      {lastEv && (
        <Card title="Latest event">
          <b>{lastEv.title}</b>
          <div className="small muted">{MONTHS[lastEv.m]} {lastEv.y} · You chose: {lastEv.choice}</div>
          <div className="small" style={{ marginTop: 4 }}>{lastEv.outcome}</div>
        </Card>
      )}

      <div className="row">
        <button className="btn sec small" style={{ flex: 1 }} onClick={() => go('government')}>🏛 Budget & policy</button>
        <button className="btn sec small" style={{ flex: 1 }} onClick={openBriefing} disabled={!s.lastReport}>📋 Last briefing</button>
      </div>

      <div className="advance">
        <button className="btn" onClick={advance} disabled={!!s.pendingEvent || !!s.gameOver}>
          {s.pendingEvent ? 'Resolve the event first' : `Advance to ${nextM} ▶`}
        </button>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn sec small" style={{ flex: 1 }} onClick={() => advanceMany(6)} disabled={!!s.pendingEvent || !!s.gameOver}>6 months ⏩</button>
          <button className="btn sec small" style={{ flex: 1 }} onClick={() => advanceMany(12)} disabled={!!s.pendingEvent || !!s.gameOver}>1 year ⏩</button>
        </div>
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 4 }}>Fast-forward is calmer and pauses for any decision or election · {dateLabel(s)} · {c.title}</div>
      </div>
    </>
  );
}
