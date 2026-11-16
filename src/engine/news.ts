// News & inbox: headlines, economic reports, opposition criticism, public reactions and messages
// generated from what actually happened this month. Pure derived content; it never changes the simulation.
import { COUNTRIES } from './countries';
import { getBill } from './laws';
import { POSTS } from './parties';
import { getNation } from './diplomacy';
import { leadOpposition } from './rivalai';
import { incMargin, ministerAdvice, pdef, sysOf } from './politics';
import type { GameState, NewsCat, NewsItem, NewsState } from './types';

const MAX_ITEMS = 220;
export const NEWS_CATS: { id: NewsCat | 'all' | 'unread'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'unread', label: 'New' }, { id: 'national', label: 'National' }, { id: 'economy', label: 'Economy' },
  { id: 'world', label: 'World' }, { id: 'opposition', label: 'Opposition' }, { id: 'public', label: 'Public' }, { id: 'message', label: 'Messages' },
];
export function initNews(s: GameState): NewsState {
  return { items: [], nextId: 1, lastTax: { ...s.tax }, lastSpend: { ...s.spend }, seenOffers: [], seenAiNews: [], lastOppTurn: -1, seenEvents: s.eventHistory.length, seenBills: s.pol?.passed.length ?? 0, lastAdvice: {}, lastPartner: -99 };
}
export const unreadCount = (s: GameState) => s.news.items.reduce((a, n) => a + (n.unread ? 1 : 0), 0);
export function markAllRead(s: GameState) { for (const n of s.news.items) n.unread = false; }

const pick = <T,>(rnd: () => number, a: T[]): T => a[Math.floor(rnd() * a.length) % a.length];

export function stepNews(s: GameState, rnd: () => number, prev: { growth: number; inflation: number; unemployment: number; approval: number; stability: number; debtPct: number; balancePct: number; currency: number }, notes: string[]) {
  const N = s.news, c = COUNTRIES[s.countryId], P = s.pol;
  const m = (s.m + 11) % 12, y = s.m === 0 ? s.y - 1 : s.y;
  const out: Omit<NewsItem, 'id' | 'turn' | 'y' | 'm' | 'unread'>[] = [];
  const add = (cat: NewsCat, tone: NewsItem['tone'], head: string, body?: string, from?: string, link?: NewsItem['link']) => out.push({ cat, tone, head, body, from, link });
  const debtNow = (s.debt / s.gdp) * 100;
  const inGov = P.inGovernment;

  // ----- economy -----
  const dInf = s.inflation - prev.inflation;
  if (dInf >= 0.4) add('economy', 'bad', pick(rnd, [`Prices climbing: inflation reaches ${s.inflation.toFixed(1)}%`, `Shoppers feel the squeeze as inflation hits ${s.inflation.toFixed(1)}%`]), `Up from ${prev.inflation.toFixed(1)}% last month (target ${c.inflationTarget}%).`, undefined, { tab: 'economy' });
  else if (dInf <= -0.4) add('economy', 'good', `Inflation eases to ${s.inflation.toFixed(1)}%`, `Down from ${prev.inflation.toFixed(1)}%.`, undefined, { tab: 'economy' });
  const dU = s.unemployment - prev.unemployment;
  if (dU >= 0.3) add('economy', 'bad', `Jobless rate jumps to ${s.unemployment.toFixed(1)}%`, 'Firms are cutting back and hiring has slowed.', undefined, { tab: 'economy' });
  else if (dU <= -0.3) add('economy', 'good', `Unemployment falls to ${s.unemployment.toFixed(1)}%`, 'Hiring is picking up.', undefined, { tab: 'economy' });
  if (prev.growth >= 0 && s.growth < 0) add('economy', 'bad', 'Recession fears as the economy contracts', 'Economists warn of a downturn; opposition leaders call for action.', undefined, { tab: 'economy' });
  else if (prev.growth < 0 && s.growth >= 0) add('economy', 'good', 'Economy returns to growth', 'Output has stopped shrinking.', undefined, { tab: 'economy' });
  const dC = ((s.currency - prev.currency) / prev.currency) * 100;
  if (dC <= -2) add('economy', 'bad', 'Currency slides on investor jitters', `Down ${Math.abs(dC).toFixed(1)}% this month; imports will cost more.`, undefined, { tab: 'economy' });
  else if (dC >= 2) add('economy', 'good', 'Currency strengthens', `Up ${dC.toFixed(1)}% this month.`, undefined, { tab: 'economy' });
  for (const th of [60, 90, 120, 150]) if (prev.debtPct < th && debtNow >= th) add('economy', 'bad', `National debt tops ${th}% of GDP`, 'Ratings agencies and lenders are watching.', undefined, { tab: 'government' });
  if (s.turn % 3 === 0) {
    const good = s.growth >= c.potentialGrowth && s.inflation <= c.inflationTarget + 1.5 && s.unemployment <= c.unemployment0 + 1;
    const poor = s.growth < 0 || s.inflation > c.inflationTarget + 4 || s.unemployment > c.unemployment0 + 3;
    add('economy', good ? 'good' : poor ? 'bad' : 'neutral', `Quarterly report: ${pick(rnd, good ? ['a solid quarter', 'steady progress', 'better than expected'] : poor ? ['a difficult quarter', 'warning signs', 'economy under strain'] : ['a mixed picture', 'growth holds, worries remain', 'no clear direction'])}`,
      `Growth ${s.growth.toFixed(1)}%, inflation ${s.inflation.toFixed(1)}%, unemployment ${s.unemployment.toFixed(1)}%, debt ${debtNow.toFixed(0)}% of GDP.`, 'National Statistics Office', { tab: 'economy' });
  }

  // ----- national politics -----
  const dA = s.approval - prev.approval;
  if (Math.abs(dA) >= 2.5) add('national', dA > 0 ? 'good' : 'bad', `Poll: approval ${dA > 0 ? 'rises' : 'slips'} to ${s.approval.toFixed(0)}%`, dA > 0 ? 'The government gets a bounce.' : 'A bad month in the polls.', undefined, { tab: 'politics', sub: 'parties' });
  if (s.stability < 35 && prev.stability >= 35) add('national', 'bad', 'Unrest warnings as stability drops', 'Police report growing protests in several cities.', undefined, { tab: 'overview' });
  if (inGov && [12, 6, 3].includes(s.monthsToElection)) {
    const mg = incMargin(s).margin;
    add('national', mg > 2 ? 'good' : mg < -2 ? 'bad' : 'neutral', `Election in ${s.monthsToElection} months: ${mg > 2 ? 'government favoured' : mg < -2 ? 'government in trouble' : 'too close to call'}`, 'Parties are stepping up their campaigns.', undefined, { tab: 'politics', sub: 'elections' });
  }
  if (P.passed.length > N.seenBills) {
    for (const id of P.passed.slice(N.seenBills)) { const b = getBill(id); if (b) add('national', 'neutral', `Parliament passes: ${b.name}`, b.effect, undefined, { tab: 'politics', sub: 'laws' }); }
    N.seenBills = P.passed.length;
  }
  // simulation notes become headlines (skip ones already covered above)
  for (const t of notes) {
    if (/^(Interest payments|Inflation is|The economy is contracting|Tax (rises|cuts) announced)/.test(t) || /^[📣🕵️⚔️]/u.test(t)) continue;
    const cat: NewsCat = /sanction|trade|agreement|relations|talks|summit|loan|aid|offer/i.test(t) ? 'world' : 'national';
    add(cat, /resign|collapsed|quit|lost|sanctions on|crisis/i.test(t) ? 'bad' : /signed|lifted|eased|strength/i.test(t) ? 'good' : 'neutral', t.replace(/^[^\p{L}\p{N}]+/u, ''), undefined, undefined, cat === 'world' ? { tab: 'world' } : undefined);
  }

  // ----- world -----
  for (const line of s.ai.news) if (!N.seenAiNews.includes(line)) { N.seenAiNews.push(line); add('world', 'neutral', line.replace(/^\d+:\s*/, ''), undefined, undefined, { tab: 'world' }); }
  N.seenAiNews = N.seenAiNews.slice(-30);
  for (const o of s.ai.offers) if (!N.seenOffers.includes(o.id)) {
    N.seenOffers.push(o.id); const nat = getNation(o.nation);
    add('message', 'neutral', `${nat.flag} ${nat.name}: ${o.kind === 'trade' ? 'trade proposal' : o.kind === 'alliance' ? 'defence partnership' : o.kind === 'aid' ? 'development grant' : o.kind === 'demand' ? 'request to join sanctions' : 'summit invitation'}`, o.text, `${nat.name} government`, { tab: 'world' });
  }
  N.seenOffers = N.seenOffers.slice(-30);

  // ----- opposition -----
  const lead = leadOpposition(s);
  if (inGov && s.ai.opp.lastTurn === s.turn - 1 && N.lastOppTurn !== s.ai.opp.lastTurn) { N.lastOppTurn = s.ai.opp.lastTurn; add('opposition', 'bad', s.ai.opp.lastMove, undefined, lead ? pdef(sysOf(s), lead).name : undefined, { tab: 'politics', sub: 'parliament' }); }
  const dTax = (k: string) => s.tax[k as keyof typeof s.tax] - N.lastTax[k];
  const dSp = (k: string) => s.spend[k as keyof typeof s.spend] - N.lastSpend[k];
  const oppName = lead ? pdef(sysOf(s), lead).short : 'The opposition';
  const oppEcon = lead ? pdef(sysOf(s), lead).econ : 0;

  // ----- public reaction to decisions -----
  if (inGov) {
    if (dTax('incomeTax') >= 0.5) { add('public', 'bad', 'Workers brace for a bigger tax bill', 'Household groups say the rise comes at a bad time.'); add('opposition', 'bad', `${oppName} slams income tax rise as "a squeeze on working families"`, undefined, lead ? pdef(sysOf(s), lead).name : undefined); }
    else if (dTax('incomeTax') <= -0.5) add('public', 'good', 'Households welcome income tax cut');
    if (dTax('corpTax') >= 0.5) add('public', 'bad', 'Business lobby warns higher corporate tax will cost jobs', 'Investors say plans are on hold.');
    else if (dTax('corpTax') <= -0.5) add('public', 'good', 'Business groups cheer corporate tax cut', 'Executives promise more investment.');
    if (dTax('vat') >= 0.4) add('public', 'bad', 'Shoppers feel the pinch from higher VAT', 'Retailers expect weaker sales this quarter.');
    else if (dTax('vat') <= -0.4) add('public', 'good', 'VAT cut brings relief at the till');
    const sp: [string, string, string][] = [['health', 'Doctors and nurses', 'hospital funding'], ['education', 'Teachers\' unions', 'school funding'], ['welfare', 'Welfare groups', 'benefits']];
    for (const [k, who, what] of sp) {
      if (dSp(k) >= 0.2) add('public', 'good', `${who} welcome extra ${what}`);
      else if (dSp(k) <= -0.2) { add('public', 'bad', `${who} protest ${what} cuts`, 'Demonstrations are planned in the capital.'); if (oppEcon <= 0) add('opposition', 'bad', `${oppName} accuses government of "balancing the books on the backs of the vulnerable"`, undefined, lead ? pdef(sysOf(s), lead).name : undefined); }
    }
    if (s.defAvg > Math.max(6, c.deficitPct0 + 2) && oppEcon >= 0 && rnd() < 0.2) add('opposition', 'bad', `${oppName}: "Reckless borrowing is mortgaging our children's future"`, undefined, lead ? pdef(sysOf(s), lead).name : undefined, { tab: 'government' });
  }
  N.lastTax = { ...s.tax }; N.lastSpend = { ...s.spend };
  if (s.eventHistory.length > N.seenEvents) {
    for (const e of s.eventHistory.slice(N.seenEvents)) add('public', 'neutral', `Government responds to "${e.title}"`, `${e.choice.replace(/^Government: /, '')}. ${e.outcome}`);
    N.seenEvents = s.eventHistory.length;
  }

  // ----- messages from ministers and parties -----
  if (inGov && rnd() < 0.4) {
    const posts = POSTS.filter((p) => P.cabinet[p.id] && ministerAdvice(s, p.id) && s.turn - (N.lastAdvice[p.id] ?? -99) >= 6);
    if (posts.length) {
      const p = pick(rnd, posts), mn = P.cabinet[p.id]!; N.lastAdvice[p.id] = s.turn;
      const link = p.id === 'infrastructure' ? { tab: 'build', sub: 'projects' } : p.id === 'foreign' ? { tab: 'world' } : p.id === 'interior' ? { tab: 'politics', sub: 'parliament' } : { tab: 'government' };
      add('message', 'neutral', `${p.icon} ${p.label} Minister ${mn.name}`, ministerAdvice(s, p.id)!, `${p.label} Minister`, link);
    }
  }
  if (inGov && s.turn - N.lastPartner >= 8) {
    const unhappy = P.coalition.filter((id) => id !== P.pmParty && (P.parties[id]?.sat ?? 100) < 45);
    if (unhappy.length) { const id = pick(rnd, unhappy); N.lastPartner = s.turn; add('message', 'bad', `${pdef(sysOf(s), id).short}: "Our patience is wearing thin"`, `Your coalition partner says it is not getting enough of its agenda. Satisfaction ${Math.round(P.parties[id].sat)}.`, pdef(sysOf(s), id).name, { tab: 'politics', sub: 'parliament' }); }
  }

  for (const it of out) N.items.unshift({ ...it, id: N.nextId++, turn: s.turn, y, m, unread: true });
  if (N.items.length > MAX_ITEMS) N.items.length = MAX_ITEMS;
}
