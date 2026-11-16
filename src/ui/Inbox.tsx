import { useEffect, useState } from 'react';
import { MONTHS, getCountry } from '../engine/sim';
import { NEWS_CATS, markAllRead } from '../engine/news';
import type { NewsItem } from '../engine/types';
import type { Ctx, Tab } from './ctx';

const ICON: Record<string, string> = { national: '🏛️', economy: '📈', world: '🌍', opposition: '🎤', public: '👥', message: '✉️' };

export function NewsCard({ it, go }: { it: NewsItem; go: Ctx['go'] }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${it.tone === 'good' ? 'var(--good)' : it.tone === 'bad' ? 'var(--bad)' : 'var(--line)'}`, padding: '10px 12px' }}>
      <div className="row between tiny muted"><span>{ICON[it.cat]} {it.cat === 'message' ? (it.from ?? 'Message') : it.from ?? it.cat}</span>{it.unread && <b style={{ color: 'var(--accent)' }}>NEW</b>}</div>
      <div style={{ fontWeight: 650, margin: '3px 0 2px', lineHeight: 1.3 }}>{it.head}</div>
      {it.body && <div className="small muted">{it.body}</div>}
      {it.link && <button className="btn sec small" style={{ marginTop: 6 }} onClick={() => go(it.link!.tab as Tab, it.link!.sub)}>Open</button>}
    </div>
  );
}

export default function Inbox({ s, update, go }: Ctx) {
  const [cat, setCat] = useState<string>('all');
  const c = getCountry(s);
  const unread0 = s.news.items.filter((n) => n.unread).length;
  // show what was new on arrival, then mark everything read
  const [fresh] = useState(() => new Set(s.news.items.filter((n) => n.unread).map((n) => n.id)));
  useEffect(() => { if (unread0) update((g) => { markAllRead(g); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = s.news.items.filter((n) => (cat === 'all' ? true : cat === 'unread' ? fresh.has(n.id) : n.cat === cat));
  let last = '';
  return (
    <>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="tiny muted">{c.name}</div>
        <div style={{ fontFamily: 'var(--font-display, serif)', fontSize: 22, fontWeight: 700, letterSpacing: '.04em' }}>THE DAILY COURIER</div>
        <div className="tiny muted">{MONTHS[s.m]} {s.y} · {fresh.size} new</div>
      </div>
      <div className="chips">{NEWS_CATS.map((k) => <button key={k.id} className={cat === k.id ? 'on' : ''} onClick={() => setCat(k.id)}>{k.label}</button>)}</div>
      {items.length === 0 && <div className="card muted small">Nothing here yet. Advance a month and the news will start coming in.</div>}
      {items.map((it) => {
        const label = `${MONTHS[it.m]} ${it.y}`; const head = label !== last; last = label;
        return <div key={it.id}>{head && <div className="eyebrow" style={{ margin: '10px 2px 6px' }}>{label}</div>}<NewsCard it={{ ...it, unread: fresh.has(it.id) }} go={go} /></div>;
      })}
    </>
  );
}
