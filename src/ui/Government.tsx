import { useState } from 'react';
import { SPEND_LABELS, TAX_LABELS } from '../engine/countries';
import { ACTIONS, PROGRAMS } from '../engine/programs';
import { actionAvailability, debtPct, fiscal, getCountry, runAction, setSpend, setTax, stockTargets, toggleProgram } from '../engine/sim';
import type { SpendKey, StockKey, TaxKey } from '../engine/types';
import { Card, Seg, fmtMoney, fmtPct, fmtSigned } from './common';
import type { Ctx } from './ctx';

const SPEND_KEYS: SpendKey[] = ['education', 'health', 'infrastructure', 'defence', 'welfare', 'administration'];
const TAX_KEYS: TaxKey[] = ['incomeTax', 'corpTax', 'vat'];
const TAX_RANGE: Record<TaxKey, [number, number]> = { incomeTax: [0, 60], corpTax: [0, 50], vat: [0, 30] };
const STOCK_OF: Partial<Record<SpendKey, StockKey>> = { education: 'education', health: 'health', infrastructure: 'infrastructure', defence: 'security', administration: 'efficiency' };
const STOCK_LABEL: Record<StockKey, string> = { education: 'Education quality', health: 'Health quality', infrastructure: 'Infrastructure', security: 'Security', efficiency: 'Govt efficiency' };
const TAX_NOTE: Record<TaxKey, string> = {
  incomeTax: 'Biggest revenue source in rich countries. Raises revenue, hurts approval and consumption.',
  corpTax: 'Raises revenue but discourages investment and hurts confidence.',
  vat: 'Broad, hard to evade. Raises prices once, and voters feel it.',
};

export default function Government({ s, update, toast }: Ctx) {
  const [tab, setTab] = useState<'budget' | 'policies' | 'actions'>('budget');
  const c = getCountry(s);
  const f = fiscal(s);
  const tg = stockTargets(s);
  const adm0 = c.rev0 + c.deficitPct0 - (c.debtPct0 * c.avgCost0) / 100 - Object.values(c.spend0).reduce((a, b) => a + b, 0);
  const base = (k: SpendKey) => (k === 'administration' ? Math.round(adm0 * 10) / 10 : c.spend0[k]);
  return (
    <>
      <Seg value={tab} onChange={setTab} options={[{ id: 'budget', label: 'Budget' }, { id: 'policies', label: 'Policies' }, { id: 'actions', label: 'Actions' }]} />

      {tab === 'budget' && (
        <>
          <Card title="Budget forecast (at current settings)">
            <div className="grid3">
              <div><div className="tiny muted">Revenue</div><b>{fmtPct(f.revenuePct)}</b></div>
              <div><div className="tiny muted">Spending</div><b>{fmtPct(f.spendPct + f.interestPct)}</b></div>
              <div><div className="tiny muted">Balance</div><b className={f.deficitPct > 0 ? 'warn' : 'good'}>{fmtSigned(-f.deficitPct)}%</b></div>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              {fmtMoney(f.balanceM)} per month · debt {fmtPct(debtPct(s), 0)} of GDP · interest {fmtPct(f.interestPct)} of GDP
            </div>
            {c.deficitCap !== null && (
              <div className={`adv ${f.capBreach ? 'bad' : f.deficitPct > c.deficitCap - 0.5 ? 'warn' : 'info'}`} style={{ marginTop: 8 }}>
                ⚖️ <span>Constitutional/EU deficit limit: {c.deficitCap}% of GDP. {f.capBreach ? 'You are in breach – stability and confidence are suffering.' : 'Stay under it (suspended in a deep recession).'}</span>
              </div>
            )}
            <div className="tiny muted" style={{ marginTop: 6 }}>Changes take effect when you advance the month. Frequent large reversals rattle investors.</div>
          </Card>

          <Card title="Taxes">
            {TAX_KEYS.map((k) => {
              const [lo, hi] = TAX_RANGE[k];
              const d = s.tax[k] - c.tax0[k];
              return (
                <div className="slider" key={k}>
                  <div className="top"><span className="name">{TAX_LABELS[k]}</span><span className="val">{s.tax[k].toFixed(1)}% <span className={`tiny ${d > 0 ? 'warn' : d < 0 ? 'good' : 'muted'}`}>{d === 0 ? '' : fmtSigned(d)}</span></span></div>
                  <input type="range" min={lo} max={hi} step={0.5} value={s.tax[k]} onChange={(e) => update((x) => setTax(x, k, parseFloat(e.target.value)))} />
                  <div className="tiny muted">{TAX_NOTE[k]}</div>
                </div>
              );
            })}
            <button className="btn sec small" onClick={() => update((x) => { TAX_KEYS.forEach((k) => setTax(x, k, c.tax0[k])); })}>Reset taxes</button>
          </Card>

          <Card title="Spending (% of GDP per year)">
            {SPEND_KEYS.map((k) => {
              const b = base(k);
              const sk = STOCK_OF[k];
              const d = s.spend[k] - b;
              const lo = Math.max(0.2, b * 0.3), hi = b * 2.2;
              return (
                <div className="slider" key={k}>
                  <div className="top"><span className="name">{SPEND_LABELS[k]}</span><span className="val">{s.spend[k].toFixed(1)}% <span className="tiny muted">({fmtMoney((s.spend[k] / 100) * s.gdp)}/yr)</span></span></div>
                  <input type="range" min={lo} max={hi} step={0.1} value={s.spend[k]} onChange={(e) => update((x) => setSpend(x, k, parseFloat(e.target.value)))} />
                  <div className="tiny muted">
                    {sk ? <>{STOCK_LABEL[sk]}: <b>{s.stocks[sk].toFixed(0)}</b> → heading to <b className={tg[sk] > s.stocks[sk] + 0.5 ? 'good' : tg[sk] < s.stocks[sk] - 0.5 ? 'bad' : ''}>{tg[sk].toFixed(0)}</b></> : 'Pensions, benefits and social support. Boosts approval immediately.'}
                    {d !== 0 && <> · {fmtSigned(d)} vs. start</>}
                  </div>
                </div>
              );
            })}
            <button className="btn sec small" onClick={() => update((x) => { SPEND_KEYS.forEach((k) => setSpend(x, k, base(k))); })}>Reset spending</button>
          </Card>
        </>
      )}

      {tab === 'policies' && (
        <>
          <div className="small muted">Standing policies stay in force (and keep costing money) until you repeal them.</div>
          {PROGRAMS.map((p) => {
            const on = !!s.programs[p.id];
            return (
              <Card key={p.id}>
                <div className="row between">
                  <h4>{p.name}</h4>
                  <span className={`chip ${on ? 'good' : ''}`}>{on ? 'Enacted' : 'Off'}</span>
                </div>
                <div className="small muted">{p.desc}</div>
                <div className="small" style={{ marginTop: 6 }}><span className="good">▲ {p.upside}</span></div>
                <div className="small"><span className="bad">▼ {p.downside}</span></div>
                <div className="tiny muted" style={{ margin: '6px 0' }}>Cost: ~{p.costPct}% of GDP per year ({fmtMoney((p.costPct / 100) * s.gdp)})</div>
                <button className={`btn small ${on ? 'sec' : ''}`} onClick={() => { update((x) => toggleProgram(x, p.id)); toast(on ? `${p.name} repealed` : `${p.name} enacted`); }}>{on ? 'Repeal' : 'Enact'}</button>
              </Card>
            );
          })}
        </>
      )}

      {tab === 'actions' && (
        <>
          <div className="small muted">One-off executive actions. They cost money now and have a cooldown.</div>
          {ACTIONS.map((a) => {
            const av = actionAvailability(s, a.id);
            return (
              <Card key={a.id}>
                <h4>{a.name}</h4>
                <div className="small muted">{a.desc}</div>
                <div className="small good" style={{ marginTop: 4 }}>{a.effect}</div>
                <div className="tiny muted" style={{ margin: '4px 0 8px' }}>Cost {fmtMoney((a.costPct / 100) * s.gdp)} · cooldown {a.cooldown} months</div>
                <button className="btn small" disabled={!av.ok} onClick={() => { let msg = ''; update((x) => { msg = runAction(x, a.id); }); toast(msg || a.name); }}>{av.ok ? 'Do it' : av.reason}</button>
              </Card>
            );
          })}
        </>
      )}
    </>
  );
}
