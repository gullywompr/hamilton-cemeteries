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
  assert.equal(ev.length, 133, 'CLAUDE.md supersedes the spec: 133');
  const layers = {};
  for (const e of ev) layers[e.layer] = (layers[e.layer] || 0) + 1;
  assert.deepEqual(layers, { national: 37, education: 26, regional: 21, medical: 22, economic: 17, local: 10 });
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
