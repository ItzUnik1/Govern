import { useState } from 'react';
import { borrowingRate, debtPct, fiscal, gdpPerCapita, getCountry } from '../engine/sim';
import { LineChart, StackBar, series, type SeriesKey } from './charts';
import { Card, Stat, fmtMoney, fmtPct, fmtSigned, Seg } from './common';
import type { Ctx } from './ctx';
import { SPEND_LABELS } from '../engine/countries';
import { ecoMetrics } from '../engine/economy';
import { SECTOR_IDS, SECTOR_LABELS } from '../engine/econdata';

const CH: { id: SeriesKey; label: string; fmt: (x: number) => string; color: string; ref?: (t: number) => number }[] = [
  { id: 'growth', label: 'Growth', fmt: (x) => x.toFixed(1) + '%', color: '#34c88a' },
  { id: 'inflation', label: 'Inflation', fmt: (x) => x.toFixed(1) + '%', color: '#ff6b6b' },
  { id: 'unemployment', label: 'Jobless', fmt: (x) => x.toFixed(1) + '%', color: '#f5b84b' },
  { id: 'debtPct', label: 'Debt/GDP', fmt: (x) => x.toFixed(0) + '%', color: '#b48cff' },
  { id: 'balancePct', label: 'Balance', fmt: (x) => x.toFixed(1) + '%', color: '#4f8cff' },
  { id: 'gdp', label: 'GDP', fmt: (x) => (x >= 1000 ? (x / 1000).toFixed(1) + 'T' : x.toFixed(0)), color: '#8fd0ff' },
  { id: 'currency', label: 'Currency', fmt: (x) => x.toFixed(0), color: '#e0a3ff' },
  { id: 'confidence', label: 'Confidence', fmt: (x) => x.toFixed(0), color: '#7ad7c9' },
  { id: 'gdppc', label: 'GDP / person', fmt: (x) => (x >= 10000 ? (x / 1000).toFixed(0) + 'k' : x >= 1000 ? (x / 1000).toFixed(1) + 'k' : x.toFixed(0)), color: '#8fd0ff' },
  { id: 'xPct', label: 'Exports', fmt: (x) => x.toFixed(0) + '%', color: '#34c88a' },
  { id: 'mPct', label: 'Imports', fmt: (x) => x.toFixed(0) + '%', color: '#ff7b7b' },
  { id: 'tbPct', label: 'Trade bal.', fmt: (x) => x.toFixed(1) + '%', color: '#f5b84b' },
  { id: 'fdi', label: 'FDI', fmt: (x) => x.toFixed(1) + '%', color: '#b48cff' },
  { id: 'resM', label: 'Reserves', fmt: (x) => x.toFixed(1) + ' mo', color: '#7ad7c9' },
  { id: 'gini', label: 'Inequality', fmt: (x) => x.toFixed(0), color: '#e0a3ff' },
  { id: 'hdi', label: 'HDI', fmt: (x) => x.toFixed(2), color: '#4f8cff' },
];

export default function Economy({ s }: Ctx) {
  const [tab, setTab] = useState<'now' | 'trade' | 'sectors' | 'people' | 'trends' | 'budget'>('now');
  const [ch, setCh] = useState<SeriesKey>('growth');
  const c = getCountry(s);
  const f = fiscal(s);
  const m = ecoMetrics(s, c);
  const e = s.eco;
  const cur = CH.find((x) => x.id === ch)!;
  const sr = series(s.history, ch);
  const ref = ch === 'inflation' ? c.inflationTarget : ch === 'growth' ? c.potentialGrowth : undefined;
  return (
    <>
      <div className="chips">
        {([['now', 'Indicators'], ['trade', 'Trade'], ['sectors', 'Sectors'], ['people', 'People'], ['trends', 'Trends'], ['budget', 'Public finances']] as const).map(([id, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>
      {tab === 'trade' && (
        <>
          <div className="grid2">
            <Stat label="Exports" value={fmtMoney(m.exportsBn)} sub={`${fmtPct(e.exportsPct, 1)} of GDP`} />
            <Stat label="Imports" value={fmtMoney(m.importsBn)} sub={`${fmtPct(e.importsPct, 1)} of GDP`} />
            <Stat label="Trade balance" value={`${m.tradeBalBn < 0 ? '' : '+'}${fmtMoney(m.tradeBalBn)}`} sub={`${fmtSigned(m.tradeBalPct)}% of GDP`} cls={m.tradeBalPct < -6 ? 'bad' : m.tradeBalPct < 0 ? 'warn' : 'good'} />
            <Stat label="Current account" value={`${m.caBn < 0 ? '' : '+'}${fmtMoney(m.caBn)}`} sub={`${fmtSigned(m.caPct)}% of GDP`} cls={m.caPct < -5 ? 'bad' : m.caPct < -2.5 ? 'warn' : 'good'} />
            <Stat label="Foreign investment (FDI)" value={fmtMoney(m.fdiBn)} sub={`${fmtPct(m.fdiPct, 2)} of GDP / yr`} />
            <Stat label="Remittances & aid" value={fmtMoney(m.remitBn + (c.aid / 100) * s.gdp)} sub={`${fmtPct(c.remittances + c.aid, 1)} of GDP`} />
            <Stat label="FX reserves" value={`${m.reservesMonths.toFixed(1)} mo`} sub={`${fmtMoney(m.reservesBn)} · safe ≥ ${m.safeMonths.toFixed(1)} mo`} cls={m.reservesMonths < m.safeMonths ? 'bad' : m.reservesMonths < m.safeMonths * 1.5 ? 'warn' : 'good'} />
            <Stat label="Currency index" value={s.currency.toFixed(0)} sub="100 = start" />
          </div>
          <Card title="Exports vs imports (% of GDP)">
            <LineChart data={series(s.history, 'xPct').data} years={series(s.history, 'xPct').years} color="#34c88a" fmt={(x) => x.toFixed(0) + '%'} />
            <div className="tiny muted" style={{ margin: '6px 0' }}>Exports (green) · imports below</div>
            <LineChart data={series(s.history, 'mPct').data} years={series(s.history, 'mPct').years} color="#ff7b7b" fmt={(x) => x.toFixed(0) + '%'} height={90} />
          </Card>
          <Card title="How trade works here">
            <ul className="tight small">
              <li>A weaker currency boosts exports and makes imports dearer; a stronger one does the opposite.</li>
              <li>World demand and commodity prices move exports; strong domestic growth pulls in imports.</li>
              <li>Persistent current-account deficits and thin reserves weaken the currency and investor confidence.</li>
              <li>Export-push policy, ports, SEZs and manufacturing strength raise exports over time.</li>
            </ul>
          </Card>
        </>
      )}
      {tab === 'sectors' && (
        <>
          <Card title="Economy by sector (% of GDP)">
            <StackBar parts={SECTOR_IDS.map((id) => ({ label: SECTOR_LABELS[id].label.split(' ')[0], value: e.sectors[id].share, color: SECTOR_LABELS[id].color }))} />
          </Card>
          {SECTOR_IDS.map((id) => {
            const sec = e.sectors[id];
            const L = SECTOR_LABELS[id];
            const out = (sec.share / 100) * s.gdp;
            return (
              <div className="card" key={id}>
                <div className="row between"><b>{L.icon} {L.label}</b><b>{fmtPct(sec.share, 1)}</b></div>
                <div className="row between small muted"><span>Output {fmtMoney(out)}</span><span className={sec.growth < 0 ? 'bad' : ''}>growth {fmtSigned(sec.growth, 1)}%</span></div>
              </div>
            );
          })}
          <div className="tiny muted">Sectors grow faster or slower than the economy depending on your policies: infrastructure, education, the currency, taxes and national projects all shift the mix.</div>
        </>
      )}
      {tab === 'people' && (
        <>
          <div className="grid2">
            <Stat label="GDP per person" value={`$${Math.round(m.gdpPc).toLocaleString('en-US')}`} sub="nominal, per year" />
            <Stat label="Real income index" value={m.realIncomeIdx.toFixed(0)} sub="per person, start = 100" cls={m.realIncomeIdx >= 100 ? 'good' : 'bad'} />
            <Stat label="Human development" value={m.hdi.toFixed(3)} sub={m.hdi >= 0.8 ? 'Very high' : m.hdi >= 0.7 ? 'High' : m.hdi >= 0.55 ? 'Medium' : 'Low'} />
            <Stat label="Inequality (Gini)" value={m.gini.toFixed(1)} sub="0 = equal, 100 = unequal" cls={m.gini > 45 ? 'warn' : ''} />
            <Stat label="Price level" value={m.priceIdx.toFixed(0)} sub="start = 100" />
            <Stat label="Population" value={`${s.population.toFixed(1)} m`} sub={`start ${c.population} m`} />
            <Stat label="Debt per person" value={`$${Math.round(m.debtPerPerson).toLocaleString('en-US')}`} sub={`${fmtPct(debtPct(s), 0)} of GDP`} />
            <Stat label="Living standards" value={s.livingStd.toFixed(0)} sub="vs. trend" />
          </div>
          <Card title="GDP per person"><LineChart data={series(s.history, 'gdppc').data} years={series(s.history, 'gdppc').years} color="#8fd0ff" fmt={(x) => (x >= 1000 ? (x / 1000).toFixed(1) + 'k' : x.toFixed(0))} /></Card>
          <Card title="Service quality (0–100)">
            {(['education', 'health', 'infrastructure', 'security', 'efficiency'] as const).map((k) => (
              <div key={k} style={{ margin: '6px 0' }}>
                <div className="row between small"><span style={{ textTransform: 'capitalize' }}>{k}</span><b>{s.stocks[k].toFixed(0)}</b></div>
                <div className="bar"><i style={{ width: `${s.stocks[k]}%` }} /></div>
              </div>
            ))}
          </Card>
        </>
      )}
      {tab === 'now' && (
        <>
          <div className="grid2">
            <Stat label="GDP (nominal)" value={fmtMoney(s.gdp)} sub={`${fmtMoney(gdpPerCapita(s) / 1000, 1)} per person`} />
            <Stat label="Real growth" value={`${fmtSigned(s.growth)}%`} sub={`Potential ${c.potentialGrowth}%`} cls={s.growth < 0 ? 'bad' : s.growth >= c.potentialGrowth ? 'good' : ''} />
            <Stat label="Inflation" value={fmtPct(s.inflation)} sub={`Target ${c.inflationTarget}%`} />
            <Stat label="Unemployment" value={fmtPct(s.unemployment)} sub={`Start ${c.unemployment0}%`} />
            <Stat label="Policy rate" value={fmtPct(s.policyRate, 2)} sub="Set by central bank" />
            <Stat label="Govt borrowing rate" value={fmtPct(borrowingRate(s), 2)} sub={`Avg cost ${fmtPct(s.avgCost, 2)}`} />
            <Stat label="Currency index" value={s.currency.toFixed(0)} sub="100 = start" cls={s.currency < 90 ? 'warn' : ''} />
            <Stat label="Investor confidence" value={s.confidence.toFixed(0)} sub="0–100" cls={s.confidence < 40 ? 'bad' : s.confidence > 55 ? 'good' : ''} />
            <Stat label="Living standards" value={s.livingStd.toFixed(0)} sub="vs. trend, 100 = on track" cls={s.livingStd < 97 ? 'warn' : s.livingStd > 103 ? 'good' : ''} />
            <Stat label="Commodity prices" value={s.commodity.toFixed(0)} sub="Global index, 100 = normal" />
          </div>
          <Card title="What the economy is telling you">
            <ul className="tight small">
              <li>Growth is {s.growth >= c.potentialGrowth ? 'above' : 'below'} the country's potential ({c.potentialGrowth}%).</li>
              <li>Education, health and infrastructure quality feed productivity <i>slowly</i> – investments take years to pay off.</li>
              <li>Weak currency raises import prices; high inflation and debt weaken it.</li>
              <li>Global factors (commodity prices, world demand) hit open economies more.</li>
            </ul>
          </Card>
        </>
      )}
      {tab === 'trends' && (
        <>
          <div className="chips">{CH.map((x) => <button key={x.id} className={x.id === ch ? 'on' : ''} onClick={() => setCh(x.id)}>{x.label}</button>)}</div>
          <Card title={cur.label}>
            <LineChart data={sr.data} years={sr.years} color={cur.color} fmt={cur.fmt} refLine={ref} />
            {ref !== undefined && <div className="tiny muted">Dashed line: {ch === 'inflation' ? 'inflation target' : 'potential growth'}</div>}
          </Card>
        </>
      )}
      {tab === 'budget' && (
        <>
          <Card title="Revenue (% of GDP, annual)">
            <div className="row between"><b>Total</b><b>{fmtPct(f.revenuePct)} · {fmtMoney(f.revenueM * 12)}/yr</b></div>
            <StackBar parts={f.taxLines.map((t, i) => ({ label: t.label, value: t.pct, color: ['#4f8cff', '#b48cff', '#34c88a', '#8d9bb8'][i] }))} />
          </Card>
          <Card title="Spending (% of GDP, annual)">
            <div className="row between"><b>Total</b><b>{fmtPct(f.spendPct + f.interestPct)} · {fmtMoney(f.spendingM * 12)}/yr</b></div>
            <StackBar parts={[
              ...(['education', 'health', 'infrastructure', 'defence', 'welfare', 'administration'] as const).map((k, i) => ({ label: SPEND_LABELS[k].split(' ')[0], value: s.spend[k], color: ['#4f8cff', '#ff6b6b', '#f5b84b', '#8d9bb8', '#34c88a', '#b48cff'][i] })),
              { label: 'Interest', value: f.interestPct, color: '#e0a3ff' },
              ...(f.ageingPct + Math.max(0, f.stabiliserPct) > 0.02 ? [{ label: 'Automatic', value: f.ageingPct + Math.max(0, f.stabiliserPct), color: '#8d9bb8' }] : []),
              ...(f.programCostPct > 0 ? [{ label: 'Programmes', value: f.programCostPct, color: '#7ad7c9' }] : []),
            ]} />
          </Card>
          {(Math.abs(f.stabiliserPct) > 0.03 || f.ageingPct > 0.03) && (
            <div className="card small">
              <b>Automatic costs</b>
              <div className="muted" style={{ marginTop: 4 }}>
                {Math.abs(f.stabiliserPct) > 0.03 && <div>Unemployment support: {fmtSigned(f.stabiliserPct)}% of GDP vs the starting level (it rises in a downturn and falls in a boom).</div>}
                {f.ageingPct > 0.03 && <div>Ageing population: +{f.ageingPct.toFixed(2)}% of GDP in pension and health costs{s.flags.pensionReform ? ' (halved by pension reform)' : ''}. Pension reform or growth can offset it.</div>}
              </div>
            </div>
          )}
          <div className="grid2">
            <Stat label="Deficit / surplus" value={`${fmtSigned(-f.deficitPct)}% GDP`} sub={`${fmtMoney(f.balanceM)} per month`} cls={f.deficitPct > 0 ? 'warn' : 'good'} />
            <Stat label="National debt" value={fmtMoney(s.debt)} sub={`${fmtPct(debtPct(s), 0)} of GDP`} />
            <Stat label="Interest bill" value={fmtPct(f.interestPct)} sub={`of GDP · ${fmtMoney(f.interestM * 12)}/yr`} cls={f.interestPct > 4.5 ? 'warn' : ''} />
            <Stat label="Before interest" value={`${fmtSigned(-f.primaryDeficitPct)}% GDP`} sub={f.primaryDeficitPct > 0 ? 'primary deficit' : 'primary surplus'} cls={f.primaryDeficitPct > 0 ? 'warn' : 'good'} />
            <Stat label="Interest vs revenue" value={`${(f.interestPct / Math.max(0.1, f.revenuePct) * 100).toFixed(0)}%`} sub={`of revenue goes to interest`} cls={f.interestPct / Math.max(0.1, f.revenuePct) > 0.12 ? 'warn' : ''} />
            <Stat label="Last month actual" value={fmtMoney(s.revenueM - s.spendingM)} sub="incl. one-off costs" />
          </div>
        </>
      )}
    </>
  );
}
