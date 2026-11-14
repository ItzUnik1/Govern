import { useState } from 'react';
import { borrowingRate, debtPct, fiscal, gdpPerCapita, getCountry } from '../engine/sim';
import { LineChart, StackBar, series, type SeriesKey } from './charts';
import { Card, Stat, fmtMoney, fmtPct, fmtSigned, Seg } from './common';
import type { Ctx } from './ctx';
import { SPEND_LABELS } from '../engine/countries';

const CH: { id: SeriesKey; label: string; fmt: (x: number) => string; color: string; ref?: (t: number) => number }[] = [
  { id: 'growth', label: 'Growth', fmt: (x) => x.toFixed(1) + '%', color: '#34c88a' },
  { id: 'inflation', label: 'Inflation', fmt: (x) => x.toFixed(1) + '%', color: '#ff6b6b' },
  { id: 'unemployment', label: 'Jobless', fmt: (x) => x.toFixed(1) + '%', color: '#f5b84b' },
  { id: 'debtPct', label: 'Debt/GDP', fmt: (x) => x.toFixed(0) + '%', color: '#b48cff' },
  { id: 'balancePct', label: 'Balance', fmt: (x) => x.toFixed(1) + '%', color: '#4f8cff' },
  { id: 'gdp', label: 'GDP', fmt: (x) => (x >= 1000 ? (x / 1000).toFixed(1) + 'T' : x.toFixed(0)), color: '#8fd0ff' },
  { id: 'currency', label: 'Currency', fmt: (x) => x.toFixed(0), color: '#e0a3ff' },
  { id: 'confidence', label: 'Confidence', fmt: (x) => x.toFixed(0), color: '#7ad7c9' },
];

export default function Economy({ s }: Ctx) {
  const [tab, setTab] = useState<'now' | 'trends' | 'budget'>('now');
  const [ch, setCh] = useState<SeriesKey>('growth');
  const c = getCountry(s);
  const f = fiscal(s);
  const cur = CH.find((x) => x.id === ch)!;
  const sr = series(s.history, ch);
  const ref = ch === 'inflation' ? c.inflationTarget : ch === 'growth' ? c.potentialGrowth : undefined;
  return (
    <>
      <Seg value={tab} onChange={setTab} options={[{ id: 'now', label: 'Indicators' }, { id: 'trends', label: 'Trends' }, { id: 'budget', label: 'Public finances' }]} />
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
              ...(f.programCostPct > 0 ? [{ label: 'Programmes', value: f.programCostPct, color: '#7ad7c9' }] : []),
            ]} />
          </Card>
          <div className="grid2">
            <Stat label="Deficit / surplus" value={`${fmtSigned(-f.deficitPct)}% GDP`} sub={`${fmtMoney(f.balanceM)} per month`} cls={f.deficitPct > 0 ? 'warn' : 'good'} />
            <Stat label="National debt" value={fmtMoney(s.debt)} sub={`${fmtPct(debtPct(s), 0)} of GDP`} />
            <Stat label="Interest bill" value={fmtPct(f.interestPct)} sub={`of GDP · ${fmtMoney(f.interestM * 12)}/yr`} cls={f.interestPct > 4.5 ? 'warn' : ''} />
            <Stat label="Last month actual" value={fmtMoney(s.revenueM - s.spendingM)} sub="incl. one-off costs" />
          </div>
        </>
      )}
    </>
  );
}
