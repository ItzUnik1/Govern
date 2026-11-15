import { useEffect, useState } from 'react';

const STEPS = ['Preparing the economy…', 'Seating parliament…', 'Briefing your cabinet…', 'Opening the world map…', 'Ready'];

/** Start-up screen. Waits for fonts, shows progress for a short, fixed time, and can be tapped through. */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t0 = Date.now(); const total = 2400;
    let fontsReady = false;
    try { document.fonts?.ready.then(() => { fontsReady = true; }); } catch { fontsReady = true; }
    const id = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / total) * 100);
      setPct(p);
      if (p >= 100 && (fontsReady || Date.now() - t0 > 5000)) { window.clearInterval(id); window.setTimeout(onDone, 150); }
    }, 40);
    return () => window.clearInterval(id);
  }, [onDone]);
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length))];
  return (
    <div className="splash" onClick={() => pct > 35 && onDone()}>
      <img className="logo" src="/logo.png" alt="GOVERN" width={200} height={200} />
      <div className="splash-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="small muted">{step}</div>
      <div className="tiny muted">Tap to skip</div>
    </div>
  );
}
