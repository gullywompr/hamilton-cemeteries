// The record page, "Names on the stones".
import { n } from './derive.js';
import { esc } from './timeline.js';
import { pct } from './view-shared.js';

// ---------------------------------------------------------------------------
// How the stones name people: the 1948 survey's relationship phrases, by
// period of death. Shares are of all adult (or child) stones: the record has
// no field for sex and the app does not guess it from names. Every count
// comes with the stones themselves, so the numbers lead back to people.
// ---------------------------------------------------------------------------
const stoneList = (list) => `<ul class="stone-list">${list.map(s => `<li><button class="plink" data-person="${s.id}">${esc(s.name)}</button> <span class="muted">${s.dy !== null && s.dy !== undefined ? `d. ${s.dy}` : 'no death recorded'}${s.age !== null && s.age !== undefined ? `, aged ${s.age}` : ''}</span><span class="stone-line">${esc(s.text)}</span></li>`).join('')}</ul>`;

export function namingSection(N) {
  const P = N.periods, O = N.openDate, wife = N.wifeOf.length, husband = N.husbandOf.length, kids = N.childOf.length;
  const W = 900, x0 = 250, x1 = 700, dy = 34, T = 34, rows = [];
  P.forEach(p => rows.push({ lab: p.label, k: p.wifeOf, of: p.adults, col: 'var(--s2)' }));
  P.forEach(p => rows.push({ lab: p.label, k: p.childOf, of: p.kids, col: 'var(--s1)' }));
  const gap = 18, H = T + rows.length * dy + gap + 40, X = v => x0 + (x1 - x0) * v / 100;
  const groups = [['Adults', "named as someone's wife"], ['Children under 20', 'named as a son or daughter']];
  const fig = `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of stones naming a person as a wife, or as a son or daughter, by period of death">
    ${[0, 25, 50, 75, 100].map(v => `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 8}" y2="${T + rows.length * dy + gap}" stroke="var(--rule)"/><text x="${X(v)}" y="${H - 12}" font-size="12" text-anchor="middle" fill="var(--ink-3)">${v}%</text>`).join('')}
    ${rows.map((r, i) => {
      const y = T + i * dy + dy / 2 + (i >= P.length ? gap : 0), v = pct(r.k, r.of), g = groups[i < P.length ? 0 : 1];
      return `${i % P.length === 0 ? `<text x="12" y="${y + 4}" font-size="13.5" font-weight="700" fill="var(--ink)">${g[0]}</text><text x="12" y="${y + 21}" font-size="12" fill="var(--ink-3)">${g[1]}</text>` : ''}
        <text x="${x0 - 16}" y="${y + 4}" font-size="13" text-anchor="end" fill="var(--ink-2)">${r.lab}</text>
        <line x1="${X(0)}" x2="${X(v)}" y1="${y}" y2="${y}" stroke="${r.col}" stroke-width="2.5"/><circle cx="${X(v)}" cy="${y}" r="6" fill="${r.col}" stroke="var(--stone)" stroke-width="2"/>
        <text x="${X(v) + 14}" y="${y + 5}" font-size="14" font-weight="700" fill="${r.col}">${v}%</text><text x="${X(v) + 56}" y="${y + 5}" font-size="13" fill="var(--ink-3)">${r.k} of ${n(r.of)} stones</text>`; }).join('')}
  </svg></div>`;
  const first = P[0], last = P[P.length - 1];
  return `
    <h2 data-k="The 1948 survey · Lakeview · ${n(N.read)} stones">How the stones name people</h2>
    <p class="prose">In 1948 the DAR surveyors read Lakeview's standing stones and typed what identified each person: name, dates, age, and sometimes a relationship. The project has the survey for Lakeview only; Harmony and Pleasant Valley have no 1948 readings in this record. None of the ${n(N.read)} transcriptions carries a verse, a religious phrase or a word like "Mother", so whatever else the stones say is not in this record.</p>
    <div class="callout"><p>On <b>${n(wife)} adult stones</b> a woman is named as someone's wife. On <b>${husband === 1 ? 'one' : n(husband)}</b> a man is named as someone's husband.</p><p class="narr-2">Children were named through their parents on ${pct(first.childOf, first.kids)}% of children's stones before 1900 and on ${pct(last.childOf, last.kids)}% by ${last.label}. Both habits faded over the period.</p></div>
    ${fig}
    <p class="prose small-prose">Each share is of all adult stones, or all children's stones, from deaths in that period. The record has no field for sex and the app does not guess it from names, so it cannot say what share of women's stones name a husband. Adults are people who reached 20. ${n(N.read - N.dated)} stones are left out of the shares: their age at death is not recorded, or the death came after the survey.</p>
    <details class="more"><summary>The ${n(wife)} stones that name a wife</summary>${stoneList(N.wifeOf)}</details>
    <details class="more"><summary>The ${husband === 1 ? 'one stone that names' : n(husband) + ' stones that name'} a husband</summary>${stoneList(N.husbandOf)}</details>
    <details class="more"><summary>The ${n(kids)} children named as a son or daughter</summary>${stoneList(N.childOf)}</details>
    <h3>Death dates left open</h3>
    <p class="prose">${n(O.after.length + O.noDeath.length + O.neverCut.length)} stones had a name cut and the death date left open when the survey read them, as in "1874 –" or "1883 – 19--". For <b>${n(O.after.length)}</b> the death came after 1950, when the survey was finished: the name was on the stone while the person was alive, usually beside someone already buried. For <b>${n(O.noDeath.length)}</b> no source in this record gives a death at all. For <b>${n(O.neverCut.length)}</b> the death is recorded by 1950 but the date was not yet on the stone.</p>
    <details class="more"><summary>The ${n(O.after.length)} names cut before the death</summary>${stoneList(O.after)}</details>
    <details class="more"><summary>The ${n(O.noDeath.length)} with no death in this record</summary>${stoneList(O.noDeath)}</details>
    <details class="more"><summary>The ${n(O.neverCut.length)} whose date was not yet cut</summary>${stoneList(O.neverCut)}</details>
    <div class="source"><span>SOURCE</span>timeline_people.csv: stone_1948, death_year, age_at_death · the DAR Genealogical Records Committee survey, 1948, as transcribed for Lakeview</div>`;
}
