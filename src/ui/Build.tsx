import { useState } from 'react';
import { getCountry, MONTHS } from '../engine/sim';
import { PROJ_CATS, availableProjects, cancelProject, eta, getProject, projectBudget, projectCapacity, projectCostPct, projectStatus, setProjectPaused, startProject, activeCount, type ProjectDef } from '../engine/projects';
import { SECTOR_LABELS } from '../engine/econdata';
import { Bar, Card, fmtMoney, fmtPct, Stat } from './common';
import type { Ctx } from './ctx';
import { BRANCHES, TECHS, eta as techEta, getTech, setBudget, startTech, techRate, techStatus } from '../engine/research';

const BEN: Record<string, string> = { growth: 'Growth', unemployment: 'Jobs', confidence: 'Confidence', approval: 'Approval', stability: 'Stability', revenuePct: 'Revenue', inflation: 'Inflation' };
const STK: Record<string, string> = { education: 'Education', health: 'Health', infrastructure: 'Infrastructure', security: 'Security', efficiency: 'Efficiency' };

function benefits(d: ProjectDef): string[] {
  const out: string[] = [];
  Object.entries(d.asset ?? {}).forEach(([k, v]) => out.push(`${STK[k]} quality +${v}`));
  Object.entries(d.mod ?? {}).forEach(([k, v]) => {
    const good = k === 'unemployment' || k === 'inflation' ? (v as number) < 0 : (v as number) > 0;
    out.push(`${good ? '▲' : '▼'} ${BEN[k]} ${(v as number) > 0 ? '+' : '−'}${Math.abs(v as number)}${k === 'revenuePct' ? '% GDP' : ''}`);
  });
  if (d.exportBoost) out.push(`Exports +${d.exportBoost}% GDP`);
  Object.entries(d.sector ?? {}).forEach(([k, v]) => out.push(`${SECTOR_LABELS[k as keyof typeof SECTOR_LABELS]?.label ?? k} sector +${v}pp/yr`));
  return out;
}
const when = (s: { y: number; m: number }, add: number) => {
  const t = s.y * 12 + s.m + add;
  return `${MONTHS[t % 12]} ${Math.floor(t / 12)}`;
};

export default function Build(ctx: Ctx) {
  const [mode, setMode] = useState<'projects' | 'research'>('projects');
  return (
    <>
      <div className="chips">{([['projects', '🏗️ Projects'], ['research', '🔬 Research']] as const).map(([id, l]) => <button key={id} className={mode === id ? 'on' : ''} onClick={() => setMode(id)}>{l}</button>)}</div>
      {mode === 'projects' ? <Projects {...ctx} /> : <Research {...ctx} />}
    </>
  );
}

function Research({ s, update, toast }: Ctx) {
  const R = s.res;
  const cur = R.current ? getTech(R.current) : null;
  return (
    <>
      <Card title="R&D budget">
        <div className="row between"><b>{R.budgetPct.toFixed(1)}% of GDP</b><span className="small muted">{fmtMoney((R.budgetPct / 100) * s.gdp)} / year</span></div>
        <input type="range" min={0} max={3} step={0.1} value={R.budgetPct} style={{ width: '100%' }} onChange={(e) => { const v = parseFloat(e.target.value); update((g) => setBudget(g, v)); }} />
        <div className="tiny muted">Funding turns into progress faster when your education quality is high. Anything above the 0.3% baseline widens the deficit (below it saves money).</div>
      </Card>
      {cur && (
        <Card title="Researching now">
          <b>{cur.icon} {cur.name}</b>
          <div style={{ margin: '6px 0' }}><Bar value={R.progress[cur.id] ?? 0} tone="good" /></div>
          <div className="row between small"><span>{(R.progress[cur.id] ?? 0).toFixed(0)}%</span><span className="muted">{techEta(s, cur.id) === null ? 'Needs funding' : `~${techEta(s, cur.id)} months`}</span></div>
          {R.queue && <div className="tiny muted">Next: {getTech(R.queue)?.name}</div>}
        </Card>
      )}
      {BRANCHES.map((br) => (
        <div key={br}>
          <div className="eyebrow" style={{ margin: '12px 2px 6px' }}>{br}</div>
          {TECHS.filter((t) => t.branch === br).map((t) => {
            const done = R.done.includes(t.id); const st = techStatus(s, t);
            return (
              <div className="card" key={t.id}>
                <div className="row between"><b>{t.icon} {t.name}</b><span className="chip">{done ? 'Done' : `${t.costPct}% of GDP`}</span></div>
                <div className="small muted">{t.desc}</div>
                {!done && <button className="btn small" style={{ marginTop: 8, width: '100%' }} disabled={!st.ok || R.current === t.id || R.queue === t.id} onClick={() => update((g) => { const r = startTech(g, t.id); toast(r ?? (g.res.current === t.id ? 'Research started.' : 'Queued next.')); })}>{R.current === t.id ? 'In progress' : R.queue === t.id ? 'Queued' : st.ok ? (R.current ? 'Queue next' : 'Start research') : st.reason}</button>}
              </div>
            );
          })}
        </div>
      ))}
      <div className="tiny muted">One technology at a time, with one queued. Each breakthrough permanently boosts growth, sectors, services or state capacity.</div>
    </>
  );
}

void techRate;

function Projects({ s, update, toast }: Ctx) {
  const c = getCountry(s);
  const [tab, setTab] = useState<'active' | 'available' | 'done'>('active');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const act = s.projects.filter((p) => p.status !== 'complete');
  const done = s.projects.filter((p) => p.status === 'complete');
  const cap = projectCapacity(s);
  const totalAnnual = (projectCostPct(s) / 100) * s.gdp;

  const start = (id: string) => update((g) => { const r = startProject(g, id); if (r) toast(r); else toast('Construction started'); });
  const Row = ({ id }: { id: string }) => {
    const p = s.projects.find((x) => x.id === id)!; const d = getProject(id)!;
    const cost = p.budget * (1 + p.overrunPct / 100);
    return (
      <div className="card">
        <div className="row between"><b>{d.icon} {d.name}</b>
          <span className={`chip ${p.status === 'paused' ? 'warn' : ''}`}>{p.status === 'building' ? 'Building' : p.status === 'paused' ? 'Paused' : 'Complete'}</span></div>
        <div style={{ margin: '8px 0 4px' }}><Bar value={p.progress} tone={p.status === 'paused' ? 'warn' : 'good'} /></div>
        <div className="row between small"><span>{p.progress.toFixed(0)}% complete</span><span className="muted">{p.status === 'complete' ? `Finished ${when(s, (p.completedTurn ?? 0) - s.turn)}` : p.status === 'paused' ? 'On hold' : `Opens ~${when(s, eta(s, p))} (${eta(s, p)} mo)`}</span></div>
        <div className="row between small muted"><span>Spent {fmtMoney(p.spent)} of {fmtMoney(cost)}</span>{p.status === 'building' && <span>{fmtMoney(p.monthlySpend * 12)}/yr</span>}</div>
        {(p.delayMonths > 0 || p.overrunPct > 0) && <div className="tiny warn" style={{ marginTop: 4 }}>⚠ {p.delayMonths > 0 ? `+${p.delayMonths} mo delay` : ''}{p.delayMonths > 0 && p.overrunPct > 0 ? ' · ' : ''}{p.overrunPct > 0 ? `+${p.overrunPct}% over budget` : ''}</div>}
        {p.status !== 'complete' && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sec small" style={{ flex: 1 }} onClick={() => update((g) => { const r = setProjectPaused(g, id, p.status === 'building'); if (r) toast(r); })}>{p.status === 'building' ? 'Pause' : 'Resume'}</button>
            {confirm === id
              ? <button className="btn danger small" style={{ flex: 1 }} onClick={() => { setConfirm(null); update((g) => cancelProject(g, id)); }}>Confirm cancel</button>
              : <button className="btn sec small" style={{ flex: 1 }} onClick={() => setConfirm(id)}>Cancel</button>}
          </div>
        )}
        {p.status === 'complete' && <div className="tiny muted" style={{ marginTop: 6 }}>Upkeep {fmtPct(d.maintenance, 2)} of GDP per year</div>}
        {p.log.length > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>{p.log.slice(-3).join(' · ')}</div>}
      </div>
    );
  };

  const avail = availableProjects(c).filter((d) => !s.projects.some((p) => p.id === d.id));
  return (
    <>
      <div className="grid2">
        <Stat label="Construction slots" value={`${activeCount(s)} / ${cap}`} sub="rises with state efficiency" cls={activeCount(s) >= cap ? 'warn' : ''} />
        <Stat label="Projects spend" value={fmtMoney(totalAnnual)} sub={`${fmtPct(projectCostPct(s), 2)} of GDP / yr incl. upkeep`} />
      </div>
      <div className="chips">
        {([['active', `In progress (${act.length})`], ['available', `Start new (${avail.length})`], ['done', `Completed (${done.length})`]] as const).map(([id, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>
      {tab === 'active' && (act.length === 0
        ? <Card><div className="muted small">No construction under way. Large projects take years and cost a big share of GDP - but permanently improve the economy once built.</div><button className="btn" style={{ marginTop: 10 }} onClick={() => setTab('available')}>Browse projects</button></Card>
        : act.map((p) => <Row key={p.id} id={p.id} />))}
      {tab === 'done' && (done.length === 0 ? <Card><div className="muted small">Nothing completed yet.</div></Card> : done.map((p) => <Row key={p.id} id={p.id} />))}
      {tab === 'available' && PROJ_CATS.map((cat) => {
        const list = avail.filter((d) => d.cat === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <div className="eyebrow" style={{ margin: '12px 2px 6px' }}>{cat}</div>
            {list.map((d) => {
              const st = projectStatus(s, d); const b = projectBudget(d, s); const isOpen = open === d.id;
              return (
                <div className="card" key={d.id}>
                  <button style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} onClick={() => setOpen(isOpen ? null : d.id)}>
                    <div className="row between"><b>{d.icon} {d.name}</b><span className="small">{fmtMoney(b)}</span></div>
                    <div className="small muted">{d.desc}</div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>{Math.round(d.months / 12 * 10) / 10} yrs · {fmtPct(d.costPct, 1)} of GDP · upkeep {fmtPct(d.maintenance, 2)}/yr</div>
                  </button>
                  {isOpen && <ul className="tight small" style={{ marginTop: 6 }}>{benefits(d).map((x, i) => <li key={i}>{x}</li>)}</ul>}
                  <button className="btn small" style={{ marginTop: 8, width: '100%' }} disabled={!st.ok} onClick={() => start(d.id)}>{st.ok ? 'Start construction' : st.reason}</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="tiny muted">Cost is spread over the build period and added to government spending (it widens the deficit). Poor state efficiency means delays and overruns. Benefits arrive only on completion.</div>
    </>
  );
}
