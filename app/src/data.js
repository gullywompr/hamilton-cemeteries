// Loads app/data/*.json (built from data/ by scripts/build-data.mjs) and
// builds the indexes the views need. Nothing here writes anywhere.
import { bounds, interval, dayOf } from './derive.js';

const FILES = ['people', 'population', 'events', 'eras', 'layers', 'family', 'disputed', 'findings', 'leads', 'context', 'register', 'summary', 'longevity', 'stones'];

export async function loadAll() {
  const loaded = await Promise.all(FILES.map(f => fetch(`./data/${f}.json`).then(r => {
    if (!r.ok) throw new Error(`could not load data/${f}.json (${r.status})`);
    return r.json();
  })));
  const D = Object.fromEntries(FILES.map((f, i) => [f, loaded[i]]));

  D.byId = new Map(D.people.map(p => [p.id, p]));
  D.popByYear = new Map(D.population);
  D.popMax = Math.max(...D.population.map(x => x[1]));

  // The field: everyone placeable on a span, ranked by earliest possible birth.
  D.spans = D.people.filter(p => p.use === 'yes').map(p => {
    const { b, d } = bounds(p);
    return { p, bLo: b.lo, bHi: b.hi, dLo: d.lo, dHi: d.hi };
  }).sort((a, b) => a.bLo - b.bLo || a.dHi - b.dHi);
  D.spans.forEach((s, i) => { s.rank = i; s.p._rank = i; });

  // One-date people: birth-only placed at birth, death-only at death (§3.1).
  D.oneDate = D.people.filter(p => p.use === 'birth-only' || p.use === 'death-only').map(p => {
    const iv = p.use === 'birth-only' ? interval(p.bd, p.bp) : interval(p.dd, p.dp);
    return { p, kind: p.use, lo: iv ? iv.lo : null, hi: iv ? iv.hi : null };
  }).filter(x => x.lo !== null).sort((a, b) => a.lo - b.lo);
  D.oneDate.forEach((s, i) => { s.rank = i; });

  // Events with a date get an interval; undated rows are research gaps and
  // are excluded from every date-based view (§6.2).
  for (const e of D.events) e.iv = e.dated ? interval(e.date, e.precision) : null;
  D.datedEvents = D.events.filter(e => e.iv).sort((a, b) => a.iv.lo - b.iv.lo);
  D.undatedEvents = D.events.filter(e => !e.iv);
  D.eventLayers = ['national', 'regional', 'medical', 'economic', 'local', 'education'];

  // Eras: start/end intervals. open_ended rows keep end = null (§6.6).
  for (const e of D.eras) {
    e.s = interval(e.start, e.startP);
    e.e = e.open || !e.end ? null : interval(e.end, e.endP);
  }
  D.eraLayers = ['documentation', 'social', 'education', 'medical', 'economic'];
  D.absenceEraIds = new Set(['doc-blackout', 'doc-newspaper-void', 'doc-register-gap']);

  // The one absence band the app draws that is not a row in context_eras.csv.
  // It states what the sources do NOT contain, in the words the project uses
  // (README, "WHO IS NOT IN THIS DATASET"; APP_SPEC §3.6). Its end is the
  // establishment of Pleasant Valley Cemetery, a dated row in context_events.csv.
  const pvOpened = D.datedEvents.find(e => /Pleasant Valley Cemetery established/.test(e.title));
  D.absenceBands = [{
    id: 'absence-black-burials',
    label: 'Black burials: not recorded in these sources before 1922',
    lo: dayOf(1754, 1, 1), hi: pvOpened ? pvOpened.iv.lo : dayOf(1922, 1, 1),
    note: 'Pleasant Valley, the Black community’s cemetery, was established in 1922. The 1853–1866 pages of the state death register name no Black decedent. Harmony’s separate ground for its enslaved congregants was partly paved over before 2000. The data supports “not recorded”; it does not support “none”.',
    source: 'README.md, WHO IS NOT IN THIS DATASET; context_events.csv (1922); context_cemetery_official.csv (Harmony note)',
  }];

  // Family events indexed by person; disputed readings by person.
  D.famEventsByPerson = groupBy(D.family.events, e => e.person_id);
  D.disputedByPerson = groupBy(D.disputed, d => d.person_id);
  D.marriageByPerson = groupBy(D.family.marriages, m => m.person_id);
  D.lossClustersByPerson = new Map();
  for (const c of D.family.lossesCemetery) for (const x of c.people) if (x.id) {
    if (!D.lossClustersByPerson.has(x.id)) D.lossClustersByPerson.set(x.id, []);
    D.lossClustersByPerson.get(x.id).push(c);
  }
  D.registerByPerson = groupBy(D.register.matchedRows, r => r.pid);

  // Deaths ordered by earliest possible death day, for "deaths around this date".
  D.deaths = D.people.filter(p => p.dd && p.dp !== 'none').map(p => ({ p, iv: interval(p.dd, p.dp) })).filter(x => x.iv).sort((a, b) => a.iv.lo - b.iv.lo);

  D.minDay = dayOf(1754, 1, 1);
  D.maxDay = dayOf(2026, 12, 31);
  return D;
}

function groupBy(arr, key) {
  const m = new Map();
  for (const x of arr) { const k = key(x); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}
