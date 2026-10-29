// Unit tests for app/src/derive.js — the precision and alive-on rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interval, dayOf, aliveOn, ageAt, bounds, fmtDate, fullYears, fmtOffset } from '../app/src/derive.js';

const person = (over) => ({ id: 'X', use: 'yes', bd: '1813-01-12', bp: 'day', dd: '1900-10-21', dp: 'day', by: 1813, dy: 1900, disp: false, fam: [], ...over });

test('interval honours precision over the string', () => {
  const y = interval('1813-01-12', 'year');
  assert.equal(y.p, 'year');
  assert.equal(y.lo, dayOf(1813, 1, 1));
  assert.equal(y.hi, dayOf(1813, 12, 31));
  const m = interval('1813-01', 'month');
  assert.equal(m.lo, dayOf(1813, 1, 1));
  assert.equal(m.hi, dayOf(1813, 1, 31));
  const d = interval('1813-01-12', 'day');
  assert.equal(d.lo, d.hi);
  assert.equal(interval('', 'day'), null);
  assert.equal(interval('1813', 'none'), null);
  // a 'day' claim on a year-only string is degraded, never invented
  assert.equal(interval('1813', 'day').p, 'year');
  const dec = interval('1820', 'decade');
  assert.equal(dec.hi, dayOf(1829, 12, 31));
});

test('aliveOn: day precision is certain between the dates, inclusive', () => {
  const p = person({});
  assert.equal(aliveOn(p, dayOf(1813, 1, 12)), 'certain');
  assert.equal(aliveOn(p, dayOf(1900, 10, 21)), 'certain');
  assert.equal(aliveOn(p, dayOf(1813, 1, 11)), 'no');
  assert.equal(aliveOn(p, dayOf(1900, 10, 22)), 'no');
  assert.equal(aliveOn(p, dayOf(1866, 1, 1)), 'certain');
});

test('aliveOn: year-only dates are possible inside the year, certain between', () => {
  const p = person({ bd: '1813', bp: 'year', dd: '1900', dp: 'year' });
  assert.equal(aliveOn(p, dayOf(1813, 6, 1)), 'possible');
  assert.equal(aliveOn(p, dayOf(1813, 12, 31)), 'certain');
  assert.equal(aliveOn(p, dayOf(1900, 1, 1)), 'certain');
  assert.equal(aliveOn(p, dayOf(1900, 1, 2)), 'possible');
  assert.equal(aliveOn(p, dayOf(1812, 12, 31)), 'no');
  assert.equal(aliveOn(p, dayOf(1901, 1, 1)), 'no');
});

test('aliveOn: timeline_usable other than yes is never placed on a span', () => {
  for (const use of ['no', 'birth-only', 'death-only']) {
    assert.equal(aliveOn(person({ use }), dayOf(1850, 1, 1)), 'unplaceable');
  }
  // birth-only with no death must not be assumed alive now
  assert.equal(aliveOn(person({ use: 'birth-only', dd: '', dp: 'none', dy: null }), dayOf(2020, 1, 1)), 'unplaceable');
});

test('disputed dates widen to the union of readings and are never certain inside the dispute', () => {
  // modern says b.1888, DAR says 1884 — neither wins
  const p = person({ bd: '1888', bp: 'year', dd: '1933', dp: 'year', disp: true, alt: { by: [1884, 1888], dy: [1933] } });
  const { b } = bounds(p);
  assert.equal(b.p, 'disputed');
  assert.equal(b.lo, dayOf(1884, 1, 1));
  assert.equal(b.hi, dayOf(1888, 12, 31));
  assert.equal(aliveOn(p, dayOf(1886, 6, 1)), 'possible');
  assert.equal(aliveOn(p, dayOf(1889, 1, 1)), 'certain');
  assert.equal(aliveOn(p, dayOf(1883, 12, 31)), 'no');
  const a = ageAt(p, dayOf(1900, 1, 1));
  assert.equal(a.exact, false);
  assert.equal(a.text, '11–16');
});

test('ageAt: exact for day precision, a range for year-only', () => {
  const p = person({});
  assert.deepEqual([ageAt(p, dayOf(1900, 10, 21)).text, ageAt(p, dayOf(1900, 10, 21)).exact], ['87', true]);
  assert.equal(ageAt(p, dayOf(1813, 1, 11)), null);
  assert.equal(ageAt(p, dayOf(1813, 3, 12)).text, '2 months');
  const y = person({ bd: '1813', bp: 'year' });
  const a = ageAt(y, dayOf(1866, 1, 1));
  assert.equal(a.exact, false);
  assert.equal(a.text, '52–53');
  // on 31 Dec of the birth year the person is 0 under every reading
  assert.equal(ageAt(y, dayOf(1813, 12, 31)).text, '0');
});

test('fullYears is civil, not /365.25', () => {
  assert.equal(fullYears(dayOf(1900, 2, 29), dayOf(1901, 2, 28)), 0);
  assert.equal(fullYears(dayOf(1900, 2, 28), dayOf(1901, 2, 28)), 1);
});

test('fmtDate never renders a day the source did not give', () => {
  assert.equal(fmtDate('1900-10-21', 'day'), '21 October 1900');
  assert.equal(fmtDate('1900-10-21', 'year'), '1900');
  assert.equal(fmtDate('1900-10', 'month'), 'October 1900');
  assert.equal(fmtDate('', 'none'), '');
});

test('fmtOffset words', () => {
  assert.equal(fmtOffset(100, 100), 'the same day');
  assert.equal(fmtOffset(100, 97), '3 days earlier');
  assert.equal(fmtOffset(dayOf(1865, 5, 1), dayOf(1865, 8, 15)), '3 months later');
  assert.equal(fmtOffset(dayOf(1865, 5, 1), dayOf(1860, 5, 1)), '5 years earlier');
});
