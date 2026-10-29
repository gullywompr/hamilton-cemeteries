# The app

A scrolling timeline over the 2,732 people buried in Hamilton, Virginia's three
cemeteries. Stop on a date and see who was alive on it.

Live at https://gullywompr.github.io/hamilton-cemeteries/ . Every push to
`main` rebuilds the JSON from `data/`, runs the tests and redeploys
(`.github/workflows/pages.yml`); a failing test blocks the deploy.

## Run it

```
npm run data     # builds app/data/*.json from data/*.csv (read-only input)
npm test         # unit tests for the date rules + the spec's acceptance tests
npm start        # serves app/ at http://localhost:8787/
```

Node 20 or newer. No dependencies. The only things fetched from outside are
the OpenSeadragon library (cdnjs) and the 1853 map tiles from the Library of
Congress, and only on the map page. Type is Georgia and the system sans.

A date is in the URL (`#/timeline/1865-05-14`) and can be shared.
`#/person/LV0901` opens a person. The record page is seven tabs and the tab is in the
URL too: `#/record?tab=absent`.

## Layout of the code

| file | what it is |
|---|---|
| `scripts/build-data.mjs` | the one place CSV becomes JSON. Applies §3.4's relationship filter, extracts the years in each disputed reading, aggregates the county register by cause and year. Reads `data/`, never writes to it. |
| `app/src/derive.js` | the derived computations of APP_SPEC §4: `interval`, `bounds`, `aliveOn`, `ageAt`, `aliveCount`, `familyOf`, and precision-honest formatting. Pure; tested. |
| `app/src/data.js` | loads the JSON and builds indexes (the ranked field, the one-date strip, era lanes, deaths by day). |
| `app/src/timeline.js` | the canvas: axis, event rows, population curve, the field of lives, the one-date strip, the strata. Pan, zoom, hover, pick. |
| `app/src/panels.js` | the cursor panel, the living list and the person drawer. |
| `app/src/views.js` | People, Families, The record, 1853 map. |
| `app/src/main.js` | wiring, search, hash router. |
| `test/` | `derive.test.mjs` (rules) and `acceptance.test.mjs` (every value in APP_SPEC §9 as corrected by CLAUDE.md, plus the living-population curve on people for all 273 years). The build itself checks that the records reproduce `timeline_population.csv` and stops if any year differs. |

## The rules, as implemented

**alive on a date.** A date known only to the year or month is an interval.
A person is *certainly* alive on D when D is at or after the latest possible
birth and at or before the earliest possible death; *possibly* alive when D
falls inside the uncertainty of either date; otherwise not. A person born on
D or dying on D is alive on D. The hero number is certain + possible, and the
split is drawn. `timeline_usable` other than `yes` is never placed on a span;
birth-only and death-only people sit in their own strip, at the one date the
record gives, and birth-only people are never assumed living.

**disputed dates.** The 22 flagged people carry both readings verbatim on
their record. For placement the span is widened to the union of every
reading's years and marked `disputed`; inside the disputed stretch the person
is only ever *possibly* alive, and age is shown as a range.

**events.** Rows with an empty date are listed as declared gaps and never
placed. `unverified` and `disputed` marks are hollow (dashed when disputed)
and say so in their label, tooltip and panel entry. Every event shows its
source. `decade` precision is a ten-year bar.

**eras.** Packed into lanes per layer so that nesting and overlap survive.
`open_ended` eras fade out at the right edge with "(no established end)" and
are never closed at the present. The unverified era is drawn as a dashed
outline. Absence eras (`doc-blackout`, `doc-newspaper-void`,
`doc-register-gap`) are hatched. Each era's basis is in its tooltip and on the
record page.

**the one band not in the CSV.** "Black burials: not recorded in these sources
before 1922" is drawn hatched above the strata, ending at the dated event for
Pleasant Valley's establishment, with the README's three mechanisms as its
note. It is labelled, everywhere, as an absence of record.

**three grammars.** A person is a stroke you can hover and open, or a name
in a list. A measured count is a ruled numeral or an area with its footing
stated (which people, which file). An absence is hatching with words. The
legend under the timeline says so.

**years lived.** The record page's *Years lived* tab compares the median age
at death of adults (reached 20) on Lakeview and Pleasant Valley, by era and
by decade of death, from 1920 (Pleasant Valley holds 3 dated adult deaths
before then, so earlier years are left out on both grounds and the page says
why). The rules are `APP_SPEC.md` §11. `scripts/build-data.mjs` computes it from
`timeline_people.csv` into `app/data/longevity.json`, including the
one-sided Mann-Whitney p. The bootstrap interval is the one number taken from
`data/longevity_gap.json`, the output of the reference script
`scripts/longevity_gap.py`; every other field is checked against that file
and the build stops if they disagree. The page never says "life expectancy",
prints n beside every median, shows 2000–2026 as *not established* rather
than as a number, says the two grounds are two burial populations and not two
samples of the town, and attributes no cause. Where an era is established as
published but not once every date known only to the year is left out (today,
1920–1949), the page says the finding depends on those dates, with the check
that they are not rounded guesses.

*When to rerun the reference script.* A change to `timeline_people.csv`
that moves any longevity number (a median, an `n`, a gap) stops
`npm run data` with "rerun scripts/longevity_gap.py". That is deliberate: the build and the
script must agree before anything is published. Rerun it from the repository
root, then rebuild and commit the new `data/longevity_gap.json` with the data
change:

```
pip install -r scripts/requirements.txt   # numpy and scipy, pinned
python scripts/longevity_gap.py
npm run data && npm test
```

It is the only script allowed to write into `data/` (see `CLAUDE.md`). The
acceptance values in `APP_SPEC.md` §11 will need updating to match.

**how the stones name people; the one who lived on.** A Record tab reads the
1948 survey for relationship phrases ("wife of", "son of") by period, and
lists the stones behind every count; the Families page gives the years
between the two deaths of each resolved marriage. Both are computed in
`scripts/build-data.mjs` into `app/data/stones.json`. The person card says the
survey recorded names, dates, ages and relationships, not the full
inscription, and explains an open death date. Rules and values:
`APP_SPEC.md` §12.

**duplicate records.** `curation/duplicates.csv` holds the owner's decisions
on 62 candidate pairs. The build folds each confirmed record into the person
named in `keep` (people.json carries it as `aka`), counts people rather than
records everywhere, and computes the living-population curve itself after
checking that the records still reproduce `timeline_population.csv`. Folded
ids still open their person. Rules: `APP_SPEC.md` §13.

**deaths together.** `app/data/clusters.json` holds the one cluster across
households the app marks: October–December 1918, computed in the build from
people and the overlay's influenza date. The date panel shows it when the
chosen date falls inside it. Rules: `APP_SPEC.md` §14.

**county context.** The demography charts are context and are captioned as
not a denominator. The county grave counts are shown beside the project's and
captioned as lower, not a total.

## Design notes

The visual language is the one the two infographic films use, as written
down in the owner's `STYLE.md`: one dark warm surface (`#1a1a19`), serif
(Georgia) only for titles, the person's name and the big number, sans for
everything else, a kicker (a 34 × 2 px orange rule and a bold uppercase line)
above every title, narration in parchment with one bold run that carries the
point, and a `SOURCE` line naming the file at the foot of every view, panel
and chart. The three series colours take the film's roles: blue `#3987e5`
for Lakeview and the measured curve, green `#199e70` for Harmony and for
resolution (the medical events), orange `#d95926` for Pleasant Valley, the
chosen date and every gap in the record. Grey `#55544f` is only ever "present
but not the subject". Every token is declared at the top of `styles.css` and
the canvas reads the same tokens. There is no light mode; the films have
none.

The memorable element is the field: every placeable life is one thin line
from birth to death, ranked by birth, so the block of lines crossing the red
cursor is literally the living, eldest at the top. The strata beneath are the
sources arriving, which is what the shape of the record is.

The canvas opens compact: the six event layers share one row and only the
documentation stratum and the absence band are drawn, so the field keeps about
three fifths of the height. *Detail* in the bar gives every event layer and
every stratum its own row; *Layers* opens the individual toggles. The cursor
panel shows the date, the count and the cemetery bars, and folds the ages, the
documentation in force, the nearby events and the deaths; a fold stays open as
the date moves.
