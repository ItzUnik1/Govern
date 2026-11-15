import { useCallback, useEffect, useRef, useState } from 'react';
import { CURRENT_BUILD, RELEASES_PAGE, checkForUpdate, downloadUpdate, installUpdate, isNative, type UpdateInfo } from '../update';

type Status = 'idle' | 'checking' | 'available' | 'uptodate' | 'error' | 'downloading' | 'ready';

export interface Updater {
  status: Status; info: UpdateInfo | null; pct: number; msg: string;
  check: (force: boolean) => void;
  start: () => void;
}

export function useUpdater(): Updater {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('');

  const busy = useRef(false);
  const check = useCallback((force: boolean) => {
    if (busy.current) return;
    busy.current = true;
    if (force) { setStatus('checking'); setMsg(''); }
    checkForUpdate(force)
      .then((u) => {
        if (u) { setInfo(u); setStatus((s) => (s === 'downloading' || s === 'ready' ? s : 'available')); }
        else if (force) setStatus('uptodate');
        else setStatus((s) => (s === 'available' ? 'idle' : s));
      })
      .catch(() => { if (force) { setStatus('error'); setMsg('Could not reach the update server. Check your internet connection.'); } })
      .finally(() => { busy.current = false; });
  }, []);

  // Quiet checks: shortly after launch and whenever the game comes back to the foreground.
  // Offline or failing background checks are silent and never block play.
  useEffect(() => {
    const t = window.setTimeout(() => check(false), 2500);
    const onVis = () => { if (document.visibilityState === 'visible') check(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
  }, [check]);

  const start = useCallback(() => {
    if (!info) return;
    if (!isNative()) { window.open(info.url, '_blank'); return; }
    setStatus('downloading'); setPct(0); setMsg('');
    downloadUpdate(info, setPct)
      .then(() => { setStatus('ready'); return installUpdate(); })
      .then((r) => { setMsg(r === 'permission' ? 'Allow installs from GOVERN in the settings screen that just opened, come back, then tap Install again.' : 'Confirm the installation in the Android prompt. GOVERN will restart with your saves intact.'); })
      .catch((e) => { setStatus('available'); setMsg(`${(e as Error).message ?? e}. You can also download the file from ${RELEASES_PAGE}`); });
  }, [info]);

  return { status, info, pct, msg, check, start };
}

export function UpdateBanner({ upd, onOpen }: { upd: Updater; onOpen: () => void }) {
  if (!upd.info || (upd.status !== 'available' && upd.status !== 'ready' && upd.status !== 'downloading')) return null;
  return (
    <button className="upd-banner" onClick={onOpen}>
      <span>⬆️</span><span className="grow"><b>Update available</b> · build {upd.info.build}</span><span className="small">View</span>
    </button>
  );
}

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

export function UpdateSheet({ upd, onClose }: { upd: Updater; onClose: () => void }) {
  const u = upd.info;
  if (!u) return null;
  const busy = upd.status === 'downloading';
  return (
    <div className="overlay"><div className="sheet">
      <h2>⬆️ Update available</h2>
      <div className="small muted">You have build {CURRENT_BUILD || 'dev'} · new build {u.build} · {mb(u.size)}</div>
      {u.notes && <div className="card small" style={{ whiteSpace: 'pre-wrap' }}>{u.notes}</div>}
      {busy && <div><div className="bar good"><i style={{ width: `${upd.pct}%` }} /></div><div className="tiny muted" style={{ marginTop: 4 }}>Downloading… {upd.pct}%</div></div>}
      {upd.msg && <div className="small warn">{upd.msg}</div>}
      <div className="tiny muted">Your saved games stay on this phone. Android will ask you to confirm the install.</div>
      <button className="btn" disabled={busy} onClick={upd.start}>{busy ? 'Downloading…' : upd.status === 'ready' ? 'Install again' : isNative() ? 'Download & install' : 'Open download'}</button>
      <button className="btn sec" onClick={onClose}>{busy ? 'Hide (keeps downloading)' : 'Not now'}</button>
    </div></div>
  );
}
