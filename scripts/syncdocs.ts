// Keeps generated facts in README.md and docs/index.html in sync with the code (run by CI on every build).
// Text between <!--X-->...<!--/X--> markers is rewritten; everything else is left alone.
import { readFileSync, writeFileSync } from 'node:fs';
import { COUNTRY_LIST } from '../src/engine/countries';

const n = COUNTRY_LIST.length;
const gen: Record<string, { readme: string; site: string }> = {
  COUNTRIES: {
    readme: COUNTRY_LIST.map((c) => `${c.flag} ${c.name}`).join(' · '),
    site: COUNTRY_LIST.map((c) => c.flag).join(' '),
  },
  COUNTRYNAMES: { readme: COUNTRY_LIST.map((c) => c.name).join(', '), site: COUNTRY_LIST.map((c) => c.name).join(', ') },
  COUNT: { readme: String(n), site: String(n) },
};

function sync(file: string, kind: 'readme' | 'site') {
  let t = readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(gen)) t = t.replace(new RegExp(`(<!--${k}-->)[\\s\\S]*?(<!--/${k}-->)`, 'g'), `$1${v[kind]}$2`);
  writeFileSync(file, t);
}
sync('README.md', 'readme');
sync('docs/index.html', 'site');
console.log(`synced docs for ${n} countries`);
