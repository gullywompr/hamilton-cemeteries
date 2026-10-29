# Hamilton Cemeteries Timeline

## What this repository is

A dataset and a build specification. There is no application code yet — that
is what you are here to write.

The data documents **2,732 records of 2,681 people buried in the three cemeteries of Hamilton,
Virginia** — Lakeview, Harmony United Methodist, and Pleasant Valley — spanning
**1754 to 2026**. It was assembled over several weeks from cemetery records,
a 1948 DAR stone survey, the Loudoun County death register, seven US censuses
(1880–1950), and the local newspapers. Every row traces to a source.

## What the app is

A scrolling timeline over those people. The core interaction: **stop on a date
and see who was alive on that date**, with whatever the sources know about them
— age at that moment, spouse, family, and where the record reaches that far,
cause of death and the words on their stone.

Around that sit context layers: a county event overlay, a demographic layer, a
family layer, and the 1853 Yardley Taylor map.

## Read these first, in this order

1. **`APP_SPEC.md`** — the authoritative build specification. Data contract,
   correctness rules, derived computations, the layers, non-goals, and
   acceptance tests. Read it in full before writing anything.
2. **`STYLE.md`** — the visual language, decided and not open for
   reinterpretation. Palette, type, motion, and several rules that look
   stylistic but exist for honesty reasons (cite the source, show `n`, draw
   absence rather than omitting it).
3. **`README.md`** — the project log (long). `APP_SPEC.md` §10 lists the
   sections that bear directly on the build. Of those, *WHO IS NOT IN THIS
   DATASET* is the one that most changes how the app should talk.

`reference/film_timeline.html` and `reference/film_epidemics.html` are the two
films' renderers — single-file canvas, every style token declared at the top.
They are ground truth where `STYLE.md` is ambiguous.

`data/` is **read-only input**. Nothing in the app may write to it.

One exception, by the owner's decision: `data/longevity_gap.json` is written
by `scripts/longevity_gap.py`, the reference analysis behind the longevity
layer. It stays in `data/` and is committed; `scripts/build-data.mjs` reads it
and fails if its own numbers disagree. Only that script may write that file.
No other file in `data/` may be written by anything.

---

## What this file deliberately does not specify

**Architecture, language, framework, build system, project layout and
component structure are not specified here and are not specified in
`APP_SPEC.md`.** Those decisions are yours to make with the owner. Do not treat
the absence of a recommendation as an oversight, and do not infer a stack from
the `.gitignore` — it is deliberately generic.

**The visual language is the one exception, and it is already decided.**
`STYLE.md` carries it — palette, type scale, motion and the rules that go with
them — extracted from two finished films the owner has already made. Follow it.
The app should look like it belongs to the same project. `STYLE.md` governs how
things look; it says nothing about how to build them, so everything above
remains open.

What follows are constraints on *what the app may claim*, not on how it is
built or how it looks. They are not style preferences. They come from what the
sources do and do not support, and a build that violates them is wrong
regardless of how good it looks.

---

## Non-negotiable rules

These are condensed from `APP_SPEC.md` §3 and §8. The spec is authoritative;
this is the short form so they are not missed.

**Precision is real data, not a formatting problem.** `birth_precision` and
`death_precision` (`day` | `month` | `year` | `none`) are authoritative. A date
known only to the year must never be rendered or computed as though it were
known to the day.

**Honour `timeline_usable`.** On the 2,732 records: `yes` 2,572 · `no` 63 ·
`death-only` 50 · `birth-only` 47. Counted as people (owner-confirmed
duplicates once each, `APP_SPEC.md` §13): `yes` **2,521** of 2,681. Only those
can enter a living-population computation. The other 160 are still people and
must remain findable.

**Disputed dates.** 22 people carry `date_disputed = yes`. The standing policy
is in `README.md`; follow it rather than silently picking one date.

**No invented people.** Nothing may appear as a person unless it is a row in
`data/timeline_people.csv`. No placeholders, no synthesised names, no
stand-ins for people believed to be missing.

**Absence of record ≠ zero occurrences, and the app may only assert the
weaker one.** The clearest case: these cemeteries document essentially no
Black burials before 1922. That is a fact about *records* — Pleasant Valley
had not opened, the register's 1853–66 pages name no Black decedents, and
Harmony's separate ground for its enslaved congregants was partly paved over
in the 1990s. The data supports "not recorded". It does not support "none".

**A user must always be able to tell which of three things they are looking
at:** a documented individual, a measured aggregate, or an absence of record.
These rest on different evidence and must not blur together.

**County context is context.** `context_demography.csv` and the death register
describe Loudoun County, not these 2,681 people. It is never a denominator and
must not be used to compute or imply a count of missing individuals.

**`confidence` is load-bearing** on the event overlay. See `APP_SPEC.md` §6.2.

**Do not build features the data cannot feed** (§3.5). Family links reach only
394 of the 2,681 people (399 of the 2,732 records) — a family view must degrade gracefully to "nothing recorded" for
about 85% of people and must never imply that silence means no family.

**Non-goals:** no editing data through the app; no burial location more precise
than the `plot` string; no scraping or live calls to Find a Grave, FamilySearch
or any genealogy service — all data ships here.

---

## Corrections to APP_SPEC.md

The spec was written before the census work finished. Three things in it are
now out of date or have been added since. **Prefer this file where they conflict.**

**1. Occupation (supersedes §3.5, first bullet).** The spec says occupation
exists for one person. That is true of the `occupation` column, which still has
exactly 1 populated row. It is no longer true of the dataset: seven censuses
were transcribed afterwards (4,925 person-rows), and `timeline_people.csv` now
carries `census_<year>_occupation` / `_industry` / `_class` / `_match` for
1880, 1900, 1910, 1920, 1930, 1940, 1950.

- **374** of the 2,681 people match at least one census (374 of the 2,732
  records: no match was lost when duplicates were folded).
- **212** have at least one recorded occupation.
- 8 people appear in four or more censuses, which gives a real working life
  across decades.

So occupation is now a genuine per-person field — but it reaches 7.9% of
people (7.8% of records). It can support a detail on a person, and it can support aggregate
views of the town's work. It still cannot support a primary filter or facet
over all 2,681 people, and the original reason for the rule stands: a filter over a
7.8% field silently misrepresents the other 92%.

**2. Acceptance test, event count (supersedes §9).** The spec expects 127 rows
in `context_events.csv`, split national 37, education 26, regional 21,
medical 22, economic 14, local 7. The file now has **137**: 133, plus four
founding-era events added at the owner's request on 29 Oct 2026 (the
Revolutionary War's start and the Treaty of Paris, the signing of the
Declaration of Independence, and the ratification of the Constitution). The
split is now **national 41, education 26, regional 21, medical 22, economic
17, local 10**. Both of the spec's figures are stale; the six layers are
unchanged.

`context_eras.csv` likewise has **28** rows, not the spec's 23. Five were
added at the owner's request on 29 Oct 2026: the Great Depression
(`econ-great-depression`, 29 Oct 1929 to 1939, the end given to the year
only), World War II (`nat-world-war-ii`, 1 Sep 1939 to 2 Sep 1945), the Cold
War (`nat-cold-war`, 12 Mar 1947 to 26 Dec 1991), the Korean War
(`nat-korean-war`, 25 Jun 1950 to the armistice, 27 Jul 1953) and the Space
Race (`nat-space-race`, 4 Oct 1957 to 17 Jul 1975). The Korean War and the
Space Race nest inside the Cold War. The last four open a sixth layer,
`national`. The split is now **documentation 9, social 7, education 3,
medical 3, economic 2, national 4**. All five are national context: the
project holds no local source on any of them, and the app attributes nothing
in the burial record to them. Where a note cites the `military` field, it
names the service the record holds, not a count of who served.

**3. The years-lived layer (§11).** Added to the spec on 29 Oct 2026, after
the rest of it was written. It compares the median age at death of adults on
Lakeview and Pleasant Valley, starting in 1920. Its rules (never "life
expectancy", `n` beside every median, "not established" where the interval
includes zero, no cause attributed) are honesty rules, the same kind as the
ones above.

## Acceptance tests — re-verified against the current data

Every other value in `APP_SPEC.md` §9 was re-checked and is correct. A build
disagreeing with any of these has a join or filter bug.

| check | value |
|---|---|
| `timeline_people.csv` rows | 2,732 |
| `timeline_usable` | yes 2,572 · no 63 · death-only 50 · birth-only 47 |
| cemeteries | Lakeview 2,101 · Harmony 263 · Pleasant Valley 368 |
| `cause_of_death` populated | 17 |
| `stone_1948` populated | 744 |
| `date_disputed = yes` | 22 |
| matched to ≥1 census | 374 |
| ≥1 census occupation | 212 |
| `context_events.csv` rows | 137 |
| `context_events.csv` layers | national 41 · education 26 · regional 21 · medical 22 · economic 17 · local 10 |
| `context_eras.csv` rows | 28 (documentation 9 · social 7 · education 3 · medical 3 · economic 2 · national 4) |
| years lived, 1920–1949 gap | 13.0 (Lakeview n=461, Pleasant Valley n=39) |
| years lived, 1950–1999 gap | 8.0 (n=746, n=188) |
| years lived, 2000–2026 | not established, p = 0.081 |

**Living population** (`timeline_usable = yes`, `birth_year ≤ Y ≤ death_year`), counted on the records, as in `timeline_population.csv`:

| 1800 | 1850 | 1900 | **1927** | 1950 | 2000 |
|---|---|---|---|---|---|
| 11 | 334 | 1,267 | **1,455** | 1,268 | 413 |

1927 is the peak. Both the rise and the fall are real.

**Duplicate records (29 Oct 2026).** 51 records are the same person entered
twice; the owner confirmed each pair in `curation/duplicates.csv`. The app
counts people, so it shows **2,681 people**, and on people the curve reads
1800 **11** · 1850 **327** · 1900 **1,231** · 1927 **1,429** (still the peak) ·
1950 **1,256** · 2000 **413**. The record values above still hold for the CSV
and are still tested. The rules and the full people-level values are
`APP_SPEC.md` §13. Do not merge or delete rows in `data/` to fix a duplicate:
record the decision in `curation/duplicates.csv`.

---

## A note on tone

The material includes slavery, a Confederate raid that burned the county,
epidemics that killed children four at a time in a single household, and a
colour line that held in this town for fifty years. The data is specific
enough to show all of it.

The honesty rules above exist because this is a real town and these are real
people, many with descendants still living there. Where the record is silent,
say so. Where it is uncertain, show the uncertainty. Never fill a gap with a
plausible guess.
