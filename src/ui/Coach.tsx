import { useState } from 'react';
import type { Tab } from './ctx';

export const STEPS: { title: string; text: string; tab?: Tab }[] = [
  { title: 'Welcome, Prime Minister', text: 'You run the country month by month. Everything you change has consequences, some now and some years later.', tab: 'overview' },
  { title: 'Home', text: 'The dashboard shows approval, GDP, inflation, jobs, debt and stability. “Issues & advice” flags what needs attention. Press Advance to move to the next month.', tab: 'overview' },
  { title: 'Economy', text: 'Study trends and sectors here. Charts show whether your policies are working.', tab: 'economy' },
  { title: 'Govern', text: 'Set taxes, budgets, laws and policy. Raising taxes brings money but costs approval and growth; spending on schools and hospitals pays off slowly.', tab: 'government' },
  { title: 'World', text: 'Trade deals, loans, alliances and sanctions live here. Other countries remember how you treat them.', tab: 'world' },
  { title: 'Menu', text: 'Parliament, cabinet, elections, projects, research, statistics, advisers and saving are all in the Menu. Star the ones you use most to pin them.', tab: 'menu' },
  { title: 'Win elections', text: 'Keep approval and stability up. If you lose power you lead the opposition and can fight your way back. Good luck.', tab: 'overview' },
];

export default function Coach({ onDone, go }: { onDone: () => void; go: (t: Tab) => void }) {
  const [i, setI] = useState(0);
  const st = STEPS[i];
  const next = () => { if (i === STEPS.length - 1) { go('overview'); onDone(); } else { const n = STEPS[i + 1]; if (n.tab) go(n.tab); setI(i + 1); } };
  return (
    <div className="coach" role="dialog" aria-label="Tutorial">
      <div className="box">
        <div className="eyebrow">How to play · {i + 1}/{STEPS.length}</div>
        <h2 style={{ margin: '4px 0' }}>{st.title}</h2>
        <div className="small">{st.text}</div>
        <div className="dots">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="row">
          <button className="btn sec small" onClick={() => { go('overview'); onDone(); }}>Skip</button>
          <button className="btn" style={{ flex: 1 }} onClick={next}>{i === STEPS.length - 1 ? 'Start governing' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
