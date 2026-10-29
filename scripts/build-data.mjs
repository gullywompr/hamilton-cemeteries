// Builds app/data/*.json from data/*.csv.
//
// data/ is read-only input. This script only reads it. Every output file is
// a straight reshaping of one or more CSVs; nothing is invented, estimated
// or filled in. Where a rule from APP_SPEC.md applies (timeline_usable,
// precision, disputed dates, the relationship filter) it is applied here
// and noted inline.

import { readCsv } from './csv.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
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

const people = peopleRows.map(r => {
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
    birthplace: r.birthplace, regVerbatim: r.register_verbatim, stone: r.stone_1948,
    mil: r.military, vet: r.veteran === '1', src: r.sources, census,
  };
  if (p.disp) p.alt = altYears(p.id);
  return p;
});
const ids = new Set(people.map(p => p.id));
for (const p of people) for (const f of p.fam) if (!ids.has(f.id)) throw new Error(`dangling id ${f.id} on ${p.id}`);
write('people.json', people);

// ---------------------------------------------------------------------------
// 2. Population, events, eras, layers
// ---------------------------------------------------------------------------
write('population.json', csv('timeline_population.csv').map(r => [int(r.year), int(r.people_alive_in_dataset)]));

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
const famEvents = csv('family_events.csv');
const lossesCem = csv('family_losses_cemetery.csv').map(r => ({
  ...r, n_lost: int(r.n_lost), span_days: int(r.span_days),
  people: r.people.split('|').map(s => s.trim()).map(t => ({ text: t, id: resolveClusterPerson(r.cemetery, t) })),
}));
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
write('leads.json', {
  lostStones: csv('lost_stones.csv'),
  candidates: csv('candidate_missing_burials.csv'),
  mentions: csv('newspaper_mentions.csv'),
  healthNews: csv('hamilton_health_news.csv'),
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
write('summary.json', {
  built: new Date().toISOString(),
  people: people.length,
  usable: { yes: count(people, p => p.use === 'yes'), no: count(people, p => p.use === 'no'), deathOnly: count(people, p => p.use === 'death-only'), birthOnly: count(people, p => p.use === 'birth-only') },
  cemeteries: { L: count(people, p => p.cem === 'L'), H: count(people, p => p.cem === 'H'), P: count(people, p => p.cem === 'P') },
  stone: count(people, p => p.stone), cod: count(people, p => p.cod), disputed: count(people, p => p.disp),
  anyFamily: count(people, p => p.fam.length), censusMatched: count(people, p => p.census.length),
  censusOccupation: count(people, p => p.census.some(c => c.occ)), events: events.length, eras: eras.length,
  burialsPerDecade: people.reduce((m, p) => { if (p.dy) { const d = Math.floor(p.dy / 10) * 10; m[d] = (m[d] || 0) + 1; } return m; }, {}),
  pvFirstDeathYears: people.filter(p => p.cem === 'P' && p.dy).map(p => p.dy).sort((a, b) => a - b).slice(0, 6),
});
console.log('done.');
