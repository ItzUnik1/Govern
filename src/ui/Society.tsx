import { SOC_ACTIONS, SOC_POLICIES, co2PerCapita, dependency, setSocPolicy, socActionAvailability, socCostPct, socRevenuePct } from '../engine/society';
import { doSocAction, getCountry } from '../engine/sim';
import { Bar, Card, Stat, fmtPct, fmtSigned, toneFor } from './common';
import type { Ctx } from './ctx';
import { play } from './sound';

type Group = 'people' | 'climate' | 'media';

function Policies({ group, s, update, toast }: Ctx & { group: Group }) {
  const readOnly = !s.pol.inGovernment;
  return (
    <>
      {SOC_POLICIES.filter((p) => p.group === group).map((p) => {
        const lv = s.soc.pol[p.id] ?? 0;
        return (
          <Card key={p.id} title={p.name}>
            <div className="small muted">{p.desc}</div>
            <div className="seg" style={{ margin: '8px 0' }}>
              {p.levels.map((l, i) => (
                <button key={l} className={i === lv ? 'on' : ''} disabled={readOnly} onClick={() => { update((x) => { setSocPolicy(x, p.id, i); }); toast(`${p.name}: ${l}`); play('tap'); }}>{l}</button>
              ))}
            </div>
            <div className="tiny muted">{p.effect}</div>
            {p.costPct[lv] > 0 && <div className="tiny">Running cost: {fmtPct(p.costPct[lv], 2)} of GDP a year</div>}
          </Card>
        );
      })}
      {readOnly && <div className="tiny muted">You are in opposition: these policies are set by the government.</div>}
    </>
  );
}

export function People(ctx: Ctx) {
  const { s } = ctx, so = s.soc, c = getCountry(s);
  const d = so.old - so.oldRef, w = so.work - so.workRef;
  const blocs: { k: keyof typeof so.bloc; label: string; share: number; note: string }[] = [
    { k: 'youth', label: 'Young people', share: so.young, note: 'Schools, jobs, family help' },
    { k: 'workers', label: 'Working households', share: so.work, note: 'Jobs, prices, taxes' },
    { k: 'elders', label: 'Older voters', share: so.old, note: 'Pensions, health, prices' },
    { k: 'rural', label: 'Rural voters', share: 100 - so.urban, note: 'Roads, farms, fuel costs' },
  ];
  return (
    <>
      <Card title="Population">
        <div className="grid3">
          <Stat label="Under 15" value={fmtPct(so.young, 1)} />
          <Stat label="Working age" value={fmtPct(so.work, 1)} sub={Math.abs(w) >= 0.05 ? `${fmtSigned(w, 1)} vs trend` : 'on trend'} cls={w > 0.05 ? 'good' : w < -0.05 ? 'bad' : ''} />
          <Stat label="65 and over" value={fmtPct(so.old, 1)} sub={Math.abs(d) >= 0.05 ? `${fmtSigned(d, 1)} vs trend` : 'on trend'} cls={d > 0.05 ? 'bad' : d < -0.05 ? 'good' : ''} />
        </div>
        <div className="grid3" style={{ marginTop: 8 }}>
          <Stat label="Urban" value={fmtPct(so.urban, 1)} />
          <Stat label="Births / woman" value={so.fertility.toFixed(2)} />
          <Stat label="Net migration" value={`${fmtSigned(so.migration, 1)}‰`} sub="per 1,000 a year" />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          {Math.round(dependency(s))} dependants per 100 workers. Fewer workers slow growth; more older people raise the pension and health bill. {c.name}'s baseline path is already included, so changes show against trend.
        </div>
      </Card>
      <Card title="Voting blocs">
        <div className="tiny muted" style={{ marginBottom: 6 }}>How satisfied each group is with your record. Their weight in your approval follows their share of the population.</div>
        {blocs.map((b) => (
          <div key={b.k} style={{ marginBottom: 8 }}>
            <div className="row between small"><b>{b.label} <span className="muted">({b.share.toFixed(0)}%)</span></b><span>{so.bloc[b.k].toFixed(0)}</span></div>
            <Bar value={so.bloc[b.k]} tone={toneFor(so.bloc[b.k], 55, 42)} />
            <div className="tiny muted">{b.note}</div>
          </div>
        ))}
      </Card>
      <Policies group="people" {...ctx} />
    </>
  );
}

export function Climate(ctx: Ctx) {
  const { s } = ctx, so = s.soc;
  const e = so.emissions - 100;
  return (
    <>
      <Card title="Climate and environment">
        <div className="grid3">
          <Stat label="Emissions" value={so.emissions.toFixed(0)} sub={`${fmtSigned(e, 0)} vs start`} cls={e < -1 ? 'good' : e > 5 ? 'bad' : ''} />
          <Stat label="Per person" value={`${co2PerCapita(s).toFixed(1)} t`} sub="CO2 a year" />
          <Stat label="Clean power" value={fmtPct(so.renew, 0)} sub="of electricity" />
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="row between small"><span>Climate hazard</span><b>{so.risk.toFixed(0)}</b></div>
          <Bar value={so.risk} tone={so.risk > 65 ? 'bad' : so.risk > 45 ? 'warn' : 'good'} />
          <div className="row between small" style={{ marginTop: 6 }}><span>Resilience</span><b>{so.resilience.toFixed(0)}</b></div>
          <Bar value={so.resilience} tone={toneFor(so.resilience, 50, 20)} />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Hazard rises slowly worldwide and faster when emissions grow; it sets how often disasters strike. Resilience cuts the chance and the damage.
          {socRevenuePct(s) > 0 && ` Carbon price revenue: ${fmtPct(socRevenuePct(s), 2)} of GDP.`}
        </div>
      </Card>
      <Policies group="climate" {...ctx} />
      <Actions {...ctx} ids={['greenbond']} />
    </>
  );
}

function Actions({ s, update, toast, ids }: Ctx & { ids: string[] }) {
  return (
    <>
      {SOC_ACTIONS.filter((a) => ids.includes(a.id)).map((a) => {
        const av = socActionAvailability(s, a.id);
        const off = !s.pol.inGovernment || !av.ok;
        return (
          <Card key={a.id} title={a.name}>
            <div className="small muted">{a.desc}</div>
            <div className="tiny" style={{ margin: '6px 0' }}>{a.effect}</div>
            <button className="btn small" disabled={off} onClick={() => { let msg = ''; update((x) => { msg = doSocAction(x, a.id); }); toast(msg); play('tap'); }}>
              {!s.pol.inGovernment ? 'Government only' : av.ok ? `Do it (${a.costPct < 0 ? 'raises' : 'costs'} ${Math.abs(a.costPct)}% of GDP)` : av.reason}
            </button>
          </Card>
        );
      })}
    </>
  );
}

export function Media(ctx: Ctx) {
  const { s } = ctx, so = s.soc;
  return (
    <>
      <Card title="Media and public trust">
        <div className="grid3">
          <Stat label="Trust in govt" value={so.trust.toFixed(0)} cls={so.trust > 55 ? 'good' : so.trust < 35 ? 'bad' : ''} />
          <Stat label="Press freedom" value={so.freedom.toFixed(0)} />
          <Stat label="Scandal heat" value={so.heat.toFixed(0)} cls={so.heat > 50 ? 'bad' : ''} />
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="row between small"><span>Trust</span><b>{so.trust.toFixed(0)}</b></div>
          <Bar value={so.trust} tone={toneFor(so.trust, 55, 35)} />
          <div className="row between small" style={{ marginTop: 6 }}><span>Scandal heat</span><b>{so.heat.toFixed(0)}</b></div>
          <Bar value={so.heat} tone={so.heat > 50 ? 'bad' : so.heat > 25 ? 'warn' : 'good'} />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Trust lifts approval, stability and investor confidence; scandal heat above 40 drags approval down and fades by about 8% a month. Spin buys votes now at the price of trust. Cracking down on the press raises stability a little but hurts trust, confidence and your standing abroad.
        </div>
      </Card>
      <Actions {...ctx} ids={['spin', 'transparency', 'factcheck']} />
      <Policies group="media" {...ctx} />
      <div className="tiny muted">Total running cost of society policies: {fmtPct(socCostPct(s), 2)} of GDP.</div>
    </>
  );
}
