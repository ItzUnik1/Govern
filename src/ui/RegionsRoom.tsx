import { DEVOLUTION, DEV_NOTE, GRANTS, GRANT_NOTE, REG_ACTIONS, devGap, nationalRelation, regAction, setRegPolicy } from '../engine/regions';
import { pdef } from '../engine/politics';
import { Bar, Card, Stat, toneFor } from './common';
import type { Ctx } from './ctx';
import { play } from './sound';

export default function RegionsRoom({ s, update, toast }: Ctx) {
  const R = s.reg, gov = s.pol.inGovernment;
  const rel = nationalRelation(s), gap = devGap(s);
  return (
    <>
      <Card title="Regions and the centre">
        <div className="grid3">
          <Stat label="Trust in centre" value={rel.toFixed(0)} cls={rel > 58 ? 'good' : rel < 42 ? 'bad' : ''} />
          <Stat label="Dev. gap" value={gap.toFixed(0)} sub="spread between regions" cls={gap > 20 ? 'bad' : gap < 12 ? 'good' : ''} />
          <Stat label="Regions" value={R.list.length} sub={`${R.list.filter((r) => r.grievance > 60).length} angry`} />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Each region elects its own government every four years. Regions run by your allies trust you more; those run by rivals and regional parties test you. Trust moves stability and approval, a wide development gap slows growth and widens inequality, and in elections a region that trusts you leans to your party.
        </div>
      </Card>

      <Card title="Devolution">
        <div className="seg" style={{ marginBottom: 8 }}>
          {DEVOLUTION.map((l, i) => <button key={l} className={i === R.devolution ? 'on' : ''} disabled={!gov} onClick={() => { update((g) => { setRegPolicy(g, 'devolution', i); }); toast(`Devolution: ${l}`); play('tap'); }}>{l}</button>)}
        </div>
        <div className="tiny muted">{DEV_NOTE[R.devolution]}</div>
      </Card>
      <Card title="National grants to regions">
        <div className="seg" style={{ marginBottom: 8 }}>
          {GRANTS.map((l, i) => <button key={l} className={i === R.grants ? 'on' : ''} disabled={!gov} onClick={() => { update((g) => { setRegPolicy(g, 'grants', i); }); toast(`Regional grants: ${l}`); play('tap'); }}>{l}</button>)}
        </div>
        <div className="tiny muted">{GRANT_NOTE[R.grants]}</div>
      </Card>
      {!gov && <div className="tiny muted">You are in opposition: the government sets the regional settlement and runs regional programmes.</div>}

      {R.list.map((r) => {
        const pd = pdef(s, r.gov);
        const ally = s.pol.coalition.includes(r.gov) || r.gov === s.pol.playerParty;
        return (
          <Card key={r.id} title={r.name} right={<span className="tiny"><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: pd.color, marginRight: 5 }} />{pd.short}{ally ? ' · ally' : ''}</span>}>
            <div className="tiny muted" style={{ marginBottom: 6 }}>{(r.seatShare * 100).toFixed(0)}% of the country · regional government since {r.since === 0 ? 'the start' : `month ${r.since}`}</div>
            <div className="row between small"><span>Development</span><b>{r.dev.toFixed(0)}</b></div>
            <Bar value={r.dev} tone={toneFor(r.dev, 55, 35)} />
            <div className="row between small" style={{ marginTop: 6 }}><span>Trust in the centre</span><b>{r.relation.toFixed(0)}</b></div>
            <Bar value={r.relation} tone={toneFor(r.relation, 55, 38)} />
            <div className="row between small" style={{ marginTop: 6 }}><span>Grievance</span><b className={r.grievance > 60 ? 'bad' : ''}>{r.grievance.toFixed(0)}</b></div>
            <Bar value={r.grievance} tone={r.grievance > 60 ? 'bad' : r.grievance > 40 ? 'warn' : 'good'} />
            {gov && (
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {REG_ACTIONS.map((a) => {
                  const cd = r.cool[a.id] ?? 0;
                  return <button key={a.id} className="btn sec small" style={{ flex: 1 }} disabled={cd > 0} title={a.desc} onClick={() => { let m = ''; update((g) => { m = regAction(g, r.id, a.id); }); toast(m); play('tap'); }}>{cd > 0 ? `${a.name} (${cd}m)` : a.name}</button>;
                })}
              </div>
            )}
          </Card>
        );
      })}
      {gov && <div className="tiny muted">Visit: +4 trust, free. Invest: +6 development, +5 trust, 0.1% of GDP. Pact: +12 trust, −15 grievance, 0.15% of GDP and 1 approval.</div>}
    </>
  );
}
