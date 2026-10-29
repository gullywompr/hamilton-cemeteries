// Derived computations (APP_SPEC §4). Defined once, here, and tested in
// test/derive.test.mjs. Pure functions; no DOM.
//
// Dates are handled as civil day numbers (days since 1970-01-01 UTC) so that
// a date known only to the year or month becomes an INTERVAL [lo, hi] rather
// than a fake specific day. `birth_precision` / `death_precision` are
// authoritative (§3.2): they decide the interval, not the string.

export const DAY_MS = 86400000;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayOf(y, m = 1, d = 1) { return Date.UTC(y, m - 1, d) / DAY_MS; }
export function ymd(day) {
  const t = new Date(Math.round(day) * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}
export function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export function yearStart(y) { return dayOf(y, 1, 1); }
export function yearOf(day) { return ymd(day).y; }
export function isoOf(day) { const { y, m, d } = ymd(day); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function fromIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? dayOf(+m[1], +m[2], +m[3]) : null;
}

/**
 * Turn a date string ("YYYY", "YYYY-MM", "YYYY-MM-DD") plus its declared
 * precision into an interval. The precision wins: a string carrying a day
 * but declared `year` is treated as a year. A string missing parts that the
 * precision claims is degraded to what is actually present.
 * Returns null when there is no usable date.
 */
export function interval(str, precision) {
  if (!str || precision === 'none') return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(str);
  if (!m) return null;
  const y = +m[1];
  const mo = m[2] ? +m[2] : null;
  const d = m[3] ? +m[3] : null;
  let p = precision || (d ? 'day' : mo ? 'month' : 'year');
  if (p === 'day' && !(mo && d)) p = mo ? 'month' : 'year';
  if (p === 'month' && !mo) p = 'year';
  if (p === 'decade') return { lo: dayOf(y, 1, 1), hi: dayOf(y + 9, 12, 31), p, y };
  if (p === 'year') return { lo: dayOf(y, 1, 1), hi: dayOf(y, 12, 31), p, y };
  if (p === 'month') return { lo: dayOf(y, mo, 1), hi: dayOf(y, mo, daysInMonth(y, mo)), p, y, m: mo };
  return { lo: dayOf(y, mo, d), hi: dayOf(y, mo, d), p, y, m: mo, d };
}

/**
 * Birth and death intervals for a person. For the 22 people whose dates are
 * disputed (§3.3) the interval is widened to the union of every reading, and
 * marked p = 'disputed'. Neither reading is chosen.
 */
export function bounds(p) {
  if (p._b) return p._b;
  let b = interval(p.bd, p.bp);
  let d = interval(p.dd, p.dp);
  if (p.disp && p.alt) {
    if (p.alt.by.length) b = widen(b, p.alt.by);
    if (p.alt.dy.length) d = widen(d, p.alt.dy);
  }
  return (p._b = { b, d });
}
function widen(iv, years) {
  const lo = dayOf(Math.min(...years), 1, 1), hi = dayOf(Math.max(...years), 12, 31);
  if (!iv) return { lo, hi, p: 'disputed', y: Math.min(...years) };
  const nlo = Math.min(iv.lo, lo), nhi = Math.max(iv.hi, hi);
  if (nlo === iv.lo && nhi === iv.hi && iv.p === 'day') return iv; // readings agree on the year; no widening needed
  return { lo: nlo, hi: nhi, p: 'disputed', y: iv.y };
}

/**
 * alive_on(person, day) — the rule, applied consistently and inspectable:
 *   'certain'     the person is certainly alive: born no later than `day` under
 *                 every reading of the birth date, and dead no earlier than
 *                 `day` under every reading of the death date.
 *   'possible'    `day` falls inside the uncertainty of a year- or month-only
 *                 (or disputed) birth or death date.
 *   'no'          certainly not alive (before every birth reading or after
 *                 every death reading).
 *   'unplaceable' timeline_usable is not 'yes' (§3.1). Never placed on a span.
 * A person born on D is alive on D; a person who died on D is alive on D.
 */
export function aliveOn(p, day) {
  if (p.use !== 'yes') return 'unplaceable';
  const { b, d } = bounds(p);
  if (!b || !d) return 'unplaceable';
  if (day < b.lo || day > d.hi) return 'no';
  if (day >= b.hi && day <= d.lo) return 'certain';
  return 'possible';
}

/** Whole years from one day to another (civil, not /365.25). */
export function fullYears(fromDay, toDay) {
  const a = ymd(fromDay), b = ymd(toDay);
  let y = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) y--;
  return y;
}
export function fullMonths(fromDay, toDay) {
  const a = ymd(fromDay), b = ymd(toDay);
  let m = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) m--;
  return m;
}

/**
 * age_at(person, day) — respects precision. Returns null if the person has
 * no birth interval or `day` precedes every possible birth. Otherwise:
 *   { min, max, exact, text, months? }
 * where `exact` is true only for a day-precision, undisputed birth date.
 * Year-only births give a range (min–max). The result does not say whether
 * the person was still alive; see aliveOn for that.
 */
export function ageAt(p, day) {
  const { b } = bounds(p);
  if (!b || day < b.lo) return null;
  if (b.p === 'day') {
    const years = fullYears(b.lo, day);
    const months = fullMonths(b.lo, day);
    const text = years < 2 ? (months < 1 ? `${Math.max(0, Math.round(day - b.lo))} days` : `${months} months`) : `${years}`;
    return { min: years, max: years, exact: true, months, text };
  }
  const max = fullYears(b.lo, day);                 // born as early as possible
  const min = Math.max(0, fullYears(b.hi, day));    // born as late as possible
  const text = min === max ? `${min}` : `${min}–${max}`;
  return { min, max, exact: false, text, disputed: b.p === 'disputed' };
}

/** alive_count(year) as the spec defines it; must reproduce timeline_population.csv. */
export function aliveCount(people, year) {
  let n = 0;
  for (const p of people) if (p.use === 'yes' && p.by <= year && year <= p.dy) n++;
  return n;
}

/** family_of(person) — resolved spouse / parents / children only, with confidence and basis. */
export function familyOf(p, byId) {
  const out = { spouses: [], parents: [], children: [] };
  for (const f of p.fam) {
    const other = byId.get(f.id);
    if (!other) continue;
    const entry = { person: other, conf: f.conf, basis: f.basis, src: f.src };
    if (f.rel === 'spouse') out.spouses.push(entry);
    else if (f.rel === 'parent') out.parents.push(entry);
    else if (f.rel === 'child') out.children.push(entry);
  }
  out.any = out.spouses.length + out.parents.length + out.children.length > 0;
  return out;
}

// ---------------------------------------------------------------------------
// Formatting — precision-honest
// ---------------------------------------------------------------------------
const MON3 = MONTHS.map(m => m.slice(0, 3));

/** "21 October 1900" / "October 1900" / "1900" / "" — never a day the source did not give. */
export function fmtDate(str, precision, { short = false } = {}) {
  const iv = interval(str, precision);
  if (!iv) return '';
  const M = short ? MON3 : MONTHS;
  if (iv.p === 'day') return `${iv.d} ${M[iv.m - 1]} ${iv.y}`;
  if (iv.p === 'month') return `${M[iv.m - 1]} ${iv.y}`;
  if (iv.p === 'decade') return `${iv.y}s`;
  return `${iv.y}`;
}
export function fmtDay(day, { short = false, weekday = false } = {}) {
  const { y, m, d, wd } = ymd(day);
  const M = short ? MON3 : MONTHS;
  return `${weekday ? WEEKDAYS[wd] + ' ' : ''}${d} ${M[m - 1]} ${y}`;
}
/** Describe the precision of a date in words, for a label. */
export function precisionWord(precision) {
  return { day: 'to the day', month: 'to the month', year: 'year only', none: 'not recorded', decade: 'to the decade' }[precision] || precision;
}
/** "1813–1900" style life span, with year-only honesty baked into the numbers themselves. */
export function lifeSpan(p) {
  const b = p.bd ? fmtDate(p.bd, p.bp) : null;
  const d = p.dd ? fmtDate(p.dd, p.dp) : null;
  if (b && d) return `${b} – ${d}`;
  if (b) return `born ${b}`;
  if (d) return `died ${d}`;
  return 'no dates recorded';
}
/** A plain-English distance between two days: "3 days earlier", "the same day", "2 years later". */
export function fmtOffset(fromDay, toDay) {
  const diff = Math.round(toDay - fromDay);
  if (diff === 0) return 'the same day';
  const abs = Math.abs(diff), dir = diff < 0 ? 'earlier' : 'later';
  if (abs < 31) return `${abs} day${abs === 1 ? '' : 's'} ${dir}`;
  const months = Math.abs(fullMonths(Math.min(fromDay, toDay), Math.max(fromDay, toDay)));
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} ${dir}`;
  const years = Math.abs(fullYears(Math.min(fromDay, toDay), Math.max(fromDay, toDay)));
  return `${years} year${years === 1 ? '' : 's'} ${dir}`;
}
export const CEMETERY_NAME = { L: 'Lakeview', H: 'Harmony', P: 'Pleasant Valley' };
export const CEMETERY_LONG = { L: 'Lakeview Cemetery', H: 'Harmony United Methodist Church Cemetery', P: 'Pleasant Valley Cemetery' };
export function n(x) { return Number(x).toLocaleString('en-US'); }
