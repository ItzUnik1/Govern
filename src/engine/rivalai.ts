// Rival AI: foreign governments and the lead opposition party choose their own moves each month.
// Rule-based utility scoring, fully offline and deterministic for a given seed (uses the game's RNG).
import { RIVALS, WORLD, getNation, nationsOf } from './diplomacy';
import { coalSeats, isPresidential, pdef, sysOf, totalSeats } from './politics';
import type { AIState, GameState, Offer } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const MAX_OFFERS = 3;

/** Character of each foreign government (0..1): how eager for trade, how hawkish, how generous. */
const PERS: Record<string, { trade: number; hawk: number; aid: number }> = {
  usa: { trade: 0.6, hawk: 0.8, aid: 0.5 }, china: { trade: 0.9, hawk: 0.6, aid: 0.4 }, eu: { trade: 0.85, hawk: 0.25, aid: 0.6 },
  japan: { trade: 0.7, hawk: 0.3, aid: 0.7 }, india: { trade: 0.5, hawk: 0.5, aid: 0.2 }, uk: { trade: 0.7, hawk: 0.5, aid: 0.5 },
  gulf: { trade: 0.6, hawk: 0.2, aid: 0.7 }, asean: { trade: 0.8, hawk: 0.1, aid: 0.2 }, russia: { trade: 0.4, hawk: 0.9, aid: 0.1 },
  canada: { trade: 0.7, hawk: 0.2, aid: 0.6 }, brazil: { trade: 0.6, hawk: 0.2, aid: 0.2 }, australia: { trade: 0.7, hawk: 0.4, aid: 0.5 },
  pakistan: { trade: 0.4, hawk: 0.6, aid: 0.1 },
};

export function initAI(s: GameState): AIState {
  const nations: AIState['nations'] = {};
  for (const n of nationsOf(s)) nations[n.id] = { mood: 0, lastAct: -99 };
  return { nations, offers: [], opp: { momentum: 0, lastMove: 'Regrouping after the last election.', lastTurn: -5 }, news: [], nextId: 1 };
}

const pick = <T,>(rnd: () => number, a: T[]): T => a[Math.floor(rnd() * a.length) % a.length];
const say = (s: GameState, t: string) => { s.ai.news.unshift(`${s.y}: ${t}`); s.ai.news = s.ai.news.slice(0, 12); };

function addOffer(s: GameState, o: Omit<Offer, 'id' | 'turn' | 'expires'>) {
  if (s.ai.offers.length >= MAX_OFFERS || s.ai.offers.some((x) => x.nation === o.nation)) return false;
  s.ai.offers.push({ ...o, id: s.ai.nextId++, turn: s.turn, expires: s.turn + 4 });
  return true;
}

/** Monthly rival decisions. Call once per turn after diplomacy is updated. */
export function stepRivalAI(s: GameState, rnd: () => number, notes: string[]) {
  const A = s.ai, D = s.dip;
  // expire stale offers
  A.offers = A.offers.filter((o) => {
    if (o.expires > s.turn) return true;
    const n = D.nations[o.nation]; if (n) n.rel = clamp(n.rel - 1, 2, 98);
    notes.push(`${getNation(o.nation).flag} ${getNation(o.nation).name}'s offer lapsed unanswered.`);
    return false;
  });
  const gdppc = (s.gdp * 1000) / s.population;
  const allies = Object.keys(D.nations).filter((k) => D.nations[k].ally);

  for (const n of nationsOf(s)) {
    const st = D.nations[n.id], mem = A.nations[n.id] ?? (A.nations[n.id] = { mood: 0, lastAct: -99 });
    const p = PERS[n.id] ?? { trade: 0.5, hawk: 0.4, aid: 0.3 };
    mem.mood = clamp(mem.mood * 0.97 + 0.04 * (st.rel - 50), -100, 100);
    if (s.turn - mem.lastAct < 5) continue;
    if (rnd() > 0.05 + 0.05 * Math.min(1, n.size / 10)) continue;
    const rivalOfAlly = allies.some((a) => RIVALS[n.id]?.includes(a));
    // candidate moves with a utility score each; highest wins
    const opts: { u: number; act: () => void }[] = [];
    if (s.pol.inGovernment) {
      if (st.rel >= 56 && st.trade < 2 && !st.negotiating && !st.sanctionsYou && !st.sanctionedByYou) {
        opts.push({ u: p.trade * (st.rel - 45) / 40 + 0.15 * rnd(), act: () => addOffer(s, { nation: n.id, kind: 'trade', text: `${n.name} proposes ${st.trade === 0 ? 'a free-trade agreement' : 'a deeper trade partnership'}. Cheaper imports and new export markets, but local industries face competition.` }) });
      }
      if (st.rel >= 72 && !st.ally && n.size >= 3 && p.hawk >= 0.3) {
        opts.push({ u: 0.5 + p.hawk * 0.4 * (st.rel - 65) / 30, act: () => addOffer(s, { nation: n.id, kind: 'alliance', text: `${n.name} offers a defence partnership. Security and stability, but their rivals will resent it.` }) });
      }
      if (n.rich && gdppc < 15000 && st.rel >= 55) {
        opts.push({ u: p.aid * 0.8 + 0.1 * rnd(), act: () => addOffer(s, { nation: n.id, kind: 'aid', text: `${n.name} offers a development grant of about ${(0.0035 * s.gdp).toFixed(1)} bn. Taking it ties you to their foreign-policy line.` }) });
      }
      if (st.rel >= 50) {
        const target = Object.keys(D.nations).find((t) => RIVALS[n.id]?.includes(t) && D.nations[t].rel >= 40 && !D.nations[t].sanctionedByYou);
        if (target && n.size >= 3) opts.push({ u: p.hawk * 0.9 * (n.size / 20 + 0.4) + 0.1 * rnd(), act: () => addOffer(s, { nation: n.id, kind: 'demand', target, text: `${n.name} asks you to join sanctions against ${getNation(target).name}. Refusing will cool relations; agreeing angers ${getNation(target).name}.` }) });
      }
      if (st.rel >= 50) opts.push({ u: 0.25 + 0.2 * rnd(), act: () => addOffer(s, { nation: n.id, kind: 'summit', text: `${n.name} invites you to a leaders' summit. A chance to deepen ties for a small cost.` }) });
    }
    // hostile moves work in opposition too (they are aimed at the country)
    if (st.rel < 28 && rivalOfAlly && !st.sanctionsYou && p.hawk >= 0.5) {
      opts.push({ u: 0.9 * p.hawk, act: () => { st.sanctionsYou = true; st.rel = clamp(st.rel - 4, 2, 98); notes.push(`⚠️ ${n.flag} ${n.name} has imposed sanctions on your country.`); say(s, `${n.name} sanctioned you`); } });
    }
    if (st.sanctionsYou && st.rel >= 40 && rnd() < 0.3) opts.push({ u: 0.8, act: () => { st.sanctionsYou = false; notes.push(`${n.flag} ${n.name} eased its sanctions on you.`); } });
    // world news between other countries that touches you
    if (rnd() < 0.15) {
      const foes = RIVALS[n.id]?.filter((r) => r !== s.countryId);
      if (foes?.length) {
        const f = foes[Math.floor(rnd() * foes.length)];
        opts.push({ u: 0.3 * rnd() + 0.05, act: () => {
          const calm = rnd() < 0.4;
          say(s, calm ? `${n.name} and ${getNation(f)?.name ?? f} hold talks to ease tensions.` : `Tension rises between ${n.name} and ${getNation(f)?.name ?? f}.`);
          if (!calm) { if (st.ally && D.nations[f]) D.nations[f].rel = clamp(D.nations[f].rel - 2, 2, 98); if (D.nations[f]?.ally) st.rel = clamp(st.rel - 2, 2, 98); }
        } });
      }
    }
    if (!opts.length) continue;
    opts.sort((a, b) => b.u - a.u);
    mem.lastAct = s.turn; opts[0].act();
  }

  // ---- lead opposition party ----
  stepOpposition(s, rnd, notes);
  // keep AI roster in sync (loaded saves, new nations)
  void WORLD;
}

/** The strongest party outside government. */
export function leadOpposition(s: GameState): string | null {
  const P = s.pol; const sy = sysOf(s);
  let best: string | null = null, seats = -1;
  for (const d of sy.parties) {
    if (P.coalition.includes(d.id) || d.id === P.pmParty || d.id === P.playerParty && !P.inGovernment) continue;
    const sv = P.parties[d.id]?.seats ?? 0; if (sv > seats) { seats = sv; best = d.id; }
  }
  return best;
}

function stepOpposition(s: GameState, rnd: () => number, notes: string[]) {
  const A = s.ai, P = s.pol, o = A.opp;
  o.momentum = clamp(o.momentum * 0.9, -6, 6);
  if (!P.inGovernment) return; // when you are the opposition the AI government is handled by oppositionDrift
  const lead = leadOpposition(s); if (!lead) return;
  const nm = pdef(sysOf(s), lead).short;
  const weak = (s.approval < 42 ? 1 : 0) + (s.growth < 0 ? 1 : 0) + (s.inflation > 6 ? 1 : 0) + (s.unemployment > 8 ? 1 : 0) + (s.stability < 45 ? 1 : 0);
  if (rnd() > 0.28) return;
  const minority = !isPresidential(s) && coalSeats(s) / Math.max(1, totalSeats(s)) < 0.5;
  const shaky = P.coalition.filter((id) => id !== P.pmParty && (P.parties[id]?.sat ?? 100) < 48);
  const mo = [{ k: 'attack', u: 0.35 + 0.25 * weak }, { k: 'poach', u: shaky.length ? 0.5 + 0.1 * shaky.length : -1 }, { k: 'noconf', u: minority && s.approval < 40 ? 0.7 : -1 }, { k: 'policy', u: 0.3 + 0.1 * rnd() }].sort((a, b) => b.u - a.u)[0];
  o.lastTurn = s.turn;
  if (mo.k === 'attack') {
    if (weak >= 2) { o.momentum = clamp(o.momentum + 0.5 + 0.2 * weak, -6, 6); s.approval = clamp(s.approval - 0.5, 3, 95); o.lastMove = pick(rnd, [`${nm} hammers the government over the economy.`, `${nm} says families are paying for your failures.`, `${nm} leads a heated debate on the cost of living.`]); notes.push(`📣 ${o.lastMove}`); }
    else { o.momentum = clamp(o.momentum - 0.3, -6, 6); o.lastMove = pick(rnd, [`${nm} attacks your record, but with the economy in decent shape it falls flat.`, `${nm} calls for a change, yet voters seem unmoved.`, `${nm} demands an inquiry; the public shrugs.`]); notes.push(`📣 ${o.lastMove}`); }
  } else if (mo.k === 'poach') {
    const id = shaky[Math.floor(rnd() * shaky.length)];
    P.parties[id].sat = clamp(P.parties[id].sat - 6, 0, 100);
    o.lastMove = `${nm} quietly courts your coalition partner ${pdef(sysOf(s), id).short}.`; notes.push(`🕵️ ${o.lastMove}`);
  } else if (mo.k === 'noconf') {
    o.momentum = clamp(o.momentum + 1, -6, 6); s.stability = clamp(s.stability - 1, 3, 98);
    o.lastMove = `${nm} threatens a no-confidence motion.`; notes.push(`⚔️ ${o.lastMove}`);
  } else {
    o.momentum = clamp(o.momentum + 0.15, -6, 6);
    o.lastMove = pick(rnd, [`${nm} unveils a rival policy platform and gets good press.`, `${nm} launches a listening tour in the regions.`, `${nm} promises a different path in a keynote speech.`]); notes.push(`📣 ${o.lastMove}`);
  }
}

/** Opposition momentum shifts the incumbent's vote and the risk of a no-confidence vote. */
export const oppMomentum = (s: GameState) => s.ai?.opp.momentum ?? 0;

export function answerOffer(s: GameState, id: number, accept: boolean): string | null {
  if (!s.pol.inGovernment) return 'Only the government can answer offers.';
  const i = s.ai.offers.findIndex((o) => o.id === id); if (i < 0) return 'That offer is gone.';
  const o = s.ai.offers[i]; s.ai.offers.splice(i, 1);
  const n = s.dip.nations[o.nation], nat = getNation(o.nation);
  if (!n) return null;
  if (!accept) {
    n.rel = clamp(n.rel - (o.kind === 'demand' ? 6 : 1), 2, 98);
    return `You declined ${nat.name}'s ${o.kind === 'demand' ? 'request' : 'offer'}.`;
  }
  switch (o.kind) {
    case 'trade': n.trade = Math.min(2, n.trade + 1) as 1 | 2; n.rel = clamp(n.rel + 4, 2, 98); s.approval = clamp(s.approval + 0.5, 3, 95); say(s, `Trade pact with ${nat.name}`); return `Trade agreement with ${nat.name} signed.`;
    case 'alliance': n.ally = true; n.rel = clamp(n.rel + 6, 2, 98); s.stability = clamp(s.stability + 1, 3, 98); say(s, `Defence partnership with ${nat.name}`); return `You are now defence partners with ${nat.name}.`;
    case 'aid': s.pendingCosts -= 0.0035 * s.gdp; n.rel = clamp(n.rel + 3, 2, 98); for (const r of RIVALS[o.nation] ?? []) if (s.dip.nations[r]) s.dip.nations[r].rel = clamp(s.dip.nations[r].rel - 5, 2, 98); s.approval = clamp(s.approval + 0.8, 3, 95); return `${nat.name} grant accepted; their rivals are unimpressed.`;
    case 'demand': { const t = o.target && s.dip.nations[o.target]; if (t) { t.sanctionedByYou = true; t.rel = clamp(t.rel - 12, 2, 98); } n.rel = clamp(n.rel + 8, 2, 98); say(s, `You joined ${nat.name} in sanctioning ${o.target ? getNation(o.target).name : 'a rival'}`); return `You join the sanctions. ${nat.name} is pleased.`; }
    case 'summit': s.pendingCosts += 0.0005 * s.gdp; n.rel = clamp(n.rel + 8, 2, 98); s.approval = clamp(s.approval + 0.4, 3, 95); return `Summit with ${nat.name}: warm relations.`;
  }
  return null;
}
