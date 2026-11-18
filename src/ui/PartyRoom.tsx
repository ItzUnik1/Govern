import { FAC_ACTIONS, avgLoyalty, facAction, playerPM, rebelShare } from '../engine/factions';
import { pdef } from '../engine/politics';
import { Bar, Card, Stat, toneFor } from './common';
import type { Ctx } from './ctx';
import { play } from './sound';

export default function PartyRoom({ s, update, toast }: Ctx) {
  const pd = pdef(s, s.pol.playerParty);
  const F = s.fac;
  if (!playerPM(s)) {
    return (
      <Card title="Your party">
        <div className="small muted">You are not leading the government, so there is no whip to manage. Your party's wings are waiting: win the next election and you will have to keep them together.</div>
      </Card>
    );
  }
  const seats = s.pol.parties[s.pol.playerParty].seats;
  const risk = rebelShare(s);
  return (
    <>
      <Card title={`${pd.name}: your MPs`}>
        <div className="grid3">
          <Stat label="MPs" value={seats} />
          <Stat label="Avg loyalty" value={avgLoyalty(s).toFixed(0)} cls={avgLoyalty(s) > 55 ? 'good' : avgLoyalty(s) < 35 ? 'bad' : ''} />
          <Stat label="Political capital" value={F.capital.toFixed(0)} sub="spend on whips and deals" />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Each wing votes on bills by how close the bill is to its own view, plus its loyalty. A wing below 30 is in open revolt: it raises confidence-vote risk and weakens stability. If one stays furious for months its MPs walk out to a rival party.
          {risk > 0 && <b className="bad"> {(risk * 100).toFixed(0)}% of your MPs are in revolt right now.</b>}
        </div>
      </Card>
      {F.factions.map((f) => {
        const n = Math.round(seats * f.share);
        return (
          <Card key={f.id} title={`${f.name} · ${n} MPs`}>
            <div className="small">Leader: <b>{f.leader}</b></div>
            <div className="tiny muted" style={{ margin: '2px 0 8px' }}>{f.blurb}</div>
            <div className="row between small"><span>Loyalty</span><b className={f.loyalty < 30 ? 'bad' : ''}>{f.loyalty.toFixed(0)}{f.loyalty < 30 ? ' · revolt' : f.loyalty < 45 ? ' · restless' : ''}</b></div>
            <Bar value={f.loyalty} tone={toneFor(f.loyalty, 55, 35)} />
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              {FAC_ACTIONS.map((a) => (
                <button key={a.id} className="btn sec small" style={{ flex: 1 }} title={a.desc} onClick={() => { let m = ''; update((g) => { m = facAction(g, f.id, a.id); }); toast(m); play('tap'); }}>{a.name}</button>
              ))}
            </div>
          </Card>
        );
      })}
      <div className="tiny muted">Consult: +4 loyalty (4 capital). Reward: +10, small cost and approval hit (15 capital). Discipline: −8 for them, +2 for the others (5 capital). Capital regrows by about one point a month.</div>
    </>
  );
}
