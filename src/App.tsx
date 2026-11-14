import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAuto } from './engine/save';
import { advanceMonth, dateLabel, getCountry, resolveEvent } from './engine/sim';
import type { GameState } from './engine/types';
import Economy from './ui/Economy';
import Government from './ui/Government';
import { Briefing, ElectionModal, EventModal, GameOver } from './ui/Modals';
import More from './ui/More';
import Overview from './ui/Overview';
import Politics from './ui/Politics';
import Title from './ui/Title';
import type { Ctx, Tab } from './ui/ctx';
import { fmtPct } from './ui/common';

type Modal = 'briefing' | 'election' | 'event';
const NAV: { id: Tab; ico: string; label: string }[] = [
  { id: 'overview', ico: '🏠', label: 'Overview' },
  { id: 'economy', ico: '📈', label: 'Economy' },
  { id: 'government', ico: '🏛️', label: 'Government' },
  { id: 'politics', ico: '🗳️', label: 'Politics' },
  { id: 'more', ico: '☰', label: 'More' },
];

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [queue, setQueue] = useState<Modal[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const gameRef = useRef<GameState | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  gameRef.current = game;

  const toast = useCallback((m: string) => { setToastMsg(m); window.setTimeout(() => setToastMsg(null), 1800); }, []);

  const update = useCallback((fn: (s: GameState) => void) => {
    const cur = gameRef.current; if (!cur) return;
    const next = structuredClone(cur); fn(next);
    gameRef.current = next; setGame(next);
  }, []);

  const start = (s: GameState) => { setGame(s); gameRef.current = s; setTab('overview'); setQueue([]); setShowLoad(false); saveAuto(s); };

  const advance = useCallback(() => {
    const cur = gameRef.current; if (!cur || cur.pendingEvent || cur.gameOver) return;
    const next = advanceMonth(cur);
    gameRef.current = next; setGame(next);
    saveAuto(next);
    const q: Modal[] = ['briefing'];
    if (next.lastElection) q.push('election');
    if (next.pendingEvent) q.push('event');
    setQueue(q);
  }, []);

  const closeModal = () => setQueue((q) => q.slice(1));
  const chooseEvent = (i: number) => { update((s) => { resolveEvent(s, i); }); const g = gameRef.current; if (g) saveAuto(g); };

  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [tab]);

  // Android hardware back button: go to Overview, then minimise.
  useEffect(() => {
    let remove: (() => void) | undefined;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        if (!gameRef.current) { CapApp.minimizeApp(); return; }
        setTab((t) => { if (t !== 'overview') return 'overview'; CapApp.minimizeApp(); return t; });
      }).then((h) => { remove = () => h.remove(); }).catch(() => {});
    }).catch(() => {});
    return () => remove?.();
  }, []);

  if (!game || showLoad) {
    return <div className="app"><Title onStart={start} onLoad={start} /></div>;
  }

  const c = getCountry(game);
  const ctx: Ctx = {
    s: game, update, toast, go: setTab, advance,
    openEvent: () => setQueue(['event']),
    openBriefing: () => setQueue(['briefing']),
  };
  const top = queue[0];
  const showOver = !!game.gameOver && queue.length === 0;

  return (
    <div className="app">
      <div className="topbar">
        <span className="flag">{c.flag}</span>
        <div className="grow"><div className="t1">{c.name}</div><div className="t2">{c.title} · {dateLabel(game)}</div></div>
        <span className="chip">👍 {fmtPct(game.approval, 0)}</span>
      </div>
      <div className="content" ref={contentRef}>
        {tab === 'overview' && <Overview {...ctx} />}
        {tab === 'economy' && <Economy {...ctx} />}
        {tab === 'government' && <Government {...ctx} />}
        {tab === 'politics' && <Politics {...ctx} />}
        {tab === 'more' && <More {...ctx} onLoad={start} onQuit={() => { setGame(null); gameRef.current = null; }} />}
      </div>
      <div className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id ? 'on' : ''} onClick={() => setTab(n.id)}><span className="ico">{n.ico}</span>{n.label}</button>
        ))}
      </div>
      {toastMsg && <div className="toast">{toastMsg}</div>}
      {top === 'briefing' && <Briefing s={game} onClose={closeModal} />}
      {top === 'election' && <ElectionModal s={game} onClose={closeModal} />}
      {top === 'event' && <EventModal key={game.turn} s={game} onChoose={chooseEvent} onClose={closeModal} />}
      {showOver && <GameOver s={game} onTitle={() => { setGame(null); gameRef.current = null; }} onLoad={() => setShowLoad(true)} />}
    </div>
  );
}
