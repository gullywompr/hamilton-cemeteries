// Builds app/data/*.json from data/*.csv.
//
// data/ is read-only input. This script only reads it. Every output file is
// a straight reshaping of one or more CSVs; nothing is invented or
// estimated. The one merge is the owner's: records confirmed as the same
// person in curation/duplicates.csv become one person (section 1). Where a rule from APP_SPEC.md applies (timeline_usable,
// precision, disputed dates, the relationship filter) it is applied here
// and noted inline.

import { readCsv } from './csv.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'app', 'data');
mkdirSync(OUT, { recursive: true });

const csv = (name) => readCsv(join(DATA, name));
const write = (name, obj) => {
  writeFileSync(join(OUT, name), JSON.stringify(obj));
  console.log(`  ${name.padEnd(28)} ${JSON.stringify(obj).length.toLocaleString()} bytes`);
};
const split = (s) => (s ? s.split(';').map(x => x.trim()).filter(Boolean) : []);
const int = (s) => (s === '' || s == null ? null : Number.parseInt(s, 10));
const YEAR_RE = /\b(1[6-9]\d\d|20\d\d)\b/g;

console.log('Building app/data from data/ …');

// ---------------------------------------------------------------------------
// 1. People — data/timeline_people.csv is the only person-level input (§2.1)
// ---------------------------------------------------------------------------
const peopleRows = csv('timeline_people.csv');
const CENSUS_YEARS = [1880, 1900, 1910, 1920, 1930, 1940, 1950];
const CEM = { Lakeview: 'L', Harmony: 'H', 'Pleasant Valley': 'P' };

// Relationship bases (§3.4): re-apply the filter when reading relationships_v2.
const relRows = csv('relationships_v2.csv').filter(r =>
  r.related_person_id !== '' && !r.date_check.startsWith('FAILS'));
const basisKey = (a, rel, b) => `${a}|${rel}|${b}`;
const basis = new Map();
for (const r of relRows) {
  basis.set(basisKey(r.person_id, r.relation, r.related_person_id), { conf: r.confidence, basis: r.basis, src: r.source_field });
}
function edgeBasis(pid, rel, oid) {
  // spouse: either direction; parent: pid child_of oid; child: oid child_of pid
  if (rel === 'spouse') return basis.get(basisKey(pid, 'spouse_of', oid)) || basis.get(basisKey(oid, 'spouse_of', pid)) || null;
  if (rel === 'parent') return basis.get(basisKey(pid, 'child_of', oid)) || basis.get(basisKey(oid, 'parent_of', pid)) || null;
  if (rel === 'child') return basis.get(basisKey(oid, 'child_of', pid)) || basis.get(basisKey(pid, 'parent_of', oid)) || null;
  return null;
}

// Disputed dates (§3.3): both readings travel with the person. We extract the
// years named in each reading so the timeline can treat the date as a range;
// the readings themselves are shown verbatim and neither is chosen.
const disputedRows = csv('disputed_dates.csv');
const disputedByPerson = new Map();
for (const r of disputedRows) {
  if (!disputedByPerson.has(r.person_id)) disputedByPerson.set(r.person_id, []);
  disputedByPerson.get(r.person_id).push(r);
}
function yearsIn(text) { return [...text.matchAll(YEAR_RE)].map(m => Number(m[1])); }
function altYears(pid) {
  const rows = (disputedByPerson.get(pid) || []).filter(r => r.status.startsWith('DISPUTED'));
  if (!rows.length) return null;
  const by = new Set(), dy = new Set();
  for (const r of rows) {
    const m = yearsIn(r.reading_modern); const d = yearsIn(r.reading_dar);
    if (m.length) { by.add(m[0]); dy.add(m[m.length - 1]); }
    if (d.length) { by.add(d[0]); dy.add(d[d.length - 1]); }
  }
  return { by: [...by].sort(), dy: [...dy].sort() };
}

// A death date left open on the stone, as the 1948-50 survey typed it:
// "1874 -", "1856 - 19", "19--", "d. May __, 193--", or a closing "d." with
// only one year on the stone (a full date followed by "d." is not open).
const stoneOpen = (s) => {
  const t = (s || '').trim();
  if (!t) return false;
  if (/(?:-|–)\s*(?:19[-_]*)?\s*$/.test(t) || /19--|__/.test(t)) return true;
  return /\bd\.\s*$/.test(t) && (t.match(/\b1[789]\d\d\b/g) || []).length < 2;
};
const records = peopleRows.map(r => {
  const census = CENSUS_YEARS
    .filter(y => r[`census_${y}_match`] || r[`census_${y}_occupation`])
    .map(y => ({ y, occ: r[`census_${y}_occupation`] || '', ind: r[`census_${y}_industry`] || '', cls: r[`census_${y}_class`] || '', match: r[`census_${y}_match`] || '', zone: r[`census_${y}_zone`] || '' }));
  const fam = [];
  for (const [rel, idKey, nameKey] of [['spouse', 'spouse_ids', 'spouse_names'], ['parent', 'parent_ids', 'parent_names'], ['child', 'child_ids', 'child_names']]) {
    const ids = split(r[idKey]), names = split(r[nameKey]);
    ids.forEach((id, k) => fam.push({ rel, id, name: names[k] || '', ...(edgeBasis(r.person_id, rel, id) || { conf: '', basis: '' }) }));
  }
  const p = {
    id: r.person_id, name: r.name, surname: r.surname, cem: CEM[r.cemetery], plot: r.plot,
    bd: r.birth_date, bp: r.birth_precision, dd: r.death_date, dp: r.death_precision,
    by: int(r.birth_year), dy: int(r.death_year), age: int(r.age_at_death),
    use: r.timeline_usable, note: r.timeline_note, disp: r.date_disputed === 'yes',
    fam, cod: r.cause_of_death, occ: r.occupation, regParents: r.parents_named_in_register,
    birthplace: r.birthplace, regVerbatim: r.register_verbatim, stone: r.stone_1948, stoneOpen: stoneOpen(r.stone_1948),
    mil: r.military, vet: r.veteran === '1', src: r.sources, census,
  };
  if (p.disp) p.alt = altYears(p.id);
  return p;
});
{
  const ids = new Set(records.map(p => p.id));
  for (const p of records) for (const f of p.fam) if (!ids.has(f.id)) throw new Error(`dangling id ${f.id} on ${p.id}`);
}

// Duplicate records (curation/duplicates.csv, the owner's decisions of 29 Oct
// 2026). data/ keeps every record; here each confirmed group becomes one
// person: the record named in `keep` stands for them, the others are listed
// on it as `aka` and still found by search and by id. A blank field on the
// kept record takes the value from a folded copy of the same person; no field
// that both carry is changed. Pairs marked "not sure" stay two people, each
// naming the other as `maybe`. So do pairs marked "unresolved": a birth-only
// record whose birth date is, to the day, the death date of a same-named
// record, possibly a death entered as a birth; the owner left them open.
// Every count from here on is of people.
const dupRows = readCsv(join(ROOT, 'curation', 'duplicates.csv'));
const recById = new Map(records.map(p => [p.id, p]));
const KEEP = new Map();           // folded record id -> kept record id
for (const d of dupRows) {
  if (d.verdict !== 'same person') continue;
  if (!recById.has(d.a_id) || !recById.has(d.b_id) || !recById.has(d.keep)) throw new Error(`duplicates.csv: unknown id in ${d.a_id}-${d.b_id}`);
  if (d.keep !== d.a_id && d.keep !== d.b_id && !KEEP.has(d.a_id) && !KEEP.has(d.b_id)) throw new Error(`duplicates.csv: keep ${d.keep} is in neither ${d.a_id} nor ${d.b_id}`);
  for (const x of [d.a_id, d.b_id]) if (x !== d.keep) {
    if (KEEP.has(x) && KEEP.get(x) !== d.keep) throw new Error(`duplicates.csv: ${x} kept as two different people`);
    KEEP.set(x, d.keep);
  }
}
for (const k of new Set(KEEP.values())) if (KEEP.has(k)) throw new Error(`duplicates.csv: kept record ${k} is itself folded`);
const canon = (id) => KEEP.get(id) || id;
const FOLDED = new Set(KEEP.keys());
const FILL = ['plot', 'cod', 'occ', 'regParents', 'birthplace', 'regVerbatim', 'stone', 'mil'];
const people = records.filter(p => !FOLDED.has(p.id)).map(p => ({ ...p, fam: p.fam.slice(), census: p.census.slice(), aka: [], maybe: [] }));
const personById = new Map(people.map(p => [p.id, p]));
for (const r of records) {
  if (!FOLDED.has(r.id)) continue;
  const p = personById.get(canon(r.id));
  p.aka.push({ id: r.id, name: r.name, src: r.src, bd: r.bd, dd: r.dd, plot: r.plot, stone: r.stone });
  for (const k of FILL) if (!p[k] && r[k]) p[k] = r[k];
  if (!p.stone && r.stone) p.stoneOpen = r.stoneOpen;
  if (!p.vet && r.vet) p.vet = true;
  for (const c of r.census) if (!p.census.some(x => x.y === c.y)) p.census.push(c);
  p.census.sort((a, b) => a.y - b.y);
  p.fam.push(...r.fam);
}
// Family links follow a folded record to its person; a link a person now has
// twice (once through each copy) is kept once, and a link to oneself is dropped.
for (const p of people) {
  const seen = new Set();
  p.fam = p.fam.map(f => ({ ...f, id: canon(f.id) })).filter(f => {
    const k = `${f.rel}|${f.id}`;
    if (f.id === p.id || seen.has(k)) return false;
    seen.add(k); return true;
  });
  for (const f of p.fam) { const q = personById.get(f.id); if (q) f.name = q.name; }
}
for (const d of dupRows) {
  if (d.verdict !== 'not sure' && d.verdict !== 'unresolved') continue;
  const a = personById.get(canon(d.a_id)), b = personById.get(canon(d.b_id));
  if (!a || !b) throw new Error(`duplicates.csv: unknown id in ${d.a_id}-${d.b_id}`);
  if (a === b) continue;
  const why = d.verdict === 'unresolved' ? 'birth-is-death' : 'dates-agree';
  if (!a.maybe.some(m => m.id === b.id)) a.maybe.push({ id: b.id, name: b.name, why });
  if (!b.maybe.some(m => m.id === a.id)) b.maybe.push({ id: a.id, name: a.name, why });
}
for (const p of people) for (const f of p.fam) if (!personById.has(f.id)) throw new Error(`dangling id ${f.id} on ${p.id}`);

// Single records the owner left unresolved (curation/unresolved.csv): a
// birth-only record whose 1948 stone reading gives the same date as a death,
// with an age at death. No date is moved; the card says so.
const UNRESOLVED = { 'stone gives the birth date as a death': 'stone-gives-death' };
const unresolvedRows = readCsv(join(ROOT, 'curation', 'unresolved.csv'));
for (const u of unresolvedRows) {
  const p = personById.get(canon(u.person_id));
  if (!p) throw new Error(`unresolved.csv: unknown id ${u.person_id}`);
  if (!UNRESOLVED[u.issue]) throw new Error(`unresolved.csv: unknown issue "${u.issue}" on ${u.person_id}`);
  p.unresolved = UNRESOLVED[u.issue];
}

// Dates the owner corrected against a later record (curation/date_corrections.csv,
// from 30 Oct 2026). data/ keeps the date as recorded and the record-level
// population check above runs on it; the person carries the corrected date and
// what it replaced, so the card can say so. Only death dates are corrected.
const correctionRows = readCsv(join(ROOT, 'curation', 'date_corrections.csv'));
for (const c of correctionRows) {
  const p = personById.get(canon(c.person_id));
  if (!p) throw new Error(`date_corrections.csv: unknown id ${c.person_id}`);
  if (c.field !== 'death_date') throw new Error(`date_corrections.csv: only death_date is corrected, not ${c.field}`);
  if (String(p.dy) !== c.recorded.slice(0, 4)) throw new Error(`date_corrections.csv: ${c.person_id} has death year ${p.dy}, not ${c.recorded}`);
  p.corrected = { field: 'death', recorded: p.dd, recordedP: p.dp, basis: c.basis, source: c.source, decided: c.decided };
  p.dd = c.corrected; p.dp = c.precision; p.dy = int(c.corrected.slice(0, 4));
  p.age = c.age_at_death === '' ? null : int(c.age_at_death); // as the source states it, not computed from a year-only birth
}

// Possibly living (owner's decision, 29 Oct 2026). A person with no death
// date who was born within the last LIVING_SPAN years may still be alive, and
// a stone cut in advance names them. The app keeps them findable by name but
// does not publish their birth date, or the stone reading that carries it.
// Every count below is still taken on the full record (743 stones were read);
// only what is written out is withheld, and `withheld` marks it, so the card
// can say so. Withheld is not unknown. A record whose stone records a death
// (curation/unresolved.csv) is not withheld: the owner's decision of 29 Oct.
const LIVING_SPAN = 110, NOW_YEAR = new Date().getFullYear();
for (const p of people) if (!p.dd && !p.unresolved && p.by !== null && p.by > NOW_YEAR - LIVING_SPAN) p.withheld = true;
const published = (p) => !p.withheld ? p : {
  ...p, bd: '', bp: 'none', by: null, age: null, stoneHeld: !!p.stone, stone: '', stoneOpen: false,
  aka: p.aka.map(a => ({ ...a, bd: '', stone: '' })),
};
write('people.json', people.map(published));

// ---------------------------------------------------------------------------
// 2. Population, events, eras, layers
// ---------------------------------------------------------------------------
// Alive in each year: timeline_usable = yes and birth_year <= Y <= death_year
// (§4). Computed here so it counts people, not records. On the records it
// must reproduce data/timeline_population.csv exactly, or the rule has drifted.
const aliveIn = (list, y) => list.reduce((n, p) => n + (p.use === 'yes' && p.by <= y && y <= p.dy ? 1 : 0), 0);
const popFile = csv('timeline_population.csv').map(r => [int(r.year), int(r.people_alive_in_dataset)]);
for (const [y, n] of popFile) if (aliveIn(records, y) !== n) throw new Error(`population: ${y} is ${aliveIn(records, y)} on the records but ${n} in timeline_population.csv`);
write('population.json', popFile.map(([y]) => [y, aliveIn(people, y)]));

const events = csv('context_events.csv').map((r, i) => ({
  i, date: r.date, precision: r.precision, layer: r.layer, title: r.title, note: r.note,
  source: r.source, confidence: r.confidence, dated: r.date !== '',
}));
write('events.json', events);

const eras = csv('context_eras.csv').map(r => ({
  id: r.era_id, layer: r.layer, label: r.label, start: r.start_date, startP: r.start_precision,
  end: r.end_date, endP: r.end_precision, open: r.open_ended === 'yes', basis: r.basis,
  source: r.source, confidence: r.confidence, note: r.note,
}));
write('eras.json', eras);
write('layers.json', csv('context_layers.csv'));

// ---------------------------------------------------------------------------
// 3. Family layer
// ---------------------------------------------------------------------------
const byName = new Map();
for (const p of people) {
  const k = `${p.cem}|${p.name.toLowerCase()}`;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(p);
}
function resolveClusterPerson(cem, text) {
  // "A. Morris Love (1883-1943, aged 60)" -> person in that cemetery with that name
  const m = text.match(/^(.*?)\s*\((\d{4})?-?(\d{4})?/);
  const name = (m ? m[1] : text).trim().toLowerCase();
  const cands = byName.get(`${CEM[cem]}|${name}`) || [];
  if (cands.length === 1) return cands[0].id;
  if (m && cands.length > 1) {
    const hit = cands.filter(c => String(c.dy) === m[3]);
    if (hit.length === 1) return hit[0].id;
  }
  return null;
}
// A life event dated by a withheld birth would publish that date: dropped.
const famEvents = csv('family_events.csv').filter(e => !(e.event === 'child_born' && personById.get(canon(e.about_person_id))?.withheld));
// A plot label at Lakeview is shared by several surnames, so dying close
// together in one plot does not make people one family. A cluster the stones
// call a loss is shown only for members tied to another member by a surname
// or a resolved family link, and only while those members died within the
// ninety days the page states; a cluster left with fewer than two is dropped.
const LOSS_WINDOW = 90;
const toDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
const sameSurname = (a, b) => !!a.surname && a.surname.toLowerCase() === (b.surname || '').toLowerCase();
const linked = (a, b) => a.fam.some(f => f.id === b.id) || b.fam.some(f => f.id === a.id);
const lossesCem = csv('family_losses_cemetery.csv').map(r => {
  const c = {
    ...r, n_lost: int(r.n_lost), span_days: int(r.span_days),
    people: r.people.split('|').map(s => s.trim()).map(t => ({ text: t, id: resolveClusterPerson(r.cemetery, t) })),
  };
  if (c.assessment !== 'apparent genuine loss cluster') return c;
  const who = c.people.map(x => x.id && personById.get(canon(x.id))).filter(Boolean);
  if (who.length !== c.people.length) throw new Error(`family_losses_cemetery: unresolved member in plot ${c.plot}`);
  const tied = who.filter(a => who.some(b => b !== a && (sameSurname(a, b) || linked(a, b))));
  const days = tied.map(p => toDay(p.dd)).sort((a, b) => a - b);
  if (tied.length < 2 || tied.some(p => p.dp !== 'day') || days[days.length - 1] - days[0] > LOSS_WINDOW) return null;
  const keep = new Set(tied.map(p => p.id));
  const people = c.people.filter(x => keep.has(canon(x.id)));
  const dd = tied.map(p => p.dd).sort();
  return { ...c, people, n_lost: people.length, span_days: days[days.length - 1] - days[0], first_death: dd[0], last_death: dd[dd.length - 1] };
}).filter(Boolean);
write('family.json', {
  events: famEvents,
  losses: csv('family_losses.csv').map(r => ({ ...r, n_lost: int(r.n_lost), span_days: int(r.span_days), people: r.people.split('|').map(s => s.trim()) })),
  lossesCemetery: lossesCem,
  births: csv('family_births.csv').map(r => ({ ...r, n_children_recorded: int(r.n_children_recorded), children: r.children.split('|').map(s => s.trim()) })),
  marriages: csv('marriage_windows.csv').map(r => ({ ...r, not_before: int(r.not_before), not_after: int(r.not_after) })),
});

// ---------------------------------------------------------------------------
// 4. Quality and provenance files
// ---------------------------------------------------------------------------
write('disputed.json', disputedRows);
const byPerson = (rows) => {
  const m = {};
  for (const r of rows) { if (!r.person_id) continue; (m[r.person_id] ||= []).push(r); }
  return m;
};
write('findings.json', {
  verified: byPerson(csv('verified_findings.csv')),
  newspaper: byPerson(csv('newspaper_findings.csv')),
});
// People the original county death register (1865-1896) records as colored
// and as dying at Hamilton, read on the page on 30 Oct 2026. They are not
// rows in timeline_people.csv and never become people here: no card, no place
// on the timeline, no part of any count. Only rows whose colour was read on
// the image are kept; the index's own race field is not trusted (README).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const regDay = (s) => { const [d, m, y] = s.split(' ').length === 3 ? s.split(' ') : ['1', ...s.split(' ')]; return Date.UTC(+y, MONTHS.indexOf(m), +d); };
const registerNamed = readCsv(join(ROOT, 'research', 'fs_hamilton_deaths_1853_1896.csv'))
  .filter(r => /colou?red/i.test(r.verified_on_image) && !/NOT CONFIRMED|FIRST colour column/.test(r.verified_on_image))
  .map(r => ({
    name: r.name, sex: r.sex, death_date: r.death_date, age: r.age, parents: r.parents, spouse: r.spouse,
    page: r.verified_on_image, record: r.fs_ark,
  }))
  .sort((a, b) => regDay(a.death_date) - regDay(b.death_date));
write('leads.json', {
  lostStones: csv('lost_stones.csv'),
  candidates: csv('candidate_missing_burials.csv'),
  mentions: csv('newspaper_mentions.csv'),
  healthNews: csv('hamilton_health_news.csv'),
  registerNamed,
});

// ---------------------------------------------------------------------------
// 5. County context — these describe Loudoun County, not the 2,732 (§3.6)
// ---------------------------------------------------------------------------
write('context.json', {
  papers: csv('loudoun_papers.csv').map(r => ({ ...r, first_year: int(r.first_year), last_year: int(r.last_year), issues: int(r.issues) })),
  demography: csv('context_demography.csv').map(r => ({
    year: int(r.year), total: int(r.total), white: int(r.white), free_black: int(r.free_black), enslaved: int(r.enslaved),
    black_total: int(r.black_total), black_share_pct: r.black_share_pct === '' ? null : Number(r.black_share_pct), source: r.source, note: r.note,
  })),
  documentedVsCounty: csv('context_documented_vs_county.csv').map(r => ({
    decade: int(r.decade), lakeview: int(r.lakeview), harmony: int(r.harmony), pleasant_valley: int(r.pleasant_valley),
    documented_total: int(r.documented_total), pv_share_pct: Number(r.pv_share_pct),
    county_black_share_pct: r.county_black_share_pct === '' ? null : Number(r.county_black_share_pct),
    epistemic_status: r.epistemic_status, note: r.note,
  })),
  communities: csv('context_communities.csv').map(r => ({ ...r, lat: Number(r.lat), lon: Number(r.lon), km: Number(r.km_from_hamilton) })),
  cemeteryOfficial: csv('context_cemetery_official.csv').map(r => ({ ...r, lat: Number(r.lat), lon: Number(r.lon), county_grave_count: int(r.county_grave_count), project_record_count: int(r.project_record_count) })),
});

// ---------------------------------------------------------------------------
// 6. The county death register, aggregated by cause and year (§6.3).
//    This is loudoun_deaths.csv — county-wide decedents, NOT the people
//    buried here. It is a measured aggregate and is labelled as such in the app.
// ---------------------------------------------------------------------------
const deaths = csv('loudoun_deaths.csv');
// Exact spellings only, so the counts match the ones the event notes cite
// (183 consumption, 141 dysentery, 69 typhoid fever, 70 pneumonia, 18
// diptheria). Variant spellings ("typhoid", "bilious dysentery") are not
// folded in; they are listed in topCauses so nothing is hidden.
const CAUSE_GROUPS = [
  { key: 'consumption', label: 'Consumption', spellings: ['consumption'] },
  { key: 'dysentery', label: 'Dysentery', spellings: ['dysentery'] },
  { key: 'typhoid', label: 'Typhoid fever', spellings: ['typhoid fever'] },
  { key: 'pneumonia', label: 'Pneumonia', spellings: ['pneumonia'] },
  { key: 'diphtheria', label: 'Diptheria', spellings: ['diptheria'] },
  { key: 'scarlet', label: 'Scarlet fever', spellings: ['scarlet fever'] },
  { key: 'croup', label: 'Croup', spellings: ['croup'] },
  { key: 'whooping', label: 'Whooping cough', spellings: ['whooping cough'] },
].map(g => ({ ...g, match: (c) => g.spellings.includes(c) }));
const causeYears = {};
const causeTotals = {};
for (const g of CAUSE_GROUPS) { causeYears[g.key] = {}; causeTotals[g.key] = 0; }
const allCauses = {};
for (const d of deaths) {
  const c = d.cause.trim().toLowerCase();
  if (!c) continue;
  allCauses[c] = (allCauses[c] || 0) + 1;
  const y = (d.entry_date.match(/\d{4}/) || d.death_date.match(/\d{4}/) || [null])[0];
  for (const g of CAUSE_GROUPS) if (g.match(c)) {
    causeTotals[g.key]++;
    if (y) causeYears[g.key][y] = (causeYears[g.key][y] || 0) + 1;
  }
}
write('register.json', {
  rows: deaths.length,
  recordTypes: deaths.reduce((m, d) => (m[d.record_type] = (m[d.record_type] || 0) + 1, m), {}),
  matched: deaths.filter(d => d.matched_person_id).length,
  groups: CAUSE_GROUPS.map(g => {
    const yrs = Object.keys(causeYears[g.key]).map(Number).sort((a, b) => a - b);
    return { key: g.key, label: g.label, total: causeTotals[g.key], first: yrs[0] ?? null, last: yrs[yrs.length - 1] ?? null, byYear: causeYears[g.key] };
  }),
  topCauses: Object.entries(allCauses).sort((a, b) => b[1] - a[1]).slice(0, 20),
  matchedRows: deaths.filter(d => d.matched_person_id).map(d => ({ pid: d.matched_person_id, name: d.name, year: d.entry_date, cause: d.cause, verbatim: d.verbatim, ark: d.ark, basis: d.match_basis })),
});

// ---------------------------------------------------------------------------
// 7. Summary used for the acceptance self-check in the app's "record" view
// ---------------------------------------------------------------------------
const count = (arr, f) => arr.filter(f).length;
const recSummary = (list) => ({
  rows: list.length,
  usable: { yes: count(list, p => p.use === 'yes'), no: count(list, p => p.use === 'no'), deathOnly: count(list, p => p.use === 'death-only'), birthOnly: count(list, p => p.use === 'birth-only') },
  cemeteries: { L: count(list, p => p.cem === 'L'), H: count(list, p => p.cem === 'H'), P: count(list, p => p.cem === 'P') },
  cod: count(list, p => p.cod), stone: count(list, p => p.stone), disputed: count(list, p => p.disp),
  censusMatched: count(list, p => p.census.length), censusOccupation: count(list, p => p.census.some(c => c.occ)),
});
write('summary.json', {
  built: new Date().toISOString(),
  records: recSummary(records), folded: FOLDED.size, mergedPeople: count(people, p => p.aka.length), maybePairs: count(dupRows, d => d.verdict === 'not sure'), unresolvedPairs: count(dupRows, d => d.verdict === 'unresolved'), unresolvedRecords: unresolvedRows.length,
  people: people.length,
  usable: { yes: count(people, p => p.use === 'yes'), no: count(people, p => p.use === 'no'), deathOnly: count(people, p => p.use === 'death-only'), birthOnly: count(people, p => p.use === 'birth-only') },
  cemeteries: { L: count(people, p => p.cem === 'L'), H: count(people, p => p.cem === 'H'), P: count(people, p => p.cem === 'P') },
  stone: count(people, p => p.stone), cod: count(people, p => p.cod), disputed: count(people, p => p.disp),
  anyFamily: count(people, p => p.fam.length), censusMatched: count(people, p => p.census.length),
  censusOccupation: count(people, p => p.census.some(c => c.occ)), events: events.length, eras: eras.length,
  burialsPerDecade: people.reduce((m, p) => { if (p.dy) { const d = Math.floor(p.dy / 10) * 10; m[d] = (m[d] || 0) + 1; } return m; }, {}),
  pvFirstDeathYears: people.filter(p => p.cem === 'P' && p.dy).map(p => p.dy).sort((a, b) => a - b).slice(0, 6),
});
// ---------------------------------------------------------------------------
// 8. Longevity: median age at death of adults (reached 20), Lakeview against
//    Pleasant Valley, by era and decade of death.
//
//    A port of scripts/longevity_gap.py, which stays as the independent
//    reference. Medians, n, gaps, the day-precision subset, coverage and the
//    one-sided Mann-Whitney p are computed here from timeline_people.csv. The
//    only number taken from the Python output is the bootstrap 95% interval
//    (its resampling RNG cannot be reproduced in JS); every other field is
//    checked against data/longevity_gap.json and the build fails if they
//    disagree, which means one implementation or the JSON is stale.
//
//    NOT life expectancy. Two burial populations, not two samples of the town.
// ---------------------------------------------------------------------------
{
  const I = (x) => { const v = Number.parseFloat(x); return Number.isFinite(v) ? Math.trunc(v) : null; };
  const median = (a) => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const U = peopleRows.filter(r => !FOLDED.has(r.person_id) && r.timeline_usable === 'yes' && I(r.death_year) !== null && I(r.age_at_death) !== null);
  const adults = (cem, lo, hi, dayOnly = false, bothDay = false) => U.filter(r => r.cemetery === cem && I(r.death_year) >= lo && I(r.death_year) <= hi
    && I(r.age_at_death) >= 20 && (!dayOnly || r.death_precision === 'day')
    && (!bothDay || (r.death_precision === 'day' && r.birth_precision === 'day'))).map(r => I(r.age_at_death));

  // One-sided Mann-Whitney U (Lakeview greater), normal approximation with tie
  // and continuity correction: what scipy.stats.mannwhitneyu does with ties.
  const erfc = (x) => { // Numerical Recipes erfcc, fractional error below 1.2e-7
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  };
  const mannWhitneyGreater = (a, b) => {
    const all = a.map(v => [v, 0]).concat(b.map(v => [v, 1])).sort((x, y) => x[0] - y[0]);
    const n1 = a.length, n2 = b.length, N = n1 + n2;
    let r1 = 0, tie = 0;
    for (let i = 0; i < N;) {
      let j = i; while (j < N && all[j][0] === all[i][0]) j++;
      const rank = (i + 1 + j) / 2, t = j - i; tie += t * t * t - t;
      for (let k = i; k < j; k++) if (all[k][1] === 0) r1 += rank;
      i = j;
    }
    const u = r1 - n1 * (n1 + 1) / 2, mu = n1 * n2 / 2;
    const sd = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tie / (N * (N - 1))));
    return 0.5 * erfc(((u - mu - 0.5) / sd) / Math.SQRT2);
  };

  const ref = JSON.parse(readFileSync(join(DATA, 'longevity_gap.json'), 'utf8'));
  const disagree = (what, a, b) => { throw new Error(`longevity: ${what} is ${a} here but ${b} in data/longevity_gap.json; rerun scripts/longevity_gap.py or fix the port`); };
  const same = (what, a, b) => { if (a !== b) disagree(what, a, b); };

  const eras = [];
  for (const [lo, hi] of [[1920, 1949], [1950, 1999], [2000, 2026]]) {
    const a = adults('Lakeview', lo, hi), b = adults('Pleasant Valley', lo, hi);
    if (b.length < 15) continue;
    const era = `${lo}-${hi}`, r = ref.eras.find(e => e.era === era) || disagree(`era ${era}`, 'present', 'absent');
    const p = mannWhitneyGreater(a, b);
    const row = { era, lo, hi, lakeview_n: a.length, lakeview_median: median(a), pv_n: b.length, pv_median: median(b), gap: median(a) - median(b), p, ci95: r.ci95, significant: p < 0.05 };
    for (const k of ['lakeview_n', 'lakeview_median', 'pv_n', 'pv_median', 'gap']) same(`${era} ${k}`, row[k], r[k]);
    if (Math.abs(p - r.p) > 1e-5 * r.p) disagree(`${era} p`, p, r.p);
    same(`${era} significance`, row.significant, r.significant_at_05);
    eras.push(row);
  }
  const decades = [];
  for (let d = 1920; d < 2030; d += 10) {
    const a = adults('Lakeview', d, d + 9), b = adults('Pleasant Valley', d, d + 9);
    if (b.length < 8) continue;
    const row = { decade: d, lakeview_n: a.length, lakeview_median: median(a), pv_n: b.length, pv_median: median(b), gap: median(a) - median(b) };
    const r = ref.decades.find(x => x.decade === `${d}s`) || disagree(`decade ${d}s`, 'present', 'absent');
    for (const k of ['lakeview_n', 'lakeview_median', 'pv_n', 'pv_median', 'gap']) same(`${d}s ${k}`, row[k], r[k]);
    decades.push(row);
  }
  same('decade count', decades.length, ref.decades.length);
  const dayPrecision = [];
  for (const [lo, hi] of [[1920, 1949], [1950, 1999], [2000, 2026]]) {
    const a = adults('Lakeview', lo, hi, true), b = adults('Pleasant Valley', lo, hi, true);
    if (b.length < 12) continue;
    const row = { era: `${lo}-${hi}`, lakeview_n: a.length, pv_n: b.length, gap: median(a) - median(b) };
    const r = ref.robustness_day_precision_only.find(x => x.era === row.era);
    for (const k of ['lakeview_n', 'pv_n', 'gap']) same(`day-precision ${row.era} ${k}`, row[k], r && r[k]);
    dayPrecision.push(row);
  }
  // Birth and death both dated to the day: what each gap is without the
  // Pleasant Valley adults who have a birth year only. The interval comes from
  // the reference output; an era is established when it excludes zero.
  const bothDay = [];
  for (const [lo, hi] of [[1920, 1949], [1950, 1999], [2000, 2026]]) {
    const a = adults('Lakeview', lo, hi, false, true), b = adults('Pleasant Valley', lo, hi, false, true);
    if (b.length < 8) continue;
    const era = `${lo}-${hi}`, r = ref.robustness_both_dates_day.find(x => x.era === era) || disagree(`both-dates ${era}`, 'present', 'absent');
    const row = { era, lo, hi, lakeview_n: a.length, lakeview_median: median(a), pv_n: b.length, pv_median: median(b), gap: median(a) - median(b), ci95: r.ci95 };
    for (const k of ['lakeview_n', 'lakeview_median', 'pv_n', 'pv_median', 'gap']) same(`both-dates ${era} ${k}`, row[k], r[k]);
    row.established = r.ci95[0] > 0 || r.ci95[1] < 0;
    bothDay.push(row);
  }
  same('both-dates era count', bothDay.length, ref.robustness_both_dates_day.length);
  const yo = U.filter(r => r.cemetery === 'Pleasant Valley' && I(r.death_year) >= 1920 && I(r.age_at_death) >= 20
    && r.birth_precision !== 'day' && I(r.birth_year) !== null).map(r => I(r.birth_year));
  const pvHeaping = { n: yo.length, ending_0_or_5: yo.filter(y => y % 5 === 0).length };
  for (const k of ['n', 'ending_0_or_5']) same(`pv heaping ${k}`, pvHeaping[k], ref.robustness_pv_birth_year_heaping[k]);
  pvHeaping.p = ref.robustness_pv_birth_year_heaping.p_above_chance;
  const coverage = {};
  for (const cem of ['Lakeview', 'Harmony', 'Pleasant Valley']) {
    const sub = peopleRows.filter(r => !FOLDED.has(r.person_id) && r.cemetery === cem);
    const ok = sub.filter(r => r.timeline_usable === 'yes' && I(r.age_at_death) !== null);
    coverage[cem] = { n: sub.length, usable: ok.length, pct: Math.round(1000 * ok.length / sub.length) / 10 };
    for (const k of ['n', 'usable', 'pct']) same(`coverage ${cem} ${k}`, coverage[cem][k], ref.robustness_coverage[cem][k]);
  }
  // Adults dated before the first era, left out of the comparison. Pleasant
  // Valley opened in 1922 but holds a few earlier dated deaths; the page says
  // so rather than letting the 1920 start look arbitrary.
  const start = eras[0].lo, pvAll = U.filter(r => r.cemetery === 'Pleasant Valley');
  const before = { start, lakeview_n: adults('Lakeview', 0, start - 1).length, pv_n: adults('Pleasant Valley', 0, start - 1).length,
    pv_earliest_death: Math.min(...pvAll.map(r => I(r.death_year))) };
  write('longevity.json', {
    measure: 'median age at death, adults who reached 20', not: 'life expectancy at birth',
    eras, decades, dayPrecision, bothDay, pvHeaping, coverage, before,
    reference: { script: 'scripts/longevity_gap.py', output: 'data/longevity_gap.json', agrees: true, ci: 'bootstrap, 4000 resamples, from the reference output' },
  });
}

// ---------------------------------------------------------------------------
// 9. Stones and spouses: how the 1948 survey names people, how long the one
//    who lived on outlived a spouse, and stones cut before the death.
//
//    All from people.json, so the numbers match the person cards. The survey
//    is Lakeview only and records names, dates, ages and relationships, never
//    verse or other wording; the page says both.
// ---------------------------------------------------------------------------
{
  const RX = { wifeOf: /\b(wife|consort|relict) of\b/i, husbandOf: /\bhusband of\b/i, childOf: /\b(son|dau\.?|daughter) of\b/i };
  const PERIODS = [{ label: 'before 1900', lo: 0, hi: 1899 }, { label: '1900 – 1924', lo: 1900, hi: 1924 }, { label: '1925 – 1948', lo: 1925, hi: 1948 }];
  const item = (p) => p.withheld ? { id: p.id, name: p.name, dy: null, age: null, text: '', withheld: true } : { id: p.id, name: p.name, dy: p.dy, age: p.age, text: p.stone };
  const read = people.filter(p => p.stone);
  const dated = read.filter(p => p.dy !== null && p.dy <= 1948 && p.age !== null);
  const periods = PERIODS.map(({ label, lo, hi }) => {
    const inP = dated.filter(p => p.dy >= lo && p.dy <= hi), adults = inP.filter(p => p.age >= 20), kids = inP.filter(p => p.age < 20);
    return { label, lo, hi, adults: adults.length, kids: kids.length,
      wifeOf: adults.filter(p => RX.wifeOf.test(p.stone)).length, husbandOf: adults.filter(p => RX.husbandOf.test(p.stone)).length,
      childOf: kids.filter(p => RX.childOf.test(p.stone)).length };
  });
  const byDy = (a, b) => a.dy - b.dy || a.name.localeCompare(b.name);
  const naming = {
    read: read.length, dated: dated.length,
    byCemetery: { L: count(read, p => p.cem === 'L'), H: count(read, p => p.cem === 'H'), P: count(read, p => p.cem === 'P') },
    periods,
    wifeOf: dated.filter(p => p.age >= 20 && RX.wifeOf.test(p.stone)).sort(byDy).map(item),
    husbandOf: dated.filter(p => p.age >= 20 && RX.husbandOf.test(p.stone)).sort(byDy).map(item),
    childOf: dated.filter(p => p.age < 20 && RX.childOf.test(p.stone)).sort(byDy).map(item),
    // Open death dates, by what the rest of the record says. The survey ran
    // 1948-50, so only a death after 1950 proves the name was cut first.
    openDate: {
      after: read.filter(p => p.stoneOpen && p.dy !== null && p.dy > 1950).sort(byDy).map(item),
      noDeath: read.filter(p => p.stoneOpen && p.dy === null).sort((a, b) => a.name.localeCompare(b.name)).map(item),
      neverCut: read.filter(p => p.stoneOpen && p.dy !== null && p.dy <= 1950).sort(byDy).map(item),
    },
  };
  // Widowhood: every resolved spouse link where both deaths have a year.
  // Years between the death years, so a date known only to the year is never
  // treated as known to the day. A disputed date makes the gap uncertain, so
  // those couples are counted and left out.
  const byId = new Map(people.map(p => [p.id, p]));
  // The same marriage can appear twice when both partners exist as two
  // records (one from each source) and the links cross between the copies.
  // The data is not merged here (that is the owner's call); a couple whose
  // two partners carry exactly the same birth and death dates, as written, as a
  // couple already counted is counted once, and the page says how many.
  const seen = new Set(), couples = [], sigs = new Set();
  let disputedOut = 0, missingYear = 0, sameCouple = 0;
  for (const p of people) for (const f of p.fam) {
    if (f.rel !== 'spouse') continue;
    const key = [p.id, f.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const q = byId.get(f.id);
    if (p.dy === null || q.dy === null) { missingYear++; continue; }
    if (p.disp || q.disp) { disputedOut++; continue; }
    const [first, last] = p.dy <= q.dy ? [p, q] : [q, p];
    const sig = [first, last].map(x => `${x.bd}/${x.dd}`).sort().join('|');
    if (first.bd && first.dd && last.bd && last.dd) { if (sigs.has(sig)) { sameCouple++; continue; } sigs.add(sig); }
    couples.push({ first: { id: first.id, name: first.name, dy: first.dy }, last: { id: last.id, name: last.name, dy: last.dy }, years: last.dy - first.dy });
  }
  couples.sort((a, b) => b.years - a.years || a.first.dy - b.first.dy);
  const yrs = couples.map(c => c.years).sort((a, b) => a - b), m = yrs.length >> 1;
  const BUCKETS = [[0, 0, 'same year'], [1, 4, '1 – 4 years'], [5, 9, '5 – 9'], [10, 19, '10 – 19'], [20, 29, '20 – 29'], [30, 99, '30 or more']];
  const widowhood = {
    linked: seen.size, couples: couples.length, missingYear, disputedOut, sameCouple,
    median: yrs.length % 2 ? yrs[m] : (yrs[m - 1] + yrs[m]) / 2,
    atLeast20: count(couples, c => c.years >= 20), atLeast30: count(couples, c => c.years >= 30),
    buckets: BUCKETS.map(([lo, hi, label]) => ({ label, lo, hi, n: count(couples, c => c.years >= lo && c.years <= hi) })),
    long: couples.filter(c => c.years >= 30),
  };
  write('stones.json', { naming, widowhood });
}

// ---------------------------------------------------------------------------
// 10. Deaths together: the one cross-household cluster the app marks.
//
//    A blind scan of every 1-3 month window, 1870-2020, finds nothing that
//    beats chance (private report, 29 Oct 2026). One window was tested
//    because a source names it in advance: the overlay dates the influenza
//    pandemic's peak in Virginia to October 1918. Deaths in October-December
//    1918 against the same months in the surrounding years (seven either
//    side, skipping 1917-1919), on people, with a known month, disputed dates
//    left out. The page names no cause: the record gives none.
// ---------------------------------------------------------------------------
{
  const ev = events.find(e => /Influenza pandemic peaks in Virginia/.test(e.title));
  if (!ev) throw new Error('clusters: the influenza event is missing from context_events.csv');
  const Y = Number(ev.date.slice(0, 4)), M0 = Number(ev.date.slice(5, 7)), MONTHS = [M0, M0 + 1, M0 + 2];
  const dated = people.filter(p => p.dd && (p.dp === 'day' || p.dp === 'month') && !p.disp && p.dd.length >= 7);
  const ym = (p) => [Number(p.dd.slice(0, 4)), Number(p.dd.slice(5, 7))];
  const inWin = (p, y) => { const [py, pm] = ym(p); return py === y && MONTHS.includes(pm); };
  const who = dated.filter(p => inWin(p, Y)).sort((a, b) => a.dd.localeCompare(b.dd));
  const others = [];
  for (let y = Y - 7; y <= Y + 7; y++) if (Math.abs(y - Y) > 1) others.push(dated.filter(p => inWin(p, y)).length);
  const expected = others.reduce((a, b) => a + b, 0) / others.length;
  // one-sided Poisson tail P(X >= observed)
  const poissonSf = (k, mu) => { let term = Math.exp(-mu), cdf = 0; for (let i = 0; i < k; i++) { cdf += term; term *= mu / (i + 1); } return 1 - cdf; };
  const young = (p) => p.age !== null && p.age >= 15 && p.age < 45;
  const autumns = dated.filter(p => { const [py, pm] = ym(p); return py >= Y - 7 && py <= Y + 7 && py !== Y && MONTHS.includes(pm) && p.age !== null; });
  // one-sided Fisher exact on [[a,b],[c,d]]: more young in the window than elsewhere
  const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
  const fisherGreater = (a, b, c, d) => {
    const r1 = a + b, r2 = c + d, c1 = a + c, N = r1 + r2;
    const pr = (x) => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(N - c1) - lf(N) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x));
    let s = 0; for (let x = a; x <= Math.min(r1, c1); x++) s += pr(x); return s;
  };
  const wy = who.filter(p => p.age !== null), ya = count(wy, young), yb = count(autumns, young);
  const p = poissonSf(who.length, expected);
  write('clusters.json', [{
    id: 'influenza-1918', from: `${Y}-${String(M0).padStart(2, '0')}-01`, to: `${Y}-${String(M0 + 2).padStart(2, '0')}-31`,
    reason: ev.title, reasonDate: ev.date,
    observed: who.length, expected: Math.round(expected * 100) / 100, households: new Set(who.map(p => (p.surname || p.name.split(' ').pop()).toLowerCase())).size,
    p: Math.round(p * 1000) / 1000, pTested: Math.round(Math.min(1, 2 * p) * 1000) / 1000, tested: 2,
    young: ya, youngOf: wy.length, youngOther: yb, otherOf: autumns.length,
    pAge: Math.round(fisherGreater(ya, wy.length - ya, yb, autumns.length - yb) * 1000) / 1000,
    people: who.map(p => ({ id: p.id, name: p.name, dd: p.dd, age: p.age, cem: p.cem, plot: p.plot })),
  }]);
}

console.log('done.');
