# Hamilton Cemeteries Timeline — build specification

Instructions for Claude Code. This covers data, behaviour, correctness and
acceptance. **It deliberately says nothing about visual design, layout or
styling** — those decisions are the owner's and are out of scope here.

Project root: this directory. All data is in `data/`. Nothing in `data/`
should be edited by the app; treat it as read-only input.

---

## 1. What is being built

A scrolling timeline over the people buried in Hamilton, Virginia's three
cemeteries. The core interaction: **stop on a date and see who was alive on
that date**, with whatever the sources know about them — age at that moment,
spouse, family, and where the record reaches that far, cause of death and the
words on their stone.

Span of the data: **1754 to 2026**, 272 years. 2,732 people.

---

## 2. Data contract

### 2.1 Primary input — `data/timeline_people.csv`

2,732 rows, one per person, 30 columns. This is the assembled join of every
source in the project and **should be the app's only person-level input**. Do
not re-derive it from the upstream files.

| column | notes |
|---|---|
| `person_id` | stable key. `LV####` Lakeview, `HM####` Harmony, `PV####` Pleasant Valley |
| `name`, `surname` | display name; surname may be empty |
| `cemetery` | `Lakeview` (2,101) \| `Harmony` (263) \| `Pleasant Valley` (368) |
| `plot` | may be empty, or a literal like `Grave is unmarked` — do not assume it parses |
| `birth_date`, `death_date` | ISO-ish: `YYYY-MM-DD`, `YYYY-MM`, `YYYY`, or empty |
| `birth_precision`, `death_precision` | `day` \| `month` \| `year` \| `none` — **authoritative, use it** |
| `birth_year`, `death_year` | integers or empty; pre-extracted for filtering |
| `age_at_death` | integer or empty; only present when both years exist and are coherent |
| `timeline_usable` | `yes` \| `no` \| `birth-only` \| `death-only` — **see §3.1** |
| `timeline_note` | why, when not `yes` |
| `date_disputed` | `yes` or empty — **see §3.3** |
| `spouse_ids` / `spouse_names` | `;`-separated, may be multiple (remarriage) |
| `parent_ids` / `parent_names` | `;`-separated |
| `child_ids` / `child_names` | `;`-separated |
| `cause_of_death` | **only 17 people** — see §3.5 |
| `occupation` | **only 1 person** — see §3.5 |
| `parents_named_in_register`, `birthplace`, `register_verbatim` | from the death register, only for the 21 matched people |
| `stone_1948` | the DAR surveyors' verbatim reading of the stone. **744 people.** High-value free text |
| `military`, `veteran` | sparse |
| `sources` | provenance string |

All multi-value fields use `;` with no spaces. Ids in `*_ids` always resolve
to a `person_id` in this same file.

### 2.2 Secondary inputs

| file | rows | use |
|---|---|---|
| `data/timeline_population.csv` | 273 | year → count of people alive. Pre-computed; prefer it over recomputing |
| `data/context_events.csv` | 127 | dated historical **point** events — **see §6** |
| `data/context_eras.csv` | 23 | historical and documentary **spans** — **see §6.6** |
| `data/loudoun_papers.csv` | 12 | every digitised Loudoun newspaper, with place, span and issue count — **see §6.8** |
| `data/hamilton_health_news.csv` | 10 | dated epidemic and public-health reports from Hamilton's own paper |
| `data/newspaper_findings.csv` | 7 | confirmed newspaper identifications of named interred |
| `data/newspaper_mentions.csv` | 28 | non-obituary newspaper mentions, NOT yet tied to person_ids |
| `data/context_communities.csv` | 25 | Loudoun GIS historic African American communities, churches, schools and lodges within 5 km of Hamilton, with coordinates |
| `data/context_cemetery_official.csv` | 3 | Loudoun County's own cemetery records for the three cemeteries, with the county's grave counts and earliest-burial dates |
| `data/context_demography.csv` | 15 | Loudoun County population by race, 1790–1860 **and Black population 1870–1950** — see §6.7 |
| `data/context_documented_vs_county.csv` | 20 | per-decade documented burials vs county composition |
| `data/context_layers.csv` | 1 | the Yardley Taylor 1853 map of Loudoun — **see §5** |
| `data/relationships_v2.csv` | 845 | full relationship statements incl. unresolved ones — **see §3.4** |
| `data/disputed_dates.csv` | 26 | both readings for every disputed date |
| `data/lost_stones.csv` | 9 | read in 1948, absent now |
| `data/candidate_missing_burials.csv` | 9 | people likely buried here with no stone |
| `data/loudoun_deaths.csv` | 1,817 | the full county death register; 21 rows carry `matched_person_id` |
| `data/verified_findings.csv` | 102 | every correction and conflict, with evidence |

---

## 3. Correctness rules

These are not suggestions. The data has specific traps and the app must not
walk into them.

### 3.1 Honour `timeline_usable`

Only `yes` (2,572 people) may be placed on a span from birth to death.

- `birth-only` (47) — no death year. **Do not assume they are still alive**
  and do not extend a span to the present. Place at birth, or omit.
- `death-only` (50) — no birth year. Place at death only.
- `no` (63) — not placeable. Includes people with no years at all and
  `PV0193 Beverly Ramey`, whose dates are impossible and who is deliberately
  quarantined. Never silently coerce these into a span.

### 3.2 Date precision is real and must survive

1,860 people have a full birth date but **751 have only a year**; 2,026 have a
full death date but **575 have only a year**. A year-only date must never be
treated as 1 January, or as any specific day, in a way the user can mistake
for knowledge. Use `birth_precision` / `death_precision` to decide what the
app is entitled to assert.

For "who was alive on date D": a person with year-only dates is *possibly*
alive in their birth year and death year and *certainly* alive in between.
Pick one rule, apply it consistently, and make it inspectable.

### 3.3 Disputed dates

22 people carry `date_disputed = yes`. Two independent sources give different
dates and **the project's standing policy is that neither wins**. Both
readings are in `data/disputed_dates.csv` keyed by `person_id`. The app must
not choose between them or treat either as established. A user must be able
to determine that the date is unsettled and to reach both readings.

### 3.4 Relationship edges

`timeline_people.csv` contains only edges that passed a date-plausibility
check. `relationships_v2.csv` contains **all 845 statements** including 26
whose `date_check` starts with `FAILS` and 448 that are `unresolved` or
`ambiguous`.

**If you read `relationships_v2.csv` directly, you must re-apply the filter:**
exclude rows where `date_check` starts with `FAILS`, and exclude rows with an
empty `related_person_id`. Failing to do so will wire up parents born after
their children.

Each resolved edge has a `confidence` of `high` or `medium` and a `basis`
string explaining how it was resolved. Surface the basis where a user can
reach it.

### 3.5 Do not build features the data cannot feed

- **Occupation exists for one person.** The 237 occupations in the death
  register belong to county-wide decedents who are not buried here. Occupation
  is a **county context layer**, not a per-person field. Do not add an
  occupation facet, filter or column to the person view.
- **Cause of death exists for 17 people**, almost all between 1853 and 1866.
  Treat it as an occasional enrichment, never a dimension to filter or chart
  by at person level.
- **Family links reach 399 of 2,732.** Most stones never stated a
  relationship. A family view must degrade gracefully to "nothing recorded"
  for roughly 85% of people, and must not imply that silence means no family.

### 3.6 What the app may assert

Constraints on claims, not on appearance.

- **The project contains no estimated or inferred people.** Nothing may be
  presented as a person unless it is a row in `timeline_people.csv`. Do not
  generate placeholder entries, synthesised names, or stand-ins for people
  believed to be missing.
- **Absence of record is a different fact from zero occurrences**, and the app
  may only assert the weaker one. The three cemeteries document essentially no
  Black burials before 1922 — not because few Black people lived in Hamilton,
  but because Pleasant Valley had not opened, the death register's 1853–66
  pages record no Black decedents, and Harmony's separate ground for its
  enslaved congregants was partly paved over in the 1990s. The data supports
  "not recorded"; it does not support "none". See the README sections *WHO IS
  NOT IN THIS DATASET* and *THE COUNTY-WIDE CONTEXT LAYER*.
- Measured county composition (`context_demography.csv`) is **context**. It is
  not a denominator, and must not be used to compute or imply a count of
  missing individuals.
- A documented person, a measured aggregate and an absence of record rest on
  three different kinds of evidence. A user must be able to determine which of
  the three they are looking at.

---

## 4. Derived computations

Define these once, in one module, and test them.

- `age_at(person, date)` — must respect precision; return a range or a
  qualified value when the birth date is year-only.
- `alive_on(person, date)` — must respect `timeline_usable` and precision.
- `alive_count(year)` — prefer `timeline_population.csv`. If recomputed, it
  must reproduce that file exactly.
- `family_of(person)` — spouse, parents, children, resolved only.

---

## 5. The 1853 map layer

`data/context_layers.csv` describes the Yardley Taylor 1853 map of Loudoun
County, held by the Library of Congress.

- Served over **IIIF Image API 2, level 2**, endpoint in the file.
- 15,356 × 11,082 px. **Request tiles; do not download or bundle the raster.**
- It is **not georeferenced.** Do not overlay it on a coordinate system or
  imply positional accuracy.
- The attribution string in the file must be displayed wherever the map is.

---

## 6. The event overlay

The timeline must be able to overlay dated historical events against the
people, so that a death in 1866 can be read against the world that produced
it. `data/context_events.csv` — **127 events** — is the input.

Columns: `date`, `precision`, `layer`, `title`, `note`, `source`,
`confidence`.

### 6.1 Layers

Five, independently toggleable. A build must not merge them into one stream.

| layer | n | what it is |
|---|---|---|
| `national` | 30 | wars, presidencies, technologies — the common frame |
| `regional` | 15 | Loudoun and the Valley: Ball's Bluff, the Burning Raid, Harpers Ferry, the W&OD |
| `medical` | 20 | germ theory and the therapeutic revolution — **see 6.3** |
| `economic` | 13 | occupational and economic shifts: turnpike, rail, Rural Free Delivery, electrification, mechanisation, Dulles |
| `local` | 6 | Hamilton itself, including declared research gaps |

### 6.2 `confidence` is load-bearing

- `verified` (78) — the date is established.
- `unverified` (5) and `disputed` (1) — **the project has not established
  these dates.** The app must not assert them as established.
- Two rows carry an empty `date`. They are declared **research gaps**,
  recorded so the absence is on file. They have no date at all, so exclude
  rows with an empty `date` from any date-based view.

The railroad reaching Hamilton is the live example: the project carries it at
1874 but has flagged that date as too late, with deed evidence pointing to
1870–75. Its `confidence` is `disputed` and the app may not present 1874 as
the date it arrived.

### 6.3 The medical layer is the point of the whole overlay

This dataset records what people died of, and the `medical` layer records when
those things stopped killing people. Pairing them is the single most
illuminating thing the timeline can do, and the event notes are written to
support it — several name the counts in this dataset directly.

The spine of it:

- **1882** Koch identifies the tubercle bacillus. **Consumption** is the
  commonest cause here — **183 deaths, 1819–1890**. The cause is now known and
  it changes nothing yet.
- **1884** the diphtheria bacillus is identified. **18 diphtheria deaths**
  here, all 1864–66, including Willie N. Taylor at Lakeview and three Carter
  children in six days of May 1865.
- **1894** diphtheria antitoxin enters wide use — the **first disease in this
  dataset to become treatable**.
- **1908** chlorination of public water begins. **Dysentery** is second
  commonest — **141 deaths, every one between 1853 and 1866**. **Typhoid**:
  69 deaths, 1853–1882.
- **1935** sulfonamides. **Pneumonia** (70 deaths here) becomes survivable.
- **1944** streptomycin. **Consumption becomes curable — 62 years after its
  cause was found**, and more than a century after it began filling these
  graves.

A build that lets a user see the consumption deaths and the 1882/1944 pair at
the same time has done the job.

### 6.4 Rules

- Events are **context, not burials**. An event is not a person: it must never
  be counted, filtered or selected as one, and must not enter any person-level
  statistic.
- Respect `precision` exactly as for people (§3.2): a `year`-precision event
  does not support a claim about a specific day.
- `source` must be reachable by the user for any event they can see.
- Do not add events to the CSV from the model's own knowledge during the
  build. The file is the contract. New events go through the project's
  research process and get a `source` and a `confidence`.

### 6.5 Known gaps in this layer, deliberately left open

Two `local` rows carry no date because the facts are not established:
**Hamilton's first grocery or general store**, and **the founding of the
Hamilton post office**. They are recorded as gaps rather than guessed. The
*Weekly Enterprise*, published in Hamilton 1890–1923 and full-text searchable
on Virginia Chronicle, is the obvious source for the first; see the README
section *OPEN LEADS AND STANDING CONSTRAINTS*.


### 6.6 `data/context_eras.csv` — spans, not points

`context_events.csv` holds only point events. Periods with a beginning and an
end are a different shape of fact and live in their own file.

Columns: `era_id`, `layer`, `label`, `start_date`, `start_precision`,
`end_date`, `end_precision`, `open_ended`, `basis`, `source`, `confidence`,
`note`.

| layer | n | what it spans |
|---|---|---|
| `documentation` | 8 | which source covers which stretch of the timeline |
| `social` | 6 | slavery, Reconstruction, disfranchisement, segregated schooling |
| `education` | 3 | no public system, Black education criminalised, Freedmen's Bureau |
| `medical` | 3 | pre-germ-theory, bacteriology, antibiotics |
| `economic` | 1 | rural electrification |

Rules specific to this file:

- `start_precision` and `end_precision` are independent and are governed by
  §3.2 exactly as for people. An era whose `end_precision` is `year` does not
  support a claim about a month within that year.
- `open_ended = yes` means the era has **no established end**. Two rows carry
  it (`doc-modern-survey`, `med-antibiotic`) and their `end_date` is empty.
  An empty `end_date` must never be read as an end at the present day, and
  must never be filled in by the build.
- Eras **nest and overlap**. `soc-massive-resistance` (1956–59) sits inside
  `soc-disfranchisement` (1902–65), which overlaps `soc-segregated-schools`
  (1941–68). The file is not a partition and must not be flattened into one.
- `basis` states what in this project's own data establishes the span. It is
  not decoration: an era the app shows must be able to show its `basis`.
- One row is `confidence = unverified` (`econ-rural-electrification`, whose
  end year is an estimate). Its boundaries must not be asserted as
  established.

**The `education` layer bounds every claim about schooling.** Virginia had no
public school system until **1870**; before that the state funded schooling
through the Literary Fund (account established 1811) administered by county
commissioners. `edu-no-public-system` (1811–1870) therefore covers the
schooling of **all 23 Confederates in this project** (born 1810–1845) and of
nearly everyone buried here who died before about 1930. Enrollment records for
private academies, old-field, subscription and Quaker schools largely do not
survive and are not digitised. **No classmate relationship between any two
people in this dataset can be established, and the build must not imply one.**
`edu-black-education-illegal` (1831–1865) bounds the opposite claim: for
thirty-four years schooling Black children in this county was against the law,
and the project holds no records of Black residents from that span at all.

**The `documentation` layer is the most important thing in this file.** The
project's burial counts per decade run 2, 5, 33, 17, 48, 61, 83 from the
1830s to the 1890s, then 150–215 every decade from the 1900s on. That shape
is the record arriving, not the town filling up. Three spans in particular
bound what the app may claim:

- `doc-blackout` (1822–1852) — nothing in *this project's* data. **This is an
  extraction gap, not a record gap**: Loudoun newspapers are digitised for
  1817–1843 (§6.8).
- **`doc-newspaper-void` (1844–1874) — thirty-one years with no digitised
  Loudoun newspaper at all**, swallowing the Civil War and the Burning Raid.
  75 people in this project die inside it.
- `doc-register-gap` (1860–1863) — four consecutive years absent from the
  state death register, covering secession and most of the war.
- `doc-modern-survey` (1990–) — where coverage becomes effectively complete.

A build that presents the pre-1900 stretch without reference to the
`documentation` layer is asserting a demographic claim the data does not
support. This is the same failure mode as §3.6.


### 6.7 The Great Migration counter-trend — read this before plotting anything

`context_demography.csv` now carries Loudoun's Black population for
1870 and 1900–1950. It fell in **every decade from 1900 to 1950**:

| year | Black population | change |
|---|---|---|
| 1900 | 5,868 | — |
| 1910 | 5,221 | **−11.0%** |
| 1920 | 4,810 | −7.9% |
| 1930 | 4,347 | **−9.6%** |
| 1940 | 4,094 | −5.8% |
| 1950 | 3,976 | −2.9% |

From **31.0% of the county in 1860** to about **10% by the early twentieth
century**. The era row is `soc-great-migration` (1900–1950).

**The burial record runs the opposite way.** Documented burials at Pleasant
Valley by decade, computed from `timeline_people.csv`:

| decade | PV burials | county Black population |
|---|---|---|
| 1900s | 0 | 5,868 |
| 1910s | 3 | 5,221 |
| 1920s | 12 | 4,810 |
| 1930s | 17 | 4,347 |
| 1940s | 15 | 4,094 |
| 1950s | **30** | 3,976 |

Burials rise monotonically while the living population falls by a third. **A
build that reads rising Pleasant Valley burials as a growing Black community
has it exactly backwards.** The burials are the documentation arriving (§6.6,
`doc-modern-survey`); the population is the people leaving. Both are true and
they must not be conflated.

Note also that the raw census counts **understate** the outflow, because they
take no account of natural increase: a shrinking count against ordinary birth
rates means a substantially larger net departure. The app must not present
decade-to-decade differences as the number of people who left.


### 6.8 `data/loudoun_papers.csv` — the Weekly Enterprise is 2% of what exists

The Hamilton *Weekly Enterprise* has **113 issues**. Twelve digitised Loudoun
newspapers hold **5,646 issues between them**.

| code | paper | place | span | issues |
|---|---|---|---|---|
| GL | Genius of Liberty | Leesburg | 1817–1839 | **1,178** |
| LSBS | Leesburg Spectator | Leesburg | 1825 | 2 |
| LGL | Leesburg Genius of Liberty | Leesburg | 1839–1843 | 179 |
| MIR | Mirror | Leesburg | 1875–1902 | **1,302** |
| **TWEP** | **Weekly Enterprise** | **HAMILTON** | 1890–1923 | **113** |
| WM | Washingtonian-Mirror | Leesburg | 1903–1906 | 84 |
| MIRR | Mirror | Leesburg | 1906–1907 | 30 |
| LM | Loudoun Mirror | Leesburg | 1908–1921 | 316 |
| LDT | Loudoun Times | Leesburg | 1918–1924 | 154 |
| BRHR | Blue Ridge Herald | Purcellville | 1930–1957 | **1,361** |
| LNS | Loudoun News | Leesburg | 1936–1953 | **838** |
| MBC | Middleburg Chronicle | Middleburg | 1937–1943 | 89 |

**Every one of the 481 people who died 1890–1923 has a non-Enterprise Loudoun
paper covering their death year.** The Enterprise's holes — 1898, 1901,
1905–08, 1910, 1912–15, 1917–21 — are filled by the *Mirror*, the
*Washingtonian-Mirror* and the *Loudoun Mirror*.

Across 1817–1957, **1,167 of 1,356 deaths in this project (86%) fall in a year
some Loudoun paper covers.** Only two spans have nothing: **1844–1874**
(31 years, 75 deaths) and **1925–1929** (5 years, 114 deaths).

The build must not treat the Enterprise as *the* local paper. It is the
Hamilton paper, which matters for town news, but it is 2% of the available
issues and the Leesburg titles are far denser.

---

## 7. The family layer

Three new inputs. All are derived from data already in the project; none
introduces a new source.

### 7.1 `data/family_events.csv` — 336 life events, 190 people

Life events that the resolved family links make datable. Columns:
`person_id`, `person_name`, `date`, `precision`, `event`, `about_person_id`,
`about_person_name`, `note`, `confidence`.

| event | n | meaning |
|---|---|---|
| `widowed` | 116 | a resolved spouse died first; dated to that death |
| `child_died` | 112 | a resolved child died; carries the child's age |
| `child_born` | 107 | a resolved child was born; a datable event in the parent's life |
| `died_in_childbirth` | 1 | the register records the cause as "Child Bed" |

These attach to the **parent's or spouse's** timeline, not the child's. The
same event appears once per surviving parent, so a birth usually yields two
rows.

### 7.2 Marriage — what the data contains

**The project holds no marriage records and no marriage dates.** The spouse
relationship is known for 248 people; the date it began is not recorded in any
source gathered so far.

What can be derived is a bounded window. `data/marriage_windows.csv`, **8
rows**, covers people with two resolved spouses, where the first spouse's
death gives a lower bound (`not_before`) and the eldest resolved child of the
second marriage gives an upper bound (`not_after`). Lewis Taylor remarried
between **1857 and 1860** — his first wife Ruth died in December 1857, and
Ella Gertrude, his eldest resolved child by Elizabeth, was born in 1860.

`not_after` is empty in 7 of the 8 rows, where no child date bounds the upper
end; those carry a lower bound only. Each row's `basis` column states how the
bounds were obtained.

If marriage dates are obtained later — obituaries, census, family records,
Loudoun marriage registers — they belong in a new file with its own source and
confidence, not back-derived into this one.

### 7.3 `data/family_losses.csv` — 44 clusters of multiple loss

Families that buried more than one member in a single year, from the death
register's own `parents` field. Columns include `n_lost`, `span_days`,
`all_children`, `causes` and the people themselves.

**26 of the 44 happened inside 30 days. Four families lost three or more.**

- **The Dulins, 1853** — four children in 47 days. Henry 8, James 3, Charles 4,
  Ann 6. Dysentery took three; the fourth is recorded as "water on brain".
- **The Cookseys, 1821** — three in two days. Edward on 24 July, George and
  Harrison both on the 25th. Bilious fever.
- **The Carters, 1865** — three in six days of May. Courtney 7, Emma 6,
  Juliet 8. Diphtheria.
- **The Aults, 1865** — three, typhoid. George 19, Richard 17, Martha 13.
- **The Paxson twins, 1855** — Burr and Rodney, both 2 months 15 days, dead a
  day apart.

These are the human core of the dataset and the layer should be able to make
them as **one event affecting one family** rather than as four unrelated
deaths that happen to share a surname.

### 7.4 `data/family_births.csv` — 58 families, births correlated

The inverse of the loss clusters: when children arrived in a family.

**Register side, 48 families.** The register gives an age at death precise to
the day ("7 yrs. 1 mo. 18 ds.") alongside a death date, and the two together
**reconstruct a birth date**. 1,328 of the 1,817 entries carry both; 1,059 of
those also name parents; grouping by the parents' names yields 48 families
with two or more reconstructible births. Columns give `first_birth`,
`last_birth`, `childbearing_span_yrs`, `birth_gaps_months` and
`median_gap_months`.

**Cemetery side, 10 families**, from resolved parent links and the birth dates
actually carved on the stones. No reconstruction involved.

Across both, 53 plausible sibling intervals are measurable; the **median gap
between siblings is 48 months**.

The E. L. & M. L. Carter children are the sharpest example: born May 1857,
March 1858 and May 1859 — three children inside 24 months — and all three dead
of diphtheria inside six days in May 1865.

**The selection bias must travel with this data and is stated in every row's
`caveat` column.** The register records only children who **died**. A register
sibling set is therefore the set of children *lost*, not the set of children
*born*: counts are floors and intervals are measured only between children who
both died. The cemetery side has a milder version of the same problem — only
children with a surviving stone and a resolved parent link appear.

One family carries a `DUPLICATE WARNING` where a name recurs, because the
register double-entered some people across year blocks.

### 7.5 `data/family_losses_cemetery.csv` — 42 plot clusters

The same idea applied to the stones rather than the register: people in one
plot who died within 90 days of each other. These attach to actual graves,
which the register clusters do not.

**36 are apparent genuine loss events; 6 are flagged as likely duplicate
records** (same plot, same death date, same birth year, overlapping given
names) and are not losses at all. The `assessment` column carries the
distinction; the six are also written out to
`data/probable_duplicates_found26oct.csv`.

Notable genuine clusters:

- **N-23, Lakeview, 1943 — three Loves dead on one day.** A. Morris Love 60,
  Ruth Grubb Love 54 and James Woolf Love 23. A father, a mother and a son,
  same date.
- **C-57, 1970 — Janet Lee M. Lewis, 18, and Wayne D. F. Lewis, 20**, the same
  day.
- **C-21, 1918 — Ruth Payne, 24, and Elizabeth Payne, 17**, three days apart
  in late October. The influenza pandemic; `context_events.csv` carries its
  Virginia peak at the same moment.

### 7.6 Rules for this layer

- A family loss cluster is a **property of a family in a window**, not of an
  individual. Do not reduce it to a per-person flag.
- `span_days` may be empty where the register gave no day. Do not treat empty
  as zero.
- Most of `family_losses.csv` comes from the **register**, which is county-wide
  — those families are not necessarily buried in these three cemeteries. The
  Carters are the worked example: the register names three Carter children of
  E. L. & M. L. Carter, and the Lakeview Carter plot C-89 holds a different
  child of a different mother. **Do not place a register family on a grave
  without a `matched_person_id`.**
- `family_events.csv` is derived from links that already passed the date
  check (§3.4). Do not regenerate it from unfiltered relationship rows.

---

## 8. Non-goals

- No editing of the underlying data through the app.
- No per-person occupation feature (§3.5).
- No estimated or reconstructed people (§3.6).
- No claim of a burial location more precise than the `plot` string.
- No scraping or live calls to Find a Grave, FamilySearch, or any genealogy
  service. All data ships with the repo.

---

## 9. Acceptance tests

Known-correct values from the current data. A build that disagrees with any of
these has a join or filter bug.

**Counts**
- `timeline_people.csv` loads 2,732 rows.
- `timeline_usable` splits exactly: `yes` 2,572, `no` 63, `death-only` 50,
  `birth-only` 47.
- Cemeteries: Lakeview 2,101, Harmony 263, Pleasant Valley 368.

**Living population** (people with `timeline_usable = yes` whose birth_year ≤ Y ≤ death_year)

| year | alive |
|---|---|
| 1800 | 11 |
| 1850 | 334 |
| 1866 | 617 |
| 1900 | 1,267 |
| **1927** | **1,455** ← the peak |
| 1950 | 1,268 |
| 2000 | 413 |

**Family integrity**
- Plot `C-52` (Lakeview) contains six Taylors. `Lewis Taylor` (1813–1900) must
  resolve to **two spouses** — Ruth W. Bradfield Taylor and Elizabeth Roberts
  Taylor — and **two children**, Ella Gertrude and Willie N., both of whom must
  resolve back to Lewis *and* Elizabeth as parents.
- `George Oscar Taylor` is in the same plot with **no** family links. This is
  correct — his stone does not say whose son he was. A build that invents a
  link for him is wrong.
- `Willie N. Taylor` must carry `cause_of_death = Diptheria` (sic, as the
  register spells it — do not silently correct source spellings).
- Every id in every `*_ids` field must resolve to a row in the same file.

**Event overlay**
- `context_events.csv` loads 127 rows across exactly six layers: national 37,
  education 26, regional 21, medical 22, economic 14, local 7.
- `context_cemetery_official.csv` loads 3 rows. Its `county_grave_count` is
  **lower than** `project_record_count` for all three cemeteries (1,893 vs
  2,101; 221 vs 263; 301 vs 368). The build must not present the county
  figure as a total or use it to validate the project's own counts.
- Exactly 7 rows are `confidence = unverified` and 1 is `disputed`.
- Exactly 2 rows have an empty `date` and must be excluded from any
  date-based view.
- Exactly 6 rows are `confidence` ≠ `verified` (5 unverified, 1 disputed).
  Their dates must not be asserted as established.

**Era bands**
- `context_eras.csv` loads 23 rows across exactly five layers: documentation 9,
  social 7, education 3, medical 3, economic 1.
- `loudoun_papers.csv` loads 12 rows summing to 5,646 issues; `TWEP` accounts
  for 113 of them.
- `context_demography.csv` loads 15 rows. Rows from 1870 on have EMPTY
  `total`, `white`, `free_black`, `enslaved` and `black_share_pct`; only
  `black_total` is populated. A build must not compute a share from them.
- Exactly 2 rows have `open_ended = yes` and an empty `end_date`
  (`doc-modern-survey`, `med-antibiotic`). Neither may be rendered or
  computed as ending at the present day.
- Exactly 1 row is `confidence` ≠ `verified` (`econ-rural-electrification`).
- `soc-massive-resistance` must fall entirely inside `soc-disfranchisement`;
  a build that treats eras as a partition will fail this.
- Every `era_id` is unique and every row has a non-empty `basis`.

**Family layer**
- `family_events.csv` loads 336 rows covering 190 people: 116 `widowed`,
  112 `child_died`, 107 `child_born`, 1 `died_in_childbirth`.
- `family_losses.csv` loads 44 clusters; 4 have `n_lost` ≥ 3; 26 have
  `span_days` ≤ 30.
- `family_births.csv` loads 58 families: 48 `register`, 10 `cemetery`.
- `family_losses_cemetery.csv` loads 42 clusters, of which 36 are
  `apparent genuine loss cluster` and 6 `likely DUPLICATE RECORDS`.
- `marriage_windows.csv` loads 8 rows, of which 7 have an empty `not_after`.
  `Lewis Taylor` has `not_before` 1857 and `not_after` 1860.

**Quality flags**
- Exactly 22 people carry `date_disputed = yes`, and every one of them has a
  matching row in `disputed_dates.csv`.
- `PV0193 Beverly Ramey` is `timeline_usable = no` and must not appear on a
  span.

---

## 10. Where to read more

`README.md` in this directory is the project log. The sections that bear
directly on building this:

- *THE TIMELINE DATASET* — how `timeline_people.csv` was assembled
- *RELATIONSHIPS PARSED AND RESOLVED* — method, confidence levels, known failures
- *WHO IS NOT IN THIS DATASET* — the absences and why they exist
- *THE COUNTY-WIDE CONTEXT LAYER* — the demography layer and the rules for it
- *One real decision...* — the standing policy on disputed dates
- *OPEN LEADS AND STANDING CONSTRAINTS* — what is deliberately not here yet

---

## 11. The years-lived layer

Added on 29 Oct 2026, after the rest of this spec was written, at the owner's
request. It compares how long adults lived on the two grounds where the
record is deep enough to compare: **Lakeview** and **Pleasant Valley**.
Harmony is too small and is shown only for coverage.

### 11.1 The measure

**Median age at death of people who reached 20**, by era and by decade of
death, from `timeline_people.csv` rows with `timeline_usable = yes`, a
`death_year` and an `age_at_death`. Adults only, so that different
child-burial practice on the two grounds cannot drive the result.

- The reference analysis is `scripts/longevity_gap.py`. Its output,
  `data/longevity_gap.json`, is the one file in `data/` that a script may
  write (see `CLAUDE.md`).
- The app's build computes every median, `n`, gap and the one-sided
  Mann-Whitney `p` itself, and stops if any of them disagrees with the
  reference output. The bootstrap interval (4,000 resamples) is the one
  number taken from the reference output rather than recomputed.

### 11.2 Eras

| era | Lakeview | Pleasant Valley | gap | 95% interval | p |
|---|---|---|---|---|---|
| 1920–1949 | 69.0, n=461 | 56.0, n=39 | **13.0** | 3.0 to 22.0 | < 0.001 |
| 1950–1999 | 76.0, n=746 | 68.0, n=188 | **8.0** | 2.0 to 9.5 | < 0.001 |
| 2000–2026 | 79.0, n=334 | 75.0, n=74 | not established | −2.0 to 8.0 | 0.081 |

**The comparison starts in 1920, not 1900.** Pleasant Valley opened in
1922. Before 1920 the record holds 246 dated adult deaths at Lakeview and 2
at Pleasant Valley, the earliest in 1911. Two cannot carry a median, so both
grounds are compared from 1920 and earlier deaths are left out on both sides.
The page must say this, with the counts.

**The 1920–1949 gap depends on year-only dates.** 24 of Pleasant Valley's 39
adults in that era have no birth or death date to the day, most of them a
birth year alone. With birth and death both dated to the day the gap is 12.0,
but Pleasant Valley is left with 15 people and the interval runs from −3.0
to 25.0. Those year-only birth years are not heaped: 23 of 151 end in 0 or 5,
against one in five by chance. The page must state the dependency beside the
eras, with these numbers, and must drop the "stands on them" reassurance if
the heaping check ever fails.

### 11.3 Rules

These are honesty rules, not style:

- **Never call it life expectancy.** Life expectancy at birth is a different
  measure and this record cannot produce one. The page says so.
- **Print `n` beside every median.** Where Pleasant Valley has fewer than 20
  people in a decade, mark it as resting on few people.
- **An era whose interval includes zero is "not established", not a
  number.** 2000–2026 is shown that way. Do not print its 4.0 as a finding.
- **Two burial populations, not two samples of Hamilton.** Who chose each
  ground, and who received a dated stone, differ between them. The page says
  so.
- **Attribute no cause.** The record holds no income, almost no occupation at
  death and nothing on access to care. The page must not suggest any of them
  explains the gap.
- **Nothing describes a person.** Nobody died at the median, and this is not
  a ranking of the two grounds.

### 11.4 Acceptance tests

- Era rows as in §11.2: medians, `n`, gaps, intervals, and `p` for 2000–2026
  within 0.0005 of 0.081.
- By decade of death, 1920s to 2010s, the gap is
  10.0, 12.0, 16.0, 11.0, 9.0, 10.0, 5.0, 4.0, 3.0, 6.0, on Pleasant Valley
  `n` of 11, 15, 13, 25, 32, 37, 42, 52, 37, 31.
- Restricted to deaths dated to the day, the era gaps are 12.5, 8.0, 3.5.
- With birth and death both dated to the day: 1920–1949 gap 12.0 on
  Pleasant Valley n=15, interval −3.0 to 25.0, not established; 1950–1999
  8.0 on n=86, 0.5 to 11.0, established; 2000–2026 2.5 on n=48, −3.5 to 9.0.
- Pleasant Valley's year-only birth years from 1920 on: 23 of 151 end in 0
  or 5.
- Share of each ground's people with a usable age at death: Lakeview 95.2%,
  Harmony 92.1%, Pleasant Valley 88.7%.
- Before 1920: Lakeview 252 adults, Pleasant Valley 3, earliest 1911.

---

## 12. How the stones name people, and the one who lived on

Added 29 Oct 2026 at the owner's request. Both are measured aggregates that
list the people they count.

**The 1948 survey's limits.** `stone_1948` exists on 744 records (743 people), all at
Lakeview; Harmony and Pleasant Valley have no 1948 readings in this record.
The survey typed names, dates, ages and relationships: none of the 744 carries
a verse, a religious phrase or a word like "Mother". Every place the app shows
a stone reading says so. It must never be presented as the full inscription.

**Naming.** Among stones of deaths up to 1948 with an age at death:

| deaths | adults "wife of" | adults "husband of" | children under 20 "son / daughter of" |
|---|---|---|---|
| before 1900 | 14 of 42 | 0 | 25 of 33 |
| 1900–1924 | 51 of 219 | 0 | 27 of 54 |
| 1925–1948 | 38 of 309 | 1 | 6 of 22 |

Shares are of all adult (or child) stones. The record has no sex field and
the app must not infer sex from names, so it never states a share of women's
stones.

**Open death dates.** 26 stones show one ("1874 –", "19--"). The survey ran
1948–50, so only a death after 1950 proves the name was cut first: 16. No
death recorded anywhere: 4. Death recorded by 1950, date not yet cut: 5.

**The one who lived on.** 126 resolved marriages; 113 have both death years
(10 lack one, 3 rest on a disputed date). Median 14 years
between the deaths; 36 at twenty years or more, 16 at thirty or more. Whole
years between death years only. No claim about wives against husbands.

---

## 13. Duplicate records

Added 29 Oct 2026. `timeline_people.csv` holds some people twice, usually once
from the Balch Library database and once from Find a Grave, under a spelling
variant or a maiden and a married name. The owner reviewed 62 candidate pairs
and recorded the decisions in `curation/duplicates.csv`: 51 same person, 4
different people, 7 not sure. `data/` is not edited.

**The build counts people, not records.** Each confirmed group becomes one
person: the record named in `keep` stands for them; the others are listed on
it as "also recorded as" and are still found by search and by id. A blank
field on the kept record is filled from a folded copy; a field both carry is
never changed. Family links follow a folded record to its person. "Not sure"
pairs stay two people, each card naming the other. `scripts/longevity_gap.py`
reads the same file and folds the same records.

The record-level values of §9 and `CLAUDE.md` still hold for the CSV and are
still tested. The values that describe people are now:

| check | records | people |
|---|---|---|
| rows / people | 2,732 | 2,681 (51 folded into 50 people) |
| `timeline_usable = yes` | 2,572 | 2,521 |
| Lakeview · Harmony · Pleasant Valley | 2,101 · 263 · 368 | 2,065 · 254 · 362 |
| with a 1948 stone reading | 744 | 743 |
| with at least one family link | 399 | 394 |

Living population (people): 1800 **11** · 1850 **327** · 1866 **597** · 1900
**1,231** · 1927 **1,429** (still the peak) · 1950 **1,256** · 2000 **413**.
On the records the build still reproduces `timeline_population.csv` exactly,
and stops if it does not.
