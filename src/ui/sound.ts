// Tiny synthesised sound effects (WebAudio, no files, fully offline).
import { getFlag } from './prefs';
let ctx: AudioContext | null = null;
type Kind = 'tap' | 'advance' | 'alert' | 'win' | 'lose';
const SEQ: Record<Kind, [number, number][]> = {
  tap: [[660, 0.05]],
  advance: [[440, 0.07], [587, 0.09]],
  alert: [[523, 0.09], [392, 0.14]],
  win: [[523, 0.1], [659, 0.1], [784, 0.2]],
  lose: [[392, 0.14], [330, 0.14], [262, 0.28]],
};
export function play(k: Kind) {
  if (!getFlag('sound', true)) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    let t = ctx.currentTime;
    for (const [f, d] of SEQ[k]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
      t += d;
    }
  } catch { /* audio unavailable */ }
}
