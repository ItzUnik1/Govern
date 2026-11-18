import { useState } from 'react';
import type { Ctx, Tab } from './ctx';
import { getPins, togglePin } from './prefs';

interface Item { id: string; ico: string; title: string; desc: string; tab: Tab; sub?: string }
interface Group { title: string; items: Item[] }

export const MENU: Group[] = [
  { title: 'Politics', items: [
    { id: 'parliament', ico: '🏛️', title: 'Parliament', desc: 'Seats, coalition, votes', tab: 'politics', sub: 'parliament' },
    { id: 'laws', ico: '📜', title: 'Laws & bills', desc: 'Propose and whip votes', tab: 'politics', sub: 'laws' },
    { id: 'party', ico: '🧑‍🤝‍🧑', title: 'Your party', desc: 'Factions, loyalty, whips', tab: 'politics', sub: 'party' },
    { id: 'cabinet', ico: '👔', title: 'Cabinet', desc: 'Ministers and reshuffles', tab: 'politics', sub: 'cabinet' },
    { id: 'parties', ico: '🏳️', title: 'Parties', desc: 'Polls and positions', tab: 'politics', sub: 'parties' },
    { id: 'elections', ico: '🗳️', title: 'Elections', desc: 'Forecast, campaign, history', tab: 'politics', sub: 'elections' },
    { id: 'legacy', ico: '🏆', title: 'Legacy', desc: 'Your political record', tab: 'politics', sub: 'legacy' },
  ] },
  { title: 'Society', items: [
    { id: 'people', ico: '👥', title: 'People', desc: 'Ageing, migration, voting blocs', tab: 'more', sub: 'people' },
    { id: 'climate', ico: '🌍', title: 'Climate', desc: 'Emissions, disasters, green policy', tab: 'more', sub: 'climate' },
    { id: 'media', ico: '📺', title: 'Media & trust', desc: 'Scandals, spin, public trust', tab: 'more', sub: 'media' },
  ] },
  { title: 'Development', items: [
    { id: 'projects', ico: '🏗️', title: 'Projects', desc: 'National construction', tab: 'build', sub: 'projects' },
    { id: 'research', ico: '🔬', title: 'Research', desc: 'R&D budget and techs', tab: 'build', sub: 'research' },
  ] },
  { title: 'Records', items: [
    { id: 'inbox', ico: '📰', title: 'News & inbox', desc: 'Headlines, reports, messages', tab: 'more', sub: 'inbox' },
    { id: 'advisers', ico: '🧭', title: 'Advisers', desc: 'Treasury, politics, foreign', tab: 'more', sub: 'advisers' },
    { id: 'stats', ico: '📊', title: 'Statistics', desc: 'Trends since day one', tab: 'more', sub: 'stats' },
    { id: 'history', ico: '📈', title: 'History & reports', desc: 'Monthly reports and effects', tab: 'more', sub: 'history' },
    { id: 'brief', ico: '🌐', title: 'Country briefing', desc: 'Constitution and challenges', tab: 'more', sub: 'brief' },
  ] },
  { title: 'Game', items: [
    { id: 'save', ico: '💾', title: 'Save / Load', desc: 'Five slots plus autosave', tab: 'more', sub: 'save' },
    { id: 'settings', ico: '⚙️', title: 'Settings', desc: 'Theme, sound, text', tab: 'more', sub: 'settings' },
    { id: 'help', ico: '❓', title: 'How it works', desc: 'Formulas in plain language', tab: 'more', sub: 'help' },
  ] },
];
const ALL = MENU.flatMap((g) => g.items);

export default function Menu({ go, onQuit }: Ctx & { onQuit: () => void }) {
  const [pins, setPins] = useState<string[]>(getPins());
  const pinned = pins.map((id) => ALL.find((i) => i.id === id)).filter(Boolean) as Item[];
  const Card = ({ it }: { it: Item }) => (
    <div className="menu-card">
      <button className="mc-main" onClick={() => go(it.tab, it.sub)}>
        <span className="mc-ico">{it.ico}</span>
        <b>{it.title}</b>
        <span className="tiny muted">{it.desc}</span>
      </button>
      <button className={`mc-pin ${pins.includes(it.id) ? 'on' : ''}`} aria-label={pins.includes(it.id) ? `Unpin ${it.title}` : `Pin ${it.title}`} onClick={() => setPins(togglePin(it.id))}>{pins.includes(it.id) ? '★' : '☆'}</button>
    </div>
  );
  return (
    <>
      {pinned.length > 0 && (
        <div className="mgroup">
          <div className="eyebrow" style={{ margin: '2px 2px 6px' }}>Pinned</div>
          <div className="chips">{pinned.map((it) => <button key={it.id} onClick={() => go(it.tab, it.sub)}>{it.ico} {it.title}</button>)}</div>
        </div>
      )}
      {MENU.map((g) => (
        <div key={g.title} className="mgroup">
          <div className="eyebrow" style={{ margin: '8px 2px 6px' }}>{g.title}</div>
          <div className="grid2">{g.items.map((it) => <Card key={it.id} it={it} />)}</div>
        </div>
      ))}
      <div className="tiny muted mgroup" style={{ textAlign: 'center' }}>Tap ☆ on a card to pin it to the top of this menu.</div>
      <button className="btn sec mgroup" onClick={onQuit}>Quit to title screen</button>
    </>
  );
}
