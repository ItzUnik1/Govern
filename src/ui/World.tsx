import { useState } from 'react';
import { LENDERS, WORLD, ally, cancelTrade, delegation, getNation, giveAid, joinOrg, nationsOf, negotiateTrade, orgsOf, repayLoan, requestAid, sanction, summit, takeLoan, tradeWeights } from '../engine/diplomacy';
import { answerOffer } from '../engine/rivalai';
import { Bar, Card, Stat, fmtMoney, fmtPct, toneFor } from './common';
import type { Ctx } from './ctx';

type Seg = 'relations' | 'orgs' | 'finance';
const TIER = ['No agreement', 'Free-trade deal', 'Deep partnership'];

export default function World({ s, update, toast }: Ctx) {
  const [seg, setSeg] = useState<Seg>('relations');
  const [open, setOpen] = useState<string | null>(null);
  const D = s.dip;
  const w = tradeWeights(s);
  const run = (f: (g: typeof s) => string | null) => update((g) => { const r = f(g); if (r) toast(r); });
  const nations = [...nationsOf(s)].sort((a, b) => w[b.id] - w[a.id]);
  return (
    <>
      {!s.pol.inGovernment && <div className="card warn small">🔒 You are in opposition. Only the government can negotiate treaties, impose sanctions, take loans or give aid.</div>}
      {s.ai.offers.length > 0 && s.pol.inGovernment && (
        <Card title={`📨 Proposals from governments (${s.ai.offers.length})`}>
          {s.ai.offers.map((o) => (
            <div key={o.id} style={{ margin: '8px 0 12px' }}>
              <b>{getNation(o.nation).flag} {getNation(o.nation).name}</b>
              <div className="small">{o.text}</div>
              <div className="tiny muted">Expires in {Math.max(0, o.expires - s.turn)} months</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn small" style={{ flex: 1 }} onClick={() => run((g) => answerOffer(g, o.id, true))}>Accept</button>
                <button className="btn sec small" style={{ flex: 1 }} onClick={() => run((g) => answerOffer(g, o.id, false))}>Decline</button>
              </div>
            </div>
          ))}
        </Card>
      )}
      <div className="grid2">
        <Stat label="Global influence" value={D.influence.toFixed(0)} sub="friendships and economic weight" />
        <Stat label="Trade partners" value={nations.filter((n) => D.nations[n.id].trade > 0).length} sub={`of ${nations.length} nations with deals`} />
      </div>
      <div className="chips">
        {([['relations', 'Relations'], ['orgs', 'Organisations'], ['finance', 'Loans & aid']] as const).map(([id, l]) => <button key={id} className={seg === id ? 'on' : ''} onClick={() => setSeg(id)}>{l}</button>)}
      </div>
      {seg === 'relations' && (
        <>
          {nations.map((n) => {
            const st = D.nations[n.id]; const isOpen = open === n.id;
            return (
              <div className="card" key={n.id}>
                <button style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} onClick={() => setOpen(isOpen ? null : n.id)}>
                  <div className="row between"><b>{n.flag} {n.name}</b><span className="small">{Math.round(w[n.id] * 100)}% of trade</span></div>
                  <div className="row between small" style={{ margin: '4px 0' }}><span className="muted">{st.rel < 25 ? 'Hostile' : st.rel < 42 ? 'Cold' : st.rel < 60 ? 'Neutral' : st.rel < 78 ? 'Friendly' : 'Close ally'}</span><b>{st.rel.toFixed(0)}</b></div>
                  <Bar value={st.rel} tone={toneFor(st.rel, 60, 40)} />
                  <div className="row wrap tiny" style={{ marginTop: 4, gap: '2px 8px' }}>
                    <span className="muted">{st.negotiating ? `Talks: ${st.negotiating} mo left` : TIER[st.trade]}</span>
                    {st.ally && <span className="good">Defence partner</span>}
                    {st.sanctionedByYou && <span className="warn">You sanction them</span>}
                    {st.sanctionsYou && <span className="bad">They sanction you</span>}
                  </div>
                </button>
                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    <div className="small muted">{n.blurb}</div>
                    <div className="grid2" style={{ marginTop: 8 }}>
                      <button className="btn sec small" onClick={() => run((g) => delegation(g, n.id))}>Send delegation</button>
                      <button className="btn sec small" onClick={() => run((g) => summit(g, n.id))}>Hold summit</button>
                      <button className="btn sec small" onClick={() => run((g) => negotiateTrade(g, n.id))}>{st.trade === 0 ? 'Negotiate trade deal' : st.trade === 1 ? 'Deepen trade deal' : 'Fully integrated'}</button>
                      <button className="btn sec small" onClick={() => run((g) => cancelTrade(g, n.id))}>Cancel agreement</button>
                      <button className="btn sec small" onClick={() => run((g) => ally(g, n.id))}>{st.ally ? 'End defence pact' : 'Defence partnership'}</button>
                      <button className="btn sec small" onClick={() => run((g) => sanction(g, n.id))}>{st.sanctionedByYou ? 'Lift sanctions' : 'Impose sanctions'}</button>
                      <button className="btn sec small" onClick={() => run((g) => giveAid(g, n.id))}>Give aid</button>
                      <button className="btn sec small" onClick={() => run((g) => requestAid(g, n.id))}>Request aid</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="tiny muted">Relations drift back toward their natural level unless you back them with trade deals, alliances and aid. Strong ties lift exports, investment and confidence; sanctions and feuds hurt them.</div>
          {s.ai.news.length > 0 && <Card title="🌍 World news">{s.ai.news.slice(0, 6).map((l, i) => <div key={i} className="small">{l}</div>)}</Card>}
          {D.log.length > 0 && <Card title="Diplomatic record">{D.log.slice(0, 8).map((l, i) => <div key={i} className="small">{l}</div>)}</Card>}
        </>
      )}
      {seg === 'orgs' && orgsOf(s).map((o) => (
        <div className="card" key={o.id}>
          <div className="row between"><b>{o.name}</b><span className={`chip ${D.orgs[o.id] ? '' : 'warn'}`}>{D.orgs[o.id] ? 'Member' : 'Not a member'}</span></div>
          <div className="small muted">{o.desc}</div>
          <div className="tiny" style={{ marginTop: 3 }}>{o.trade > 0 ? `Trade +${o.trade.toFixed(1)} · ` : ''}{o.stab > 0 ? `Security +${o.stab} · ` : ''}running cost {fmtPct(o.cost, 2)} of GDP</div>
          {o.kind !== 'global' && <button className="btn sec small" style={{ marginTop: 8, width: '100%' }} onClick={() => run((g) => joinOrg(g, o.id))}>{D.orgs[o.id] ? 'Leave (relations and confidence suffer)' : 'Apply to join'}</button>}
        </div>
      ))}
      {seg === 'finance' && (
        <>
          <Card title="International loans">
            {D.loans.length === 0 && <div className="small muted">No outstanding loans.</div>}
            {D.loans.map((l) => (
              <div key={l.id} className="row between small" style={{ margin: '6px 0' }}>
                <span>{LENDERS.find((x) => x.id === l.lender)?.name}<div className="tiny muted">{fmtMoney(l.remaining)} left · {l.ratePct}% · {Math.ceil(l.monthsLeft / 12)} yrs</div></span>
                <button className="btn sec small" onClick={() => run((g) => repayLoan(g, l.lender))}>Repay</button>
              </div>
            ))}
          </Card>
          {LENDERS.map((L) => (
            <div className="card" key={L.id}>
              <b>{L.name}</b>
              <div className="small muted">{L.cond}</div>
              <div className="tiny" style={{ margin: '4px 0' }}>{L.rate}% over {L.months / 12} years</div>
              <div className="row">
                {[1, 2, 3].map((p) => <button key={p} className="btn sec small" style={{ flex: 1 }} onClick={() => run((g) => takeLoan(g, L.id, p))}>{p}% of GDP</button>)}
              </div>
            </div>
          ))}
          <div className="tiny muted">Loans add to national debt and cash arrives immediately (reserves and the currency benefit). Repayments come out of the budget every month.</div>
          <Card title="Who is who">{WORLD.slice(0, 0).map((n) => <div key={n.id}>{getNation(n.id).name}</div>)}<div className="small muted">Aid donors are rich countries with warm relations. Countries above about $15,000 income per person no longer qualify for aid.</div></Card>
        </>
      )}
    </>
  );
}
