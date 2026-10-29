// Acceptance tests (APP_SPEC §9, as corrected by CLAUDE.md) against the
// built JSON in app/data. Run `npm run data` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aliveCount, familyOf, aliveOn, dayOf, bounds } from '../app/src/derive.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../app/data/${f}`, import.meta.url), 'utf8'));
const people = load('people.json');
const byId = new Map(people.map(p => [p.id, p]));
const count = (f) => people.filter(f).length;

test('counts', () => {
  assert.equal(people.length, 2732);
  assert.equal(count(p => p.use === 'yes'), 2572);
  assert.equal(count(p => p.use === 'no'), 63);
  assert.equal(count(p => p.use === 'death-only'), 50);
  assert.equal(count(p => p.use === 'birth-only'), 47);
  assert.equal(count(p => p.cem === 'L'), 2101);
  assert.equal(count(p => p.cem === 'H'), 263);
  assert.equal(count(p => p.cem === 'P'), 368);
  assert.equal(count(p => p.cod), 17);
  assert.equal(count(p => p.stone), 744);
  assert.equal(count(p => p.disp), 22);
  assert.equal(count(p => p.census.length), 374);
  assert.equal(count(p => p.census.some(c => c.occ)), 212);
  assert.equal(count(p => p.fam.length), 399);
});

test('living population by year matches the spec and reproduces timeline_population.csv exactly', () => {
  const expect = { 1800: 11, 1850: 334, 1866: 617, 1900: 1267, 1927: 1455, 1950: 1268, 2000: 413 };
  for (const [y, n] of Object.entries(expect)) assert.equal(aliveCount(people, +y), n, `year ${y}`);
  const pop = load('population.json');
  assert.equal(pop.length, 273);
  for (const [y, n] of pop) assert.equal(aliveCount(people, y), n, `population file year ${y}`);
  const peak = pop.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.deepEqual(peak, [1927, 1455]);
});

test('family integrity: the C-52 Taylor plot', () => {
  const c52 = people.filter(p => p.cem === 'L' && p.plot === 'C-52' && /taylor/i.test(p.surname));
  assert.equal(c52.length, 6);
  const lewis = people.find(p => p.name === 'Lewis Taylor');
  const fam = familyOf(lewis, byId);
  assert.deepEqual(fam.spouses.map(s => s.person.name).sort(), ['Elizabeth Roberts Taylor', 'Ruth W. Bradfield Taylor']);
  assert.deepEqual(fam.children.map(s => s.person.name).sort(), ['Ella Gertrude Taylor', 'Willie N. Taylor']);
  for (const child of fam.children) {
    const parents = familyOf(child.person, byId).parents.map(x => x.person.name).sort();
    assert.deepEqual(parents, ['Elizabeth Roberts Taylor', 'Lewis Taylor']);
  }
  for (const s of fam.spouses) assert.ok(s.basis, 'every resolved edge carries a basis');
  const george = people.find(p => p.name === 'George Oscar Taylor');
  assert.equal(george.fam.length, 0, 'his stone does not say whose son he was');
  const willie = people.find(p => p.name === 'Willie N. Taylor');
  assert.equal(willie.cod, 'Diptheria', 'source spelling preserved');
});

test('every id in every *_ids field resolves', () => {
  for (const p of people) for (const f of p.fam) assert.ok(byId.has(f.id), `${p.id} -> ${f.id}`);
});

test('event overlay', () => {
  const ev = load('events.json');
  assert.equal(ev.length, 137, 'CLAUDE.md supersedes the spec: 133, plus four founding-era events added 29 Oct 2026');
  const layers = {};
  for (const e of ev) layers[e.layer] = (layers[e.layer] || 0) + 1;
  assert.deepEqual(layers, { national: 41, education: 26, regional: 21, medical: 22, economic: 17, local: 10 });
  assert.equal(ev.filter(e => e.confidence === 'disputed').length, 1);
  assert.ok(ev.filter(e => e.confidence === 'unverified').length >= 5);
  assert.ok(ev.filter(e => !e.dated).every(e => e.date === ''));
  const rail = ev.find(e => /Washington and Ohio Railroad reaches Hamilton/.test(e.title));
  assert.equal(rail.confidence, 'disputed');
  const off = load('context.json').cemeteryOfficial;
  assert.equal(off.length, 3);
  for (const c of off) assert.ok(c.county_grave_count < c.project_record_count, c.name);
});

test('era bands', () => {
  const eras = load('eras.json');
  assert.equal(eras.length, 23);
  const layers = {};
  for (const e of eras) layers[e.layer] = (layers[e.layer] || 0) + 1;
  assert.deepEqual(layers, { documentation: 9, social: 7, education: 3, medical: 3, economic: 1 });
  const open = eras.filter(e => e.open);
  assert.deepEqual(open.map(e => e.id).sort(), ['doc-modern-survey', 'med-antibiotic']);
  for (const e of open) assert.equal(e.end, '');
  assert.deepEqual(eras.filter(e => e.confidence !== 'verified').map(e => e.id), ['econ-rural-electrification']);
  const mr = eras.find(e => e.id === 'soc-massive-resistance'), df = eras.find(e => e.id === 'soc-disfranchisement');
  assert.ok(mr.start >= df.start && mr.end <= df.end, 'massive resistance nests inside disfranchisement');
  assert.equal(new Set(eras.map(e => e.id)).size, 23);
  for (const e of eras) assert.ok(e.basis, e.id);
  const ctx = load('context.json');
  assert.equal(ctx.papers.length, 12);
  assert.equal(ctx.papers.reduce((s, p) => s + p.issues, 0), 5646);
  assert.equal(ctx.papers.find(p => p.code === 'TWEP').issues, 113);
  assert.equal(ctx.demography.length, 15);
  for (const d of ctx.demography.filter(d => d.year >= 1870)) {
    assert.equal(d.total, null); assert.equal(d.black_share_pct, null); assert.ok(d.black_total > 0);
  }
});

test('family layer', () => {
  const fam = load('family.json');
  assert.equal(fam.events.length, 336);
  assert.equal(new Set(fam.events.map(e => e.person_id)).size, 190);
  const kinds = {};
  for (const e of fam.events) kinds[e.event] = (kinds[e.event] || 0) + 1;
  assert.deepEqual(kinds, { widowed: 116, child_died: 112, child_born: 107, died_in_childbirth: 1 });
  assert.equal(fam.losses.length, 44);
  assert.equal(fam.losses.filter(l => l.n_lost >= 3).length, 4);
  assert.equal(fam.losses.filter(l => l.span_days !== null && l.span_days <= 30).length, 26);
  assert.equal(fam.births.length, 58);
  assert.equal(fam.births.filter(b => b.source.startsWith('register')).length, 48);
  assert.equal(fam.lossesCemetery.length, 42);
  assert.equal(fam.lossesCemetery.filter(c => c.assessment === 'apparent genuine loss cluster').length, 36);
  assert.equal(fam.lossesCemetery.filter(c => c.assessment.startsWith('likely DUPLICATE')).length, 6);
  assert.equal(fam.marriages.length, 8);
  assert.equal(fam.marriages.filter(m => m.not_after === null).length, 7);
  const lewis = fam.marriages.find(m => m.person_name === 'Lewis Taylor');
  assert.deepEqual([lewis.not_before, lewis.not_after], [1857, 1860]);
});

test('quality flags', () => {
  const disputed = load('disputed.json');
  const flagged = people.filter(p => p.disp);
  assert.equal(flagged.length, 22);
  for (const p of flagged) {
    assert.ok(disputed.some(d => d.person_id === p.id && d.status.startsWith('DISPUTED')), p.id);
    assert.ok(p.alt && (p.alt.by.length || p.alt.dy.length), `${p.id} has readings to show`);
  }
  const ramey = byId.get('PV0193');
  assert.equal(ramey.use, 'no');
  assert.equal(aliveOn(ramey, dayOf(1900, 1, 1)), 'unplaceable');
  // a disputed person is never 'certain' inside the disputed span
  const sag = byId.get('LV0812');
  assert.equal(aliveOn(sag, dayOf(1886, 1, 1)), 'possible');
  assert.equal(bounds(sag).b.p, 'disputed');
});

// ---------------------------------------------------------------------------
// Years lived (owner's brief, "APP_SPEC §11"): median age at death of adults
// who reached 20, Lakeview against Pleasant Valley.
// ---------------------------------------------------------------------------
test('longevity: era medians, n and gaps', () => {
  const L = load('longevity.json');
  const got = L.eras.map(e => [e.era, e.lakeview_median, e.lakeview_n, e.pv_median, e.pv_n, e.gap]);
  assert.deepEqual(got, [
    ['1920-1949', 69.0, 480, 56.0, 39, 13.0],
    ['1950-1999', 76.0, 753, 68.0, 193, 8.0],
    ['2000-2026', 79.0, 334, 75.0, 74, 4.0],
  ]);
  assert.equal(L.measure, 'median age at death, adults who reached 20');
  assert.equal(L.not, 'life expectancy at birth');
});

test('longevity: gap by decade, 1920s to 2010s, with Pleasant Valley n', () => {
  const L = load('longevity.json');
  assert.deepEqual(L.decades.map(d => d.decade), [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010]);
  assert.deepEqual(L.decades.map(d => d.gap), [10.0, 12.0, 16.0, 11.5, 8.0, 11.0, 5.0, 4.0, 3.0, 6.0]);
  assert.deepEqual(L.decades.map(d => d.pv_n), [11, 15, 13, 26, 34, 38, 42, 53, 37, 31]);
});

test('longevity: 2000-2026 is not established, the earlier eras are', () => {
  const L = load('longevity.json');
  const [a, b, c] = L.eras;
  assert.ok(a.significant && b.significant);
  assert.equal(c.significant, false);
  assert.ok(Math.abs(c.p - 0.081) < 0.0005, `p ${c.p}`);
  assert.deepEqual(c.ci95, [-2.5, 8.0]);
  assert.ok(c.ci95[0] < 0 && c.ci95[1] > 0, 'interval crosses zero');
});

test('longevity: robustness matches the reference output', () => {
  const L = load('longevity.json');
  assert.deepEqual(L.dayPrecision.map(r => r.gap), [12.5, 8.0, 3.5]);
  assert.deepEqual(Object.values(L.coverage).map(c => c.pct), [95.3, 92.4, 88.9]);
  assert.equal(L.reference.agrees, true);
});

test('longevity: the rendered section keeps the rules', async () => {
  const { longevitySection } = await import('../app/src/views.js');
  const D = { longevity: load('longevity.json') };
  const sec = longevitySection(D.longevity);
  const text = sec.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(!/life expectancy/i.test(text.replace(/This is not life expectancy|Life expectancy at birth is a different measure/g, '')), 'never called life expectancy');
  assert.match(text, /This is not life expectancy/);
  assert.match(text, /two burial populations, not two samples of Hamilton/);
  assert.match(text, /Not established/);
  assert.doesNotMatch(text, /\b4(\.0)? years\b/, 'the 2000-2026 gap is not printed as a finding');
  for (const e of D.longevity.eras) for (const k of [e.lakeview_n, e.pv_n]) assert.match(text, new RegExp(`n=${k.toLocaleString('en-US')}(?!\\d)`), `n=${k} printed`);
  for (const d of D.longevity.decades) assert.match(sec, new RegExp(`n=${d.pv_n}(?!\\d)`), `${d.decade}s Pleasant Valley n printed`);
  assert.doesNotMatch(text, /\b(because|caused by|due to|rank|ranking of the (two )?grounds is)\b/i, 'no cause, no ranking');
  assert.match(sec, /class="source"/);
});

test('longevity: the page says why the comparison starts where it does', async () => {
  const L = load('longevity.json');
  assert.deepEqual(L.before, { start: 1920, lakeview_n: 252, pv_n: 3, pv_earliest_death: 1911 });
  const { longevitySection } = await import('../app/src/views.js');
  const text = longevitySection(L).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /Why the comparison starts in 1920/);
  assert.match(text, /252 dated adult deaths at Lakeview and 3 at Pleasant Valley, the earliest in 1911, before the ground's 1922 opening/);
});

test('longevity: the 1920-1949 gap is shown to depend on year-only dates', async () => {
  const L = load('longevity.json');
  assert.deepEqual(L.bothDay.map(r => [r.era, r.lakeview_n, r.pv_n, r.gap, r.ci95, r.established]), [
    ['1920-1949', 294, 15, 12.0, [-4.0, 25.0], false],
    ['1950-1999', 555, 89, 8.0, [1.0, 11.0], true],
    ['2000-2026', 311, 48, 2.5, [-3.5, 9.0], false],
  ]);
  assert.deepEqual([L.pvHeaping.n, L.pvHeaping.ending_0_or_5], [153, 23]);
  assert.ok(L.pvHeaping.p > 0.05);
  const { longevitySection } = await import('../app/src/views.js');
  const text = longevitySection(L).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /The 1920 – 1949 gap depends on dates known only to the year\./);
  assert.match(text, /24 of Pleasant Valley's 39 adults in that era have no birth or death date to the day/);
  assert.match(text, /with 15 people left its interval runs from −4\.0 to 25\.0 and includes zero/);
  assert.match(text, /23 of 153 end in 0 or 5, fewer than the one in five/);
  // only the first era is flagged: 2000-2026 was never established, 1950-1999 holds
  assert.equal((text.match(/depends on dates known only to the year/g) || []).length, 1);
});
