// In-app updater. The game is fully offline; this only talks to GitHub when the player is online
// (a quick check on launch, or on request) and never blocks play if the network is unavailable.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const REPO = 'ItzUnik1/Govern';
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
export const CURRENT_BUILD: number = typeof __BUILD__ === 'number' ? __BUILD__ : 0;

interface ApkUpdaterApi {
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  download(o: { url: string }): Promise<{ bytes: number }>;
  install(): Promise<void>;
  setOrientation(o: { mode: string }): Promise<void>;
  addListener(ev: 'progress', fn: (p: { pct: number; bytes: number; total: number }) => void): Promise<PluginListenerHandle>;
}
const Native = registerPlugin<ApkUpdaterApi>('ApkUpdater');
/** Android only: lock the screen to portrait/landscape, or follow the phone's rotation. No-op in a browser. */
export function applyOrientation(mode: 'auto' | 'portrait' | 'landscape') {
  try { if (Capacitor.isNativePlatform()) void Native.setOrientation({ mode }).catch(() => {}); } catch { /* ignore */ }
}
export const isNative = () => Capacitor.isNativePlatform();

export interface UpdateInfo { build: number; notes: string; url: string; size: number; published: string }

const LAST = 'govern.updateCheck';
const CACHE = 'govern.updateInfo';
const stamp = () => { try { return Number(localStorage.getItem(LAST) ?? 0); } catch { return 0; } };
const cached = (): UpdateInfo | null => {
  try { const u = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as UpdateInfo | null; return u && u.build > CURRENT_BUILD ? u : null; } catch { return null; }
};
const remember = (u: UpdateInfo | null) => { try { if (u) localStorage.setItem(CACHE, JSON.stringify(u)); else localStorage.removeItem(CACHE); } catch { /* ignore */ } };

/** Returns the newer release, null if up to date, or throws if the check failed (offline etc.). */
export async function checkForUpdate(force: boolean): Promise<UpdateInfo | null> {
  // Recently checked: do not hit the network again, but still report an update we already know about.
  if (!force && Date.now() - stamp() < 15 * 60_000) return cached();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
    const j = await r.json();
    try { localStorage.setItem(LAST, String(Date.now())); } catch { /* ignore */ }
    const m = /build-(\d+)/.exec(String(j.tag_name ?? ''));
    if (!m) return null;
    const build = Number(m[1]);
    if (build <= CURRENT_BUILD) { remember(null); return null; }
    const assets: { name: string; browser_download_url: string; size: number }[] = j.assets ?? [];
    const a = assets.find((x) => x.name === 'GOVERN.apk') ?? assets.find((x) => x.name.endsWith('.apk'));
    if (!a) return null;
    const notes = String(j.body ?? '').split('\n---')[0].trim();
    const info = { build, notes, url: a.browser_download_url, size: a.size, published: String(j.published_at ?? '') };
    remember(info);
    return info;
  } finally { clearTimeout(timer); }
}

export async function downloadUpdate(u: UpdateInfo, onProgress: (pct: number) => void): Promise<void> {
  const h = await Native.addListener('progress', (p) => onProgress(p.pct));
  try { await Native.download({ url: u.url }); } finally { await h.remove(); }
}

/** Starts Android's installer. Resolves 'permission' when the user must first allow installs from GOVERN. */
export async function installUpdate(): Promise<'started' | 'permission'> {
  try { await Native.install(); return 'started'; }
  catch (e) {
    if (String((e as Error).message ?? e).includes('NEEDS_PERMISSION')) { await Native.openInstallSettings(); return 'permission'; }
    throw e;
  }
}
