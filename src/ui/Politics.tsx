import { useState } from 'react';
import { computeLegacy, electionOutlook, getCountry, MONTHS } from '../engine/sim';
import { LineChart, series } from './charts';
import { Bar, Card, Seg, Stat, fmtPct, stability_label, toneFor } from './common';
import type { Ctx } from './ctx';

export default function Politics({ s }: Ctx) {
  const [tab, setTab] = useState<'standing' | 'legacy' | 'system'>('standing');
  const c = getCountry(s);
  const o = electionOutlook(s);
  const lg = computeLegacy(s);
  const apr = series(s.history, 'approval');
  const stb = series(s.history, 'stability');
  const maxTxt = c.maxTerms ? ` (constitutional limit: ${c.maxTerms} terms – your successor continues)` : '';
  return (
    <>
      <Seg value={tab} onChange={setTab} options={[{ id: 'standing', label: 'Standing' }, { id: 'legacy', label: 'Legacy' }, { id: 'system', label: 'System' }]} />
      {tab === 'standing' && (
        <>
          <div className="grid2">
            <Stat label="Approval" value={fmtPct(s.approval, 0)} sub={<Bar value={s.approval} tone={toneFor(s.approval, 45, 30)} />} />
            <Stat label="Stability" value={s.stability.toFixed(0)} sub={<><Bar value={s.stability} tone={toneFor(s.stability, 55, 35)} /><span className="tiny">{stability_label(s)}</span></>} />
          </div>
          <Card title="Election outlook">
            <div className="row between"><b style={{ fontSize: 18 }}>{o.label}</b><span className="chip">{s.monthsToElection} months away</span></div>
            <div className="small muted" style={{ marginTop: 4 }}>
              Projected vote share <b>{o.projected.toFixed(1)}%</b> vs. about <b>{o.threshold.toFixed(1)}%</b> needed. Voters judge growth, jobs, prices, taxes and public services – and they tire of long-serving governments.
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>Term {s.term}{maxTxt}. Terms last {c.termYears} years.</div>
          </Card>
          <Card title="Approval history"><LineChart data={apr.data} years={apr.years} color="#4f8cff" fmt={(x) => x.toFixed(0)} refLine={c.approval0} /><div className="tiny muted">Dashed: your starting approval</div></Card>
          <Card title="Stability history"><LineChart data={stb.data} years={stb.years} color="#34c88a" fmt={(x) => x.toFixed(0)} height={100} /></Card>
          <Card title="Election results">
            {s.electionHistory.length === 0 ? <div className="small muted">No elections held yet.</div> : (
              <div className="list">
                {[...s.electionHistory].reverse().map((e, i) => (
                  <div className="it" key={i}>
                    <div className="row between"><b>{MONTHS[e.m]} {e.y}</b><span className={e.won ? 'good' : 'bad'}>{e.won ? 'Won' : 'Lost'}</span></div>
                    <div className="small muted">{e.voteShare}% of the vote · turnout {e.turnout}% · approval {e.approval}%</div>
                    <div className="small">{e.note}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
      {tab === 'legacy' && (
        <>
          <Card title="Your political legacy">
            <div className="legacy-big">{lg.total.toFixed(0)}</div>
            <div className="good" style={{ fontWeight: 700 }}>{lg.rank}</div>
            <div className="list" style={{ marginTop: 8 }}>
              {lg.parts.map((p) => <div className="it row between" key={p.label}><span className="small">{p.label}</span><b className={p.value >= 0 ? 'good' : 'bad'}>{p.value >= 0 ? '+' : ''}{p.value}</b></div>)}
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>Legacy rewards real income growth beyond your country's trend, better public services, sound finances, electoral mandates and popularity. It is counted again when your career ends.</div>
          </Card>
          <div className="grid2">
            <Stat label="Elections won" value={s.electionsWon} sub={`${s.electionHistory.length} held`} />
            <Stat label="Time in office" value={`${Math.floor(s.turn / 12)}y ${s.turn % 12}m`} />
          </div>
        </>
      )}
      {tab === 'system' && (
        <>
          <Card title={`${c.name}: ${c.government}`}><div className="small">{c.constitution}</div></Card>
          <Card title="Political context"><div className="small">{c.history}</div><div className="small muted" style={{ marginTop: 6 }}>Opposition: {c.opposition}.</div></Card>
          <Card title="Coming in Stage 2"><div className="small muted">Parties, a seat-by-seat parliament, coalition deals, confidence votes, ministers and a full campaign system will replace the simplified approval-based elections used now.</div></Card>
        </>
      )}
    </>
  );
}
