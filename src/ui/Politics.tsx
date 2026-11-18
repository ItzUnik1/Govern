import { leadOpposition } from '../engine/rivalai';
import { useMemo, useState } from 'react';
import { BILLS, getBill } from '../engine/laws';
import { POSTS, SYSTEMS } from '../engine/parties';
import { appoint, availableBills, billOutcome, billSupport, coalSeats, dismissPartnerMinister, forecast, govSeatShare, isPresidential, makePromise, ministerAdvice, ncRisk, pdef, pollShares, PROMISE_LIST, reshuffle, sysOf, totalSeats } from '../engine/politics';
import { attackGovernment, callConfidence, callEarlyElection, lobbyBill, mediaBlitz, proposeBill, rally, voteBill, withdrawBill } from '../engine/polactions';
import { computeLegacy, getCountry, MONTHS, rngNext } from '../engine/sim';
import { LineChart, series } from './charts';
import { Bar, Card, Seg, Stat, fmtPct, stability_label, toneFor } from './common';
import type { Ctx } from './ctx';
import type { GameState } from '../engine/types';
import PartyRoom from './PartyRoom';
import { whipBill } from '../engine/factions';

type SegId = 'parliament' | 'party' | 'laws' | 'cabinet' | 'opposition' | 'parties' | 'elections' | 'legacy';

export function SeatBar({ s, seats }: { s: GameState; seats?: Record<string, number> }) {
  const sy = sysOf(s);
  const data = sy.parties.map((p) => ({ p, n: seats ? seats[p.id] ?? 0 : s.pol.parties[p.id].seats })).filter((x) => x.n > 0).sort((a, b) => sy.parties.indexOf(a.p) - sy.parties.indexOf(b.p));
  const tot = data.reduce((a, x) => a + x.n, 0) || 1;
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: '#1a2640' }}>
        {data.map((x) => <i key={x.p.id} title={x.p.name} style={{ width: `${(x.n / tot) * 100}%`, background: x.p.color }} />)}
        <b style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#fff', opacity: 0.85 }} />
      </div>
      <div className="row wrap" style={{ marginTop: 8, gap: '4px 12px' }}>
        {data.map((x) => <span key={x.p.id} className="tiny"><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: x.p.color, marginRight: 5 }} />{x.p.short} {x.n}</span>)}
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>White line = majority ({Math.floor(tot / 2) + 1} of {tot})</div>
    </div>
  );
}

const rnd = (s: GameState) => rngNext(s);

export default function Politics(ctx: Ctx) {
  const { s } = ctx;
  const inGov = s.pol.inGovernment;
  const [seg, setSeg] = useState<SegId>((ctx.sub as SegId) || 'parliament');
  const opts: [SegId, string][] = inGov
    ? [['parliament', 'Parliament'], ['party', 'Party'], ['laws', 'Laws'], ['cabinet', 'Cabinet'], ['parties', 'Parties'], ['elections', 'Elections'], ['legacy', 'Legacy']]
    : [['parliament', 'Parliament'], ['opposition', 'Opposition'], ['parties', 'Parties'], ['elections', 'Elections'], ['legacy', 'Legacy']];
  const cur = opts.some((o) => o[0] === seg) ? seg : 'parliament';
  return (
    <>
      <div className="chips">{opts.map(([id, l]) => <button key={id} className={cur === id ? 'on' : ''} onClick={() => setSeg(id)}>{l}</button>)}</div>
      {cur === 'parliament' && <Parliament {...ctx} />}
      {cur === 'party' && <PartyRoom {...ctx} />}
      {cur === 'laws' && <Laws {...ctx} />}
      {cur === 'cabinet' && <Cabinet {...ctx} />}
      {cur === 'opposition' && <Opposition {...ctx} />}
      {cur === 'parties' && <Parties {...ctx} />}
      {cur === 'elections' && <Elections {...ctx} />}
      {cur === 'legacy' && <Legacy {...ctx} />}
    </>
  );
}

function Parliament({ s, update, toast }: Ctx) {
  const sy = sysOf(s), P = s.pol, c = getCountry(s);
  const [confirm, setConfirm] = useState(false);
  const tot = totalSeats(s);
  const share = govSeatShare(s);
  const risk = ncRisk(s);
  const pres = isPresidential(s);
  const gov = pdef(s, P.pmParty);
  const apr = series(s.history, 'approval');
  const status = pres ? (share > 0.5 ? 'Your party controls the House' : 'Opposition controls the House - expect gridlock') : P.minority ? 'Minority government' : 'Majority government';
  const opp = s.ai.opp; const leadId = leadOpposition(s);
  return (
    <>
      {P.inGovernment && leadId && (
        <Card title="🎯 Lead opposition">
          <div className="row between small"><b>{pdef(s, leadId).name}</b><span className={opp.momentum > 1.5 ? 'bad' : opp.momentum < -0.5 ? 'good' : 'muted'}>{opp.momentum > 1.5 ? 'Gaining momentum' : opp.momentum < -0.5 ? 'Losing steam' : 'Steady'}</span></div>
          <div className="small muted" style={{ marginTop: 4 }}>{opp.lastMove}</div>
          <div className="tiny muted">Their campaign moves the polls and raises no-confidence risk when you are struggling.</div>
        </Card>
      )}
      <Card title={sy.chamber}>
        <SeatBar s={s} />
        <div className="small" style={{ marginTop: 8 }}><b>{pres ? 'President' : c.title}:</b> {gov.name}{P.coalition.length > 1 ? ` with ${P.coalition.filter((x) => x !== P.pmParty).map((x) => pdef(s, x).short).join(', ')}` : ''}</div>
        <div className={`small ${share > 0.5 ? 'good' : 'warn'}`}>{status} · {pres ? Math.round(share * tot) : coalSeats(s)} of {tot} seats ({Math.round(share * 100)}%)</div>
        {!P.inGovernment && <div className="small muted">You lead the opposition ({pdef(s, P.playerParty).short}, {P.parties[P.playerParty].seats} seats).</div>}
      </Card>
      {P.inGovernment && !pres && P.coalition.length > 1 && (
        <Card title="Coalition mood">
          {P.coalition.filter((x) => x !== P.pmParty).map((id) => (
            <div key={id} style={{ margin: '6px 0' }}>
              <div className="row between small"><span>{pdef(s, id).name}</span><b>{P.parties[id].sat.toFixed(0)}</b></div>
              <Bar value={P.parties[id].sat} tone={toneFor(P.parties[id].sat, 55, 32)} />
            </div>
          ))}
          <div className="tiny muted">Partners drift away if policy moves far from their politics. Below ~30 they issue ultimatums; near zero they walk out.</div>
        </Card>
      )}
      <div className="grid2">
        <Stat label={P.inGovernment ? 'Approval' : 'Govt approval'} value={fmtPct(s.approval, 0)} sub={<Bar value={s.approval} tone={toneFor(s.approval, 45, 30)} />} />
        <Stat label="Stability" value={s.stability.toFixed(0)} sub={<><Bar value={s.stability} tone={toneFor(s.stability, 55, 35)} /><span className="tiny">{stability_label(s)}</span></>} />
        {!pres && <Stat label="Confidence-vote risk" value={risk < 0.01 ? 'Low' : risk < 0.03 ? 'Moderate' : 'High'} sub={`${(risk * 100).toFixed(1)}% per month`} cls={risk < 0.01 ? 'good' : risk < 0.03 ? 'warn' : 'bad'} />}
        <Stat label="Next election" value={`${s.monthsToElection} mo`} sub={`${c.termYears}-year terms`} />
      </div>
      {P.inGovernment && !pres && (
        <Card title="Parliamentary powers">
          <div className="small muted">Test your majority with a confidence vote (win: stability rises; lose: parliament is dissolved), or go to the country early when polls favour you.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sec small" style={{ flex: 1 }} onClick={() => update((g) => { const r = callConfidence(g); toast(typeof r === 'string' ? r : r.text); })}>Confidence vote</button>
            {confirm
              ? <button className="btn danger small" style={{ flex: 1 }} onClick={() => { setConfirm(false); update((g) => { const r = callEarlyElection(g); toast(r ?? 'Election called for next month.'); }); }}>Confirm snap election</button>
              : <button className="btn sec small" style={{ flex: 1 }} onClick={() => setConfirm(true)}>Call early election</button>}
          </div>
        </Card>
      )}
      <Card title="Approval history"><LineChart data={apr.data} years={apr.years} color="#4f8cff" fmt={(x) => x.toFixed(0)} refLine={c.approval0} height={100} /></Card>
    </>
  );
}

function Laws({ s, update, toast }: Ctx) {
  const P = s.pol;
  const sy = sysOf(s);
  const bill = P.bill ? getBill(P.bill.id)! : null;
  const avail = availableBills(s);
  if (bill) {
    const sup = billSupport(s, bill.id, P.bill!.lobbied);
    const o = billOutcome(s, bill.id, P.bill!.lobbied);
    return (
      <>
        <Card title="Bill before parliament">
          <b>{bill.icon} {bill.name}</b>
          <div className="small muted">{bill.desc}</div>
          <div className="small" style={{ marginTop: 4 }}>{bill.effect}</div>
        </Card>
        <Card title="Whip count">
          {sup.map((r) => {
            const pd = pdef(s, r.party);
            return (
              <div key={r.party} style={{ margin: '6px 0' }}>
                <div className="row between small"><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: pd.color, marginRight: 6 }} />{pd.short} · {r.seats} seats {P.coalition.includes(r.party) ? '(govt)' : ''}</span><b>{Math.round(r.yes * 100)}% yes</b></div>
                <Bar value={r.yes * 100} tone={r.yes > 0.55 ? 'good' : r.yes > 0.4 ? 'warn' : 'bad'} />
              </div>
            );
          })}
          <div className="row between" style={{ marginTop: 8 }}><b>Projected</b><b className={o.pass ? 'good' : 'bad'}>{o.yes} yes · {o.no} no ({o.pct.toFixed(0)}%)</b></div>
          <div className="tiny muted">Needs a simple majority. A small random element remains on the day.</div>
        </Card>
        <div className="row">
          <button className="btn sec small" style={{ flex: 1 }} disabled={P.bill!.lobbied} onClick={() => update((g) => { const r = lobbyBill(g); if (r) toast(r); else toast('You lobby wavering MPs (-1.5 approval).'); })}>{P.bill!.lobbied ? 'Lobbied' : 'Lobby (−1.5 approval)'}</button>
          {s.fac && s.pol.pmParty === s.pol.playerParty && <button className="btn sec small" style={{ flex: 1 }} disabled={s.fac.whipTurn === P.bill!.turn} onClick={() => update((g) => { const r = whipBill(g); toast(r ?? 'Whips are out for the vote.'); })}>{s.fac.whipTurn === P.bill!.turn ? 'Whipped' : 'Whip (10 capital)'}</button>}
          <button className="btn sec small" style={{ flex: 1 }} onClick={() => update((g) => withdrawBill(g))}>Withdraw</button>
        </div>
        <button className="btn" onClick={() => update((g) => { const r = voteBill(g); toast(r.text); })}>Call the vote</button>
      </>
    );
  }
  return (
    <>
      <Card title="Legislative agenda">
        <div className="small muted">{sy.presidential ? 'Bills need the House. ' : 'Bills need a majority in parliament. '}Propose one at a time; check the whip count before the vote. Defeats damage your authority.</div>
        {P.billCooldown > 0 && <div className="small warn" style={{ marginTop: 4 }}>Parliamentary calendar busy: {P.billCooldown} month(s).</div>}
      </Card>
      {avail.map((b) => {
        const o = billOutcome(s, b.id);
        const failed = P.failedAt[b.id] !== undefined && s.turn - P.failedAt[b.id] < 12;
        return (
          <div className="card" key={b.id}>
            <div className="row between"><b>{b.icon} {b.name}</b><span className={`chip ${o.pass ? '' : 'warn'}`}>{o.pct.toFixed(0)}% support</span></div>
            <div className="small muted">{b.desc}</div>
            <div className="tiny" style={{ marginTop: 3 }}>{b.effect}</div>
            <button className="btn small" style={{ marginTop: 8, width: '100%' }} disabled={P.billCooldown > 0 || failed} onClick={() => update((g) => { const r = proposeBill(g, b.id); if (r) toast(r); })}>{failed ? 'Failed recently' : 'Introduce bill'}</button>
          </div>
        );
      })}
      {P.passed.length > 0 && (
        <Card title="Passed into law">
          {P.passed.map((id) => <div key={id} className="small">✅ {BILLS.find((b) => b.id === id)?.name}</div>)}
        </Card>
      )}
    </>
  );
}

function Cabinet({ s, update, toast }: Ctx) {
  const P = s.pol;
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Card title="Cabinet">
        <div className="small muted">Ministers shape how well departments turn money into results. Reputation is a guess; real performance becomes clear over time. Coalition partners hold some posts.</div>
        <button className={`btn sec small ${confirm ? 'danger' : ''}`} style={{ marginTop: 8 }} onClick={() => { if (!confirm) setConfirm(true); else { setConfirm(false); update((g) => { reshuffle(g, () => rnd(g)); toast('Cabinet reshuffled.'); }); } }}>{confirm ? 'Confirm reshuffle (−1 approval, −1 stability)' : 'Reshuffle cabinet'}</button>
      </Card>
      {POSTS.map((post) => {
        const m = P.cabinet[post.id];
        const advice = ministerAdvice(s, post.id);
        const own = !m || m.party === P.playerParty;
        return (
          <div className="card" key={post.id}>
            <div className="row between"><b>{post.icon} {post.label}</b>{m && <span className="chip" style={{ borderColor: pdef(s, m.party).color }}>{pdef(s, m.party).short}</span>}</div>
            {m ? (
              <>
                <div className="small">{m.name}</div>
                <div className="row between tiny muted"><span>Reputation {m.rep}</span><span>{m.months >= 3 ? `Performance ${m.perf.toFixed(0)}` : 'Performance: too early to tell'}</span></div>
                <Bar value={m.months >= 3 ? m.perf : m.rep} tone={toneFor(m.months >= 3 ? m.perf : m.rep, 60, 40)} />
              </>
            ) : <div className="small muted">Vacant</div>}
            {advice && <div className="adv info" style={{ marginTop: 6 }}>💬 <span>{advice}</span></div>}
            <div className="row" style={{ marginTop: 8 }}>
              {own ? <button className="btn sec small" style={{ flex: 1 }} onClick={() => setOpen(open === post.id ? null : post.id)}>{open === post.id ? 'Close' : 'Replace'}</button>
                : <button className="btn sec small" style={{ flex: 1 }} onClick={() => update((g) => { dismissPartnerMinister(g, post.id, () => rnd(g)); toast('Partner minister dismissed. The partner is furious.'); })}>Dismiss (angers partner)</button>}
            </div>
            {open === post.id && own && (P.pool[post.id] ?? []).map((cand) => (
              <button key={cand.id} className="choice" onClick={() => { update((g) => { const r = appoint(g, post.id, cand.id); toast(r ?? `${cand.name} appointed.`); }); setOpen(null); }}>
                <b>{cand.name}</b><span>Reputation {cand.rep} · {pdef(s, cand.party).short}</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function Opposition({ s, update, toast }: Ctx) {
  const P = s.pol;
  const gov = pdef(s, P.pmParty);
  const hist = s.eventHistory.filter((e) => e.choice.startsWith('Government:')).slice(-6).reverse();
  return (
    <>
      <Card title="You lead the opposition">
        <div className="small">{gov.name} governs. The economy keeps running under its policies; you cannot change budgets, but you can hold it to account and win back the voters.</div>
        <div className="grid2" style={{ marginTop: 8 }}>
          <Stat label="Government approval" value={fmtPct(s.approval, 0)} sub={<Bar value={s.approval} tone={toneFor(s.approval, 45, 30)} />} />
          <Stat label="Your campaign boost" value={`+${P.campaign.toFixed(1)}`} sub="points in the polls" />
        </div>
      </Card>
      <Card title="Opposition actions">
        <button className="btn sec" style={{ width: '100%' }} onClick={() => update((g) => { const r = attackGovernment(g); toast(r ?? 'Done'); })}>🎯 Attack the government's record</button>
        <div className="tiny muted" style={{ marginTop: 4 }}>Repeated attacks have diminishing returns. Use Elections → campaign for rallies and media pushes.</div>
      </Card>
      <Card title="What the government has been doing">
        {hist.length === 0 ? <div className="small muted">No major decisions yet.</div> : hist.map((e, i) => <div key={i} className="small" style={{ margin: '6px 0' }}><b>{e.title}</b><div className="muted">{e.choice.replace('Government: ', '')} - {e.outcome}</div></div>)}
      </Card>
    </>
  );
}

function Parties({ s }: Ctx) {
  const sy = sysOf(s), P = s.pol;
  const polls = pollShares(s);
  const list = [...sy.parties].sort((a, b) => polls[b.id] - polls[a.id]);
  const lab = (x: number, a: string, b: string) => (x < -0.35 ? a : x > 0.35 ? b : 'centre');
  return (
    <>
      <Card title="Opinion polls (national vote share)">
        {list.map((p) => (
          <div key={p.id} style={{ margin: '6px 0' }}>
            <div className="row between small"><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 6 }} />{p.short}{p.id === P.playerParty ? ' (you)' : ''}</span><b>{polls[p.id].toFixed(1)}%</b></div>
            <Bar value={polls[p.id]} max={Math.max(...Object.values(polls))} />
          </div>
        ))}
      </Card>
      {list.map((p) => (
        <div className="card" key={p.id}>
          <div className="row between"><b style={{ color: p.color }}>{p.name}</b><span className="chip">{P.parties[p.id].seats} seats</span></div>
          <div className="small muted">{p.blurb}</div>
          <div className="tiny" style={{ marginTop: 3 }}>{lab(p.econ, 'left on economy', 'market-oriented')} · {lab(p.social, 'socially liberal', 'socially conservative')}{p.regions ? ' · regional party' : ''}{p.pariah ? ' · shunned by others' : ''}</div>
          <div className="tiny muted">{P.coalition.includes(p.id) ? (p.id === P.pmParty ? 'Leads the government' : `In government · satisfaction ${P.parties[p.id].sat.toFixed(0)}`) : 'Opposition'}</div>
        </div>
      ))}
    </>
  );
}

function Elections({ s, update, toast }: Ctx) {
  const sy = sysOf(s), P = s.pol, c = getCountry(s);
  const fc = useMemo(() => forecast(s, 24), [s.turn, s.approval, s.pol.campaign, s.pol.promises.length, s.pol.pmParty]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = s.electionHistory.length;
  const lastGen = [...s.electionHistory].reverse().find((e) => e.kind !== 'midterm');
  const label = fc.winProb > 0.85 ? 'Very likely' : fc.winProb > 0.65 ? 'Favoured' : fc.winProb > 0.4 ? 'Toss-up' : fc.winProb > 0.2 ? 'Underdog' : 'Long shot';
  const active = P.promises.filter((p) => (p.base._c ?? 0) >= n);
  const due = P.promises.filter((p) => (p.base._c ?? 0) < n);
  const inWindow = s.monthsToElection <= 18 || !P.inGovernment;
  return (
    <>
      <Card title="Election outlook">
        <div className="row between"><b style={{ fontSize: 18 }}>{label}</b><span className="chip">{s.monthsToElection} months away</span></div>
        <div className="small muted" style={{ marginTop: 4 }}>
          {sy.presidential ? `Chance of winning the presidency: ${Math.round(fc.winProb * 100)}%.` : P.inGovernment ? `Chance of staying prime minister: ${Math.round(fc.winProb * 100)}%.` : `Chance of returning to power: ${Math.round(fc.winProb * 100)}%.`} {sy.electionNote}
        </div>
        <div style={{ marginTop: 8 }}><div className="tiny muted">Projected seats</div><SeatBar s={s} seats={fc.seats} /></div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Voters weigh growth, jobs, prices, taxes and services, how long you have governed, your campaign and whether you keep promises.{c.maxTerms ? ` Constitutional limit: ${c.maxTerms} terms.` : ''}</div>
      </Card>
      <Card title="Campaign">
        <button className="btn sec" style={{ width: '100%' }} onClick={() => update((g) => toast(mediaBlitz(g)))}>📺 National media push</button>
        <div className="eyebrow" style={{ margin: '10px 0 6px' }}>Rally in a region</div>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {sy.regions.map((r) => <button key={r.id} onClick={() => update((g) => toast(rally(g, r.id) ?? 'Rally held.'))}>{r.name}{P.campaignRegion[r.id] ? ` +${P.campaignRegion[r.id].toFixed(0)}` : ''}</button>)}
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Campaign effects fade within months, so time them for the run-up. Costs are small for the government and free for opposition parties.</div>
      </Card>
      <Card title="Manifesto promises">
        {active.length === 0 && due.length === 0 && <div className="small muted">No promises yet. Up to three promises win votes now, but you will be judged at the next election.</div>}
        {active.map((p) => <div key={p.id} className="small">📣 {PROMISE_LIST.find((x) => x.id === p.id)?.label} <span className="muted">(made this campaign)</span></div>)}
        {due.map((p) => <div key={p.id} className="small">⏳ {PROMISE_LIST.find((x) => x.id === p.id)?.label} <span className="muted">(judged at the next election)</span></div>)}
        {inWindow ? (
          <div className="chips" style={{ flexWrap: 'wrap', marginTop: 8 }}>
            {PROMISE_LIST.filter((p) => !P.promises.some((x) => x.id === p.id)).map((p) => <button key={p.id} title={p.desc} onClick={() => update((g) => { const r = makePromise(g, p.id); toast(r ?? `Promised: ${p.label}`); })}>{p.icon} {p.label}</button>)}
          </div>
        ) : <div className="tiny muted" style={{ marginTop: 6 }}>Promises can be made in the last 18 months before an election.</div>}
        {P.promiseLog.length > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>Past record: {P.promiseLog.slice(-6).map((x) => `${x.kept ? '✔' : '✘'} ${x.label}`).join(' · ')}</div>}
      </Card>
      {lastGen?.seats && (
        <Card title={`Last general election · ${MONTHS[lastGen.m]} ${lastGen.y}`}>
          <SeatBar s={s} seats={lastGen.seats} />
          <div className="small" style={{ marginTop: 6 }}>{lastGen.note}</div>
          <div className="tiny muted">Turnout {lastGen.turnout}% · your vote share {lastGen.voteShare}%</div>
        </Card>
      )}
      {P.regional.length > 0 && (
        <Card title="Regional picture (latest vote)">
          {P.regional.map((r) => {
            const top = Object.entries(r.shares).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return (
              <div key={r.id} style={{ margin: '8px 0' }}>
                <div className="small"><b>{r.name}</b></div>
                <div className="tiny muted">{top.map(([id, v]) => `${pdef(s, id).short} ${v.toFixed(0)}%`).join(' · ')}{Object.keys(r.seats).length ? ` · you won ${r.seats[P.playerParty] ?? 0} of ${Object.values(r.seats).reduce((a, b) => a + b, 0)} seats` : ''}</div>
              </div>
            );
          })}
        </Card>
      )}
      <Card title="History">
        {s.electionHistory.length === 0 ? <div className="small muted">No elections held yet.</div> : (
          <div className="list">
            {[...s.electionHistory].reverse().map((e, i) => (
              <div className="it" key={i}>
                <div className="row between"><b>{MONTHS[e.m]} {e.y}{e.kind === 'midterm' ? ' (midterm)' : ''}</b><span className={e.won ? 'good' : 'bad'}>{e.won ? 'Won' : 'Lost'}</span></div>
                <div className="small muted">{e.voteShare}% of the vote · turnout {e.turnout}%</div>
                <div className="small">{e.note}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Legacy({ s }: Ctx) {
  const c = getCountry(s);
  const lg = computeLegacy(s);
  const [tab, setTab] = useState<'legacy' | 'system'>('legacy');
  return (
    <>
      <Seg value={tab} onChange={setTab} options={[{ id: 'legacy', label: 'Legacy' }, { id: 'system', label: 'System' }]} />
      {tab === 'legacy' ? (
        <>
          <Card title="Your political legacy">
            <div className="legacy-big">{lg.total.toFixed(0)}</div>
            <div className="good" style={{ fontWeight: 700 }}>{lg.rank}</div>
            <div className="list" style={{ marginTop: 8 }}>
              {lg.parts.map((p) => <div className="it row between" key={p.label}><span className="small">{p.label}</span><b className={p.value >= 0 ? 'good' : 'bad'}>{p.value >= 0 ? '+' : ''}{p.value}</b></div>)}
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>Legacy rewards real income growth beyond your country’s trend, better public services, sound finances, electoral mandates and popularity.</div>
          </Card>
          <div className="grid2">
            <Stat label="Elections won" value={s.electionsWon} sub={`${s.electionHistory.length} held`} />
            <Stat label="Years in politics" value={`${Math.floor(s.turn / 12)}y ${s.turn % 12}m`} />
          </div>
        </>
      ) : (
        <>
          <Card title={`${c.name}: ${c.government}`}><div className="small">{c.constitution}</div></Card>
          <Card title="Political context"><div className="small">{c.history}</div><div className="small muted" style={{ marginTop: 6 }}>Opposition: {c.opposition}.</div></Card>
          <Card title="Electoral system"><div className="small">{SYSTEMS[s.countryId].electionNote}</div></Card>
        </>
      )}
    </>
  );
}
