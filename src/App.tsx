import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAuto } from './engine/save';
import { advanceMonth, debtPct, dateLabel, fiscal, MONTHS, getCountry, resolveEvent } from './engine/sim';
import type { GameState } from './engine/types';
import Build from './ui/Build';
import World from './ui/World';
import Economy from './ui/Economy';
import Government from './ui/Government';
import { Briefing, PeriodModal, type PeriodSummary, ElectionModal, EventModal, FormationModal, GameOver } from './ui/Modals';
import Menu from './ui/Menu';
import More from './ui/More';
import Overview from './ui/Overview';
import Politics from './ui/Politics';
import Splash from './ui/Splash';
import Title from './ui/Title';
import { UpdateBanner, UpdateSheet, useUpdater } from './ui/Update';
import type { Ctx, Tab } from './ui/ctx';
import { fmtPct } from './ui/common';
import Coach from './ui/Coach';
import { getFlag, setFlag } from './ui/prefs';
import { play } from './ui/sound';

type Modal = 'briefing' | 'period' | 'election' | 'formation' | 'event';
const NAV: { id: Tab; ico: string; label: string }[] = [
  { id: 'overview', ico: '🏠', label: 'Home' },
  { id: 'economy', ico: '📈', label: 'Economy' },
  { id: 'government', ico: '🏛️', label: 'Govern' },
  { id: 'world', ico: '🌐', label: 'World' },
  { id: 'menu', ico: '☰', label: 'Menu' },
];
/** Screens opened from the Menu hub; the Menu tab stays highlighted and a back link returns to it. */
const MENU_PAGES: Tab[] = ['politics', 'build', 'more'];

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [sub, setSub] = useState<string | undefined>(undefined);
  const goTo = useCallback((t: Tab, s2?: string) => { setSub(s2); setTab(t); }, []);
  const [queue, setQueue] = useState<Modal[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const [booting, setBooting] = useState(true);
  const [coach, setCoach] = useState(false);
  const upd = useUpdater();
  const [showUpd, setShowUpd] = useState(false);
  const gameRef = useRef<GameState | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  gameRef.current = game;

  const toast = useCallback((m: string) => { setToastMsg(m); window.setTimeout(() => setToastMsg(null), 1800); }, []);

  const update = useCallback((fn: (s: GameState) => void) => {
    const cur = gameRef.current; if (!cur) return;
    const next = structuredClone(cur); fn(next);
    gameRef.current = next; setGame(next);
  }, []);

  const start = (s: GameState) => { setGame(s); gameRef.current = s; goTo('overview'); setQueue(s.pol?.pending ? ['formation'] : []); setShowLoad(false); saveAuto(s); if (!getFlag('tutorialSeen', false)) setCoach(true); };

  const advance = useCallback(() => {
    const cur = gameRef.current; if (!cur || cur.pendingEvent || cur.gameOver || cur.pol.pending) return;
    const next = advanceMonth(cur);
    gameRef.current = next; setGame(next);
    saveAuto(next);
    const q: Modal[] = ['briefing'];
    if (next.lastElection) q.push('election');
    if (next.pol.pending) q.push('formation');
    if (next.pendingEvent) q.push('event');
    setQueue(q);
    play(next.gameOver ? (next.gameOver.kind === 'retired' ? 'win' : 'lose') : next.pendingEvent ? 'alert' : 'advance');
  }, []);

  const [period, setPeriod] = useState<PeriodSummary | null>(null);
  /** Advance several months at once; pauses on any event, election, government formation or game end. */
  const advanceMany = useCallback((n: number) => {
    const start = gameRef.current; if (!start || start.pendingEvent || start.gameOver || start.pol.pending) return;
    const snap = (g: GameState) => ({ approval: g.approval, stability: g.stability, gdp: g.gdp, growth: g.growth, inflation: g.inflation, unemployment: g.unemployment, debtPct: debtPct(g), balance: -fiscal(g).deficitPct });
    const from = snap(start), startLabel = `${MONTHS[start.m]} ${start.y}`;
    let cur: GameState = { ...start, flags: { ...start.flags, ff: 1 } }, done = 0, reason: string | null = null; const notes: string[] = [];
    for (let i = 0; i < n; i++) {
      const next = advanceMonth(cur); done++; cur = next;
      const r = next.lastReport;
      if (r) for (const x of r.notes) notes.push(`${MONTHS[(r.m + 11) % 12].slice(0, 3)} ${r.m === 0 ? r.y - 1 : r.y}: ${x}`);
      if (next.gameOver) { reason = 'The game has ended.'; break; }
      if (next.lastElection) { reason = 'Election held.'; break; }
      if (next.pol.pending) { reason = 'Government formation needs your decision.'; break; }
      if (next.pendingEvent) { reason = 'An event needs your decision.'; break; }
    }
    delete cur.flags.ff;
    gameRef.current = cur; setGame(cur); saveAuto(cur);
    setPeriod({ requested: n, done, reason, startLabel, endLabel: `${MONTHS[(cur.m + 11) % 12]} ${cur.m === 0 ? cur.y - 1 : cur.y}`, from, to: snap(cur), notes: notes.slice(-14), totalNotes: notes.length });
    const q: Modal[] = ['period'];
    if (cur.lastElection) q.push('election');
    if (cur.pol.pending) q.push('formation');
    if (cur.pendingEvent) q.push('event');
    setQueue(q);
    play(cur.gameOver ? (cur.gameOver.kind === 'retired' ? 'win' : 'lose') : cur.pendingEvent ? 'alert' : 'advance');
  }, []);

  const closeModal = () => setQueue((q) => q.slice(1));
  const chooseEvent = (i: number) => { update((s) => { resolveEvent(s, i); }); const g = gameRef.current; if (g) saveAuto(g); };

  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [tab, sub]);

  // Android hardware back button: go to Overview, then minimise.
  useEffect(() => {
    let remove: (() => void) | undefined;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        if (!gameRef.current) { CapApp.minimizeApp(); return; }
        setTab((t) => {
          if (MENU_PAGES.includes(t)) return 'menu';
          if (t !== 'overview') return 'overview';
          CapApp.minimizeApp(); return t;
        });
      }).then((h) => { remove = () => h.remove(); }).catch(() => {});
    }).catch(() => {});
    return () => remove?.();
  }, []);

  if (booting) return <div className="app"><Splash onDone={() => setBooting(false)} /></div>;

  if (!game || showLoad) {
    return (
      <div className="app">
        <Title onStart={start} onLoad={start} />
        <div className="upd-top"><UpdateBanner upd={upd} onOpen={() => setShowUpd(true)} /></div>
        {showUpd && <UpdateSheet upd={upd} onClose={() => setShowUpd(false)} />}
      </div>
    );
  }

  const c = getCountry(game);
  const ctx: Ctx = {
    s: game, update, toast, go: goTo, sub, advance, advanceMany,
    openEvent: () => setQueue(['event']),
    openBriefing: () => setQueue(['briefing']),
    replayTutorial: () => setCoach(true),
    upd, openUpdate: () => setShowUpd(true),
  };
  const quit = () => { setGame(null); gameRef.current = null; };
  const top = queue[0];
  const showOver = !!game.gameOver && queue.length === 0;

  return (
    <div className="app">
      <div className="topbar">
        <span className="flag">{c.flag}</span>
        <div className="grow"><div className="t1">{c.name}</div><div className="t2">{game.pol.inGovernment ? c.title : 'Leader of the Opposition'} · {dateLabel(game)}</div></div>
        <span className="chip">👍 {fmtPct(game.approval, 0)}</span>
      </div>
      <div className="content" ref={contentRef}>
        <UpdateBanner upd={upd} onOpen={() => setShowUpd(true)} />
        {tab === 'overview' && <Overview {...ctx} />}
        {tab === 'economy' && <Economy {...ctx} />}
        {tab === 'government' && <Government {...ctx} />}
        {MENU_PAGES.includes(tab) && <button className="back" onClick={() => goTo('menu')}>‹ Menu</button>}
        {tab === 'politics' && <Politics key={sub} {...ctx} />}
        {tab === 'world' && <World {...ctx} />}
        {tab === 'build' && <Build key={sub} {...ctx} />}
        {tab === 'more' && <More key={sub} {...ctx} onLoad={start} onQuit={quit} />}
        {tab === 'menu' && <Menu {...ctx} onQuit={quit} />}
      </div>
      <div className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id || (n.id === 'menu' && MENU_PAGES.includes(tab)) ? 'on' : ''} onClick={() => goTo(n.id)}><span className="ico">{n.ico}{n.id === 'menu' && upd.status === 'available' && <i className="dot" />}</span>{n.label}</button>
        ))}
      </div>
      {coach && <Coach go={goTo} onDone={() => { setCoach(false); setFlag('tutorialSeen', true); }} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
      {showUpd && <UpdateSheet upd={upd} onClose={() => setShowUpd(false)} />}
      {top === 'briefing' && <Briefing s={game} onClose={closeModal} />}
      {top === 'period' && period && <PeriodModal p={period} onClose={closeModal} />}
      {top === 'election' && <ElectionModal s={game} onClose={closeModal} />}
      {top === 'formation' && <FormationModal s={game} update={update} toast={toast} onDone={() => { const g = gameRef.current; if (g) saveAuto(g); closeModal(); setQueue(['election']); }} />}
      {top === 'event' && <EventModal key={game.turn} s={game} onChoose={chooseEvent} onClose={closeModal} />}
      {showOver && <GameOver s={game} onTitle={() => { setGame(null); gameRef.current = null; }} onLoad={() => setShowLoad(true)} />}
    </div>
  );
}
