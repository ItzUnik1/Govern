import { advisories, dateLabel, debtPct, fiscal, MONTHS, getCountry } from '../engine/sim';
import { getEvent } from '../engine/events';
import { Bar, Card, fmtMoney, fmtPct, fmtSigned, stability_label } from './common';
import { defOf, eta } from '../engine/projects';
import { series, type SeriesKey } from './charts';
import { Spark } from './Insights';
import type { Ctx } from './ctx';

function Tile({ label, value, sub, tone, data }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn'; data?: number[] }) {
  return (
    <div className="tile">
      <div className="l">{label}</div>
      <div className={`v ${tone ?? ''}`}>{value}</div>
      {data && data.length > 1 ? <Spark data={data} color={tone === 'bad' ? 'var(--bad)' : tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)'} /> : <div className="spark" />}
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export default function Overview({ s, advance, advanceMany, openEvent, openBriefing, go }: Ctx) {
  const c = getCountry(s);
  const f = fiscal(s);
  const adv = advisories(s);
  const nextM = MONTHS[(s.m + 1) % 12] + ' ' + (s.m === 11 ? s.y + 1 : s.y);
  const pending = s.pendingEvent ? getEvent(s.pendingEvent) : null;
  const sr = (k: SeriesKey) => series(s.history, k).data.slice(-24);
  const gTone = s.growth >= c.potentialGrowth ? 'good' : s.growth < 0 ? 'bad' : undefined;
  const iTone = s.inflation > c.inflationTarget + 2 ? 'bad' : s.inflation > c.inflationTarget + 0.8 ? 'warn' : 'good';
  const dTone = f.deficitPct <= 0 ? 'good' : f.deficitPct > Math.max(6, c.deficitPct0 + 2) ? 'bad' : undefined;
  const aTone = s.approval >= 45 ? 'good' : s.approval <= 30 ? 'bad' : 'warn';
  const verdict = s.approval >= 58 && s.stability >= 60 ? 'Commanding' : s.approval >= 45 && s.stability >= 45 ? 'Secure' : s.approval >= 35 ? 'Under pressure' : 'In danger';
  const govText = !s.pol.inGovernment ? 'In opposition' : s.pol.minority ? 'Minority government' : s.pol.coalition.length > 1 ? 'Coalition government' : 'Majority government';
  const unreadMsgs = s.news.items.filter((n) => n.cat === 'message' && n.unread).length;
  const unreadAll = s.news.items.filter((n) => n.unread).length;

  const needs: { ico: string; text: string; cta: string; tone?: string; run: () => void }[] = [];
  if (pending) needs.push({ ico: pending.icon, text: `Decision: ${pending.title}`, cta: 'Respond', tone: 'warn', run: openEvent });
  if (s.pol.inGovernment && s.ai.offers.length) needs.push({ ico: '📨', text: `${s.ai.offers.length} proposal${s.ai.offers.length > 1 ? 's' : ''} from foreign governments`, cta: 'Answer', run: () => go('world') });
  if (unreadMsgs) needs.push({ ico: '✉️', text: `${unreadMsgs} new message${unreadMsgs > 1 ? 's' : ''}`, cta: 'Read', run: () => go('more', 'inbox') });
  for (const a of adv.filter((x) => x.level === 'bad' || x.level === 'warn').slice(0, 3)) needs.push({ ico: a.level === 'bad' ? '⚠️' : '❗', text: a.text, cta: 'Budget', tone: a.level, run: () => go('government') });
  if (!needs.length) { const a = adv[0]; needs.push({ ico: a.level === 'good' ? '✅' : 'ℹ️', text: a.text, cta: 'Budget', run: () => go('government') }); }
  const heads = s.news.items.filter((n) => n.cat !== 'message').slice(0, 3);
  const busy = !!s.pendingEvent || !!s.gameOver;
  const active = s.projects.filter((p) => p.status !== 'complete');

  return (
    <div className="home">
      <div className="home-main">
        <div className="hero">
          <div className="ring" style={{ background: `conic-gradient(var(--${aTone === 'good' ? 'good' : aTone === 'bad' ? 'bad' : 'warn'}) ${Math.round(s.approval)}%, var(--line) 0)` }}><i>{fmtPct(s.approval, 0)}</i></div>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Your standing</div>
            <div className="verdict">{verdict}</div>
            <div className="small muted">Stability {s.stability.toFixed(0)} ({stability_label(s)}) · {govText}</div>
            <div className="small muted">{s.monthsToElection} months to the election{s.term > 1 ? ` · Term ${s.term}` : ''}</div>
          </div>
        </div>

        <div className="tiles">
          <Tile label="GDP" value={fmtMoney(s.gdp)} sub={`Growth ${fmtSigned(s.growth)}%`} tone={gTone} data={sr('gdp')} />
          <Tile label="Inflation" value={fmtPct(s.inflation)} sub={`Target ${c.inflationTarget}%`} tone={iTone} data={sr('inflation')} />
          <Tile label="Unemployment" value={fmtPct(s.unemployment)} sub={`Start ${c.unemployment0}%`} tone={s.unemployment > c.unemployment0 + 1.5 ? 'bad' : undefined} data={sr('unemployment')} />
          <Tile label="National debt" value={fmtPct(debtPct(s), 0)} sub={`${fmtMoney(s.debt)} of GDP`} tone={debtPct(s) > Math.max(100, c.debtPct0 + 25) ? 'warn' : undefined} data={sr('debtPct')} />
          <Tile label="Budget balance" value={`${fmtSigned(-f.deficitPct)}% GDP`} sub={`${fmtMoney(f.balanceM)} / month`} tone={dTone} data={sr('balancePct')} />
          <Tile label="Stability" value={s.stability.toFixed(0)} sub={stability_label(s)} tone={s.stability < 35 ? 'bad' : s.stability < 50 ? 'warn' : 'good'} data={sr('stability')} />
        </div>

        {active.length > 0 && (
          <Card title="Major projects" right={<button className="btn sec small" onClick={() => go('build')}>Open</button>}>
            {active.slice(0, 3).map((p) => (
              <div key={p.id} style={{ margin: '6px 0' }}>
                <div className="row between small"><span>{defOf(p)?.icon} {defOf(p)?.name}</span><b>{p.progress.toFixed(0)}%</b></div>
                <Bar value={p.progress} tone={p.status === 'paused' ? 'warn' : 'good'} />
                <div className="tiny muted">{p.status === 'paused' ? 'Paused' : `~${eta(s, p)} months to go`}</div>
              </div>
            ))}
          </Card>
        )}
        <div className="row">
          <button className="btn sec small" style={{ flex: 1 }} onClick={() => go('government')}>🏛 Budget & policy</button>
          <button className="btn sec small" style={{ flex: 1 }} onClick={openBriefing} disabled={!s.lastReport}>📋 Last briefing</button>
        </div>
      </div>

      <div className="home-side">
        <div className="home-scroll">
          <Card title={`Needs you · ${needs.length}`}>
            {needs.map((n, i) => (
              <button key={i} className={`need ${n.tone ?? ''}`} onClick={n.run}>
                <span className="ic">{n.ico}</span><span className="tx">{n.text}</span><span className="go">{n.cta} ›</span>
              </button>
            ))}
          </Card>
          {heads.length > 0 && (
            <Card title={`📰 Headlines${unreadAll ? ` · ${unreadAll} new` : ''}`}>
              {heads.map((n) => <div key={n.id} className="small" style={{ fontWeight: 600, margin: '5px 0' }}>{n.tone === 'bad' ? '🔻 ' : n.tone === 'good' ? '🔺 ' : ''}{n.head}</div>)}
              <button className="btn sec small" style={{ marginTop: 4 }} onClick={() => go('more', 'inbox')}>News & inbox</button>
            </Card>
          )}
        </div>
        <div className="advance">
          <div className="tiny muted advance-note">{dateLabel(s)} · {c.title}</div>
          <button className="btn" onClick={advance} disabled={busy}>{s.pendingEvent ? 'Resolve the decision first' : `Advance to ${nextM} ▶`}</button>
          <div className="row">
            <button className="btn sec small" style={{ flex: 1 }} onClick={() => advanceMany(6)} disabled={busy}>6 months ⏩</button>
            <button className="btn sec small" style={{ flex: 1 }} onClick={() => advanceMany(12)} disabled={busy}>1 year ⏩</button>
          </div>
        </div>
      </div>
    </div>
  );
}
