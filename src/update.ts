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
  addListener(ev: 'progress', fn: (p: { pct: number; bytes: number; total: number }) => void): Promise<PluginListenerHandle>;
}
const Native = registerPlugin<ApkUpdaterApi>('ApkUpdater');
export const isNative = () => Capacitor.isNativePlatform();

export interface UpdateInfo { build: number; notes: string; url: string; size: number; published: string }

const LAST = 'govern.updateCheck';
const stamp = () => { try { return Number(localStorage.getItem(LAST) ?? 0); } catch { return 0; } };

/** Returns the newer release, null if up to date, or throws if the check failed (offline etc.). */
export async function checkForUpdate(force: boolean): Promise<UpdateInfo | null> {
  if (!force && Date.now() - stamp() < 6 * 3600_000) return null;
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
    if (build <= CURRENT_BUILD) return null;
    const assets: { name: string; browser_download_url: string; size: number }[] = j.assets ?? [];
    const a = assets.find((x) => x.name === 'GOVERN.apk') ?? assets.find((x) => x.name.endsWith('.apk'));
    if (!a) return null;
    const notes = String(j.body ?? '').split('\n---')[0].trim();
    return { build, notes, url: a.browser_download_url, size: a.size, published: String(j.published_at ?? '') };
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
