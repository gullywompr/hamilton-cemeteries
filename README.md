# Lakeview Cemetery (Hamilton, VA) — timeline dataset

Base dataset for a scrolling-timeline infographic of the people buried at
Lakeview Cemetery, Hamilton, Loudoun County, Virginia.

## Sources

Two sources, kept separate in `raw/` and reconciled in `data/people_merged.csv`.

**1. Thomas Balch Library** (primary; the only one with inscriptions and relations)

> Thomas Balch Library, *Loudoun County Cemetery Database*, cemetery
> "LAKEVIEW", https://www.leesburgva.gov/departments/thomas-balch-library/research-reference-services/loudoun-county-cemetery-database
> — accessed 23 Oct 2026, 52 pages, 1,021 rows.

The database is built on the library's 1995 survey, updated since. It appears
to merge two listings: a newer plotted survey (plot codes like `C-25`, `N-17`,
`E-37`, `NE-53`) that runs A–H completely and then only sporadically, and an
older unplotted transcription that covers the rest of the alphabet. That is
why only 436 of 1,018 people carry a plot, and why a handful of people appear
twice under maiden and married names (see `probable_duplicates.csv`).

**2. Find a Grave**, Lakeview Cemetery, cemetery id 636238, memorial list
accessed 24 Oct 2026: 2,006 memorials, 1,910 with a plot, 1,918 with a
photograph, 112 flagged as veterans. Captured from the paginated listing only
(name, dates, plot, photo/veteran flags, memorial id); the individual memorial
pages (inscriptions, family links, bios, photos) were not pulled.

`raw/` holds each transcription exactly as captured (`~`-delimited:
last, first, plot, born, died, documented age, relation, memo), so the build
is reproducible and the raw text can be diffed against Find a Grave or the
1960 Jewell DAR typescript later.

## Build

    python3 build.py              # Balch -> people.csv, events.json, relationships.csv ...
    python3 build_findagrave.py   # Find a Grave -> findagrave.csv, then reconcile -> people_merged.csv, conflicts.csv

## Files in `data/`

| file | what |
|---|---|
| `people.csv` | one row per stone/person: names, plot, parsed birth/death with precision flag (`day`/`month`/`year`/`none`), raw strings as transcribed, parser note, documented age, inferred sex (from W/O, S/O, D/O only), relation text and parsed relation, memo, military unit if inscribed |
| `events.json` | the event model: birth, death, burial, military_service, and marriage (implied by "W/O"/"H/O") events, each carrying `person_ids`, date, precision, source and citation. Marriage events have no date yet — that is research to add |
| `relationships.csv` | 237 relationships parsed from inscriptions; 81 linked to another person in the cemetery by name match (`related_person_id`). Unlinked ones name people buried elsewhere or need a human eye |
| `anomalies.csv` | three rows the stone or the transcription got wrong (a 176-year lifespan, a death before birth, an unparseable date) |
| `probable_duplicates.csv` | five pairs with identical full birth and death dates under different surnames — almost certainly the same woman listed under maiden and married name. Not merged; your call |
| `context_events.csv` | starter set of national and regional events for the timeline's context layers. Regional entries are the ones worth growing: Loudoun secession vote, Ball's Bluff, the 1864 Burning Raid, the railroad reaching Hamilton in 1874, the 1875 incorporation, the 1918 flu |
| `summary.json` | counts and decade histograms (Balch only) |
| `findagrave.csv` | 2,006 memorials, names split into prefix / given (incl. maiden) / surname / suffix / nickname, parsed dates with precision, Find a Grave plot, flags, URL |
| `people_merged.csv` | **the table to build on**: 2,101 people. 923 appear in both sources, 1,083 only on Find a Grave (the post-1950 burials the Balch list lacks, through 2026), 95 only in Balch. Balch dates win where both exist; both plot schemes are kept (`plot_balch`, `plot_fag`) because they differ for the same grave |
| `conflicts.csv` | 132 people where the two sources disagree on a birth or death date. Most are a single transposed digit (1893 vs 1899, 03 vs 16) and a stone photo on Find a Grave will settle them; a few are real (Willard H. Brown d. 1955 or 1976) |
| `events_findagrave.json` | birth/death/burial/veteran events sourced to Find a Grave, keyed to the merged person ids, for the same event model |

## Shape of the data

- 1,018 people (3 exact repeats dropped), 975 with a birth year, 932 with a
  death year, 43 stones with no death date (some are open graves on shared
  stones, flagged `status = no_death_on_stone`).
- Earliest birth 1808 (Lydia A. Cox, d. 1885). Earliest burial **1853**
  (Mary V. Wiley, aged 2; Alice M. Norris) — the ground was in use two
  decades before the town incorporated. Latest death 2001.
- 361 people alive in 1864. 14 stones carry a Confederate unit:
  8th Virginia Infantry (Leesburg's regiment), 35th Battalion Virginia
  Cavalry (White's Comanches, raised in Loudoun), and one in the 43rd
  Battalion — Mosby's Rangers. Note Joseph R. Janney, 8th VA, from the
  county's Quaker family.
- Four deaths fall in 1861–65, all children or a mother: Virginia E.
  Schooley died 2 Nov 1864, age 13, three weeks before the Burning Raid.
- Birth-date precision: where the stone gives only an age at death, the
  build derives a birth *year* and says so in `birth_note`; it never
  invents a month or day.

## Date conventions

`birth_date` / `death_date` are ISO partial dates: `1864-11-02`, `1864-11`,
or `1864`. Always check `*_precision` before computing an age in days. The
database's own "Calculated Age" column was dropped because it is derivable
and occasionally wrong; "Documented Age" (what the stone says) is kept.

## Matching rules (people_merged.csv)

A Find a Grave memorial is matched to a Balch row on the same surname when
death year, birth year and first name agree closely (scored; a match needs
at least two of the three to agree). The 95 unmatched Balch rows are mostly
open graves (birth only, no death) that have no memorial, plus a handful of
surname spellings that differ between sources. Worth a manual pass.

Find a Grave's "Flowers have been left", "Veteran", "Sponsored" and "No grave
photo" labels were stripped from names and turned into flags.

## Next sources to reconcile

1. Find a Grave memorial *pages* for the 132 conflicts and for the ~240
   inscriptions Balch records as relations, to pull family links and photos.
2. Jewell, *Cemeteries of Loudoun County* (1960 DAR typescript, FamilySearch
   catalog 104227, vol. 1 "Hamilton City Cemetery") — stones since lost.
3. 1850–1940 federal censuses for Hamilton / Mt. Gilead district —
   occupations, households, ages to cross-check.
4. Loudoun marriage registers (1850–) for the marriage events.

## Harmony United Methodist Church Cemetery (added 24 Oct 2026)

Same two sources, same pipeline, file names prefixed `harmony_`:

    python3 build.py harmony && python3 build_findagrave.py harmony

Balch lists 212 stones (210 after exact repeats), Find a Grave 224 memorials
(217 photographed, no plot numbers at all). Merged: 263 people, 171 in both
sources, 53 Find a Grave only, 39 Balch only. The unmatched are mostly
spelling drift between the transcribers (Gray/Grey, Coonts/Coats,
Hawkins/Hawkings) and are worth a manual pass. 56 date conflicts, a much
higher rate than Lakeview; these are older, more eroded stones and the two
readings often differ by a digit.

This is the pre-Civil War ground for Hamilton. Earliest stone is Richard
Tavenner (1769–1837); the earliest *birth* is Catharine Torreyson, derived
from a death in 1843 at 89. Eleven people were born before 1800. Nothing
here postdates 1943 except one 1990 burial. Note the conflict on the
1785–1872 widow: Balch reads the stone as Annie French, widow of Nathaniel;
Find a Grave has her as Ann "Annie" Burke Arnett. Same dates, different
surname; one transcriber is wrong.

`data/people_all.csv` is both cemeteries concatenated (2,364 people) with
a `cemetery` column; person ids are prefixed `LV` and `HM` so they never
collide.

## Pleasant Valley Cemetery (added 24 Oct 2026)

    python3 build.py pleasantvalley && python3 build_findagrave.py pleasantvalley

Hamilton's historically African American cemetery, at the edge of town.
Balch 263 stones, Find a Grave 321 memorials (312 photographed, no plots).
Merged: 368 people, 216 in both, 105 Find a Grave only, 47 Balch only;
19 date conflicts. Burials run from 1856 to 2023; earliest birth is Annie
Hill, 1829, derived from an age at death. Only 12 of these people were alive
in 1864, and the stone that matters most for that year has no dates at all:
Lewis Jones, "Co B U.S. Colored Infantry," husband of Delila J. Jones (born
1833 or 1838; the two sources differ and Balch flags it). He is the only
Union soldier in any of the three cemeteries. Fourteen other stones carry
20th-century service: WWI, WWII (Army, Navy, Marines), Korea.

`data/people_all.csv` now covers all three cemeteries: 2,732 people.

## Census cross-reference (scaffolding, 24 Oct 2026)

No free full transcription of the 1860–1880 Loudoun schedules exists
online (VAGenWeb offers email lookups only; USGenWeb has a 1850 index). The
indexed images are on FamilySearch (free account, per-person use) and
Ancestry (paid); bulk is IPUMS USA full-count data, free for non-commercial
research by application. Two files are ready for either route:

- `data/census_targets.csv` — 10,827 rows: every (person, census year) pair
  a person could appear in, with surname, first name, nickname, inferred
  maiden name, expected age and a +-2/3 window, and the spouse or parents
  from the stone as a confirmation key. People with no birth date (e.g.
  Lewis Jones, USCT) have no rows and need a hand search.
- `census_match.py extract.csv` — joins an IPUMS-style extract (YEAR,
  SERIAL, PERNUM, NAMELAST, NAMEFRST, AGE, SEX, RELATE, BPL, OCCSTR ...) to
  the targets by surname soundex, age window, first-name canonicalisation
  (Wm, Jno, Lizzie, Sallie ...), and whether the spouse/parents on the stone
  are in the same household. Writes `census_matches.csv` (scored
  candidates) and `census_households.csv` (everyone in each matched house,
  which is what the 1864 snapshot wants). Smoke-tested on a synthetic
  extract; untested on real data until an extract exists.

Suggested first extract: Virginia (STATEFIP 51), Loudoun County (COUNTYICP
1070), years 1860 and 1870, all persons.

## Census pilot — hand lookups, 24 Oct 2026

`data/census_pilot.csv` holds 46 logged lookups against the FamilySearch
indexed censuses (1850 = collection 1401638, 1860 = 1473181, 1870 = 1438024),
done one at a time by hand. 29 produced a record; 39 people are covered; 18 of
the records are already attached to a FamilySearch Family Tree profile, whose
id is in `family_tree_id` — those are the cheapest route to parents, spouses
and children for the relationship layer.

Columns: `person_id`, `census_year`, `source`, `ark` (append to
`https://www.familysearch.org/ark:/61903/1:1:`), `enumeration`, `page`,
`name_as_enumerated`, `age`, `sex`, `race`, `birthplace`, `household`
(everyone in the house, with ages), `family_tree_id`, `note`. Rows with an
empty `ark` are logged *failures* — they record which search was tried so the
same ground isn't covered twice.

**What it settles**

- **Hamilton is "Southern District, Loudoun"** in 1860 (pages ~9–190 of NARA
  M653) and **"Southern Division"** in 1870 (M593). Several of the men turn up
  in an unnamed "Loudoun" district instead, so both need searching.
- **George Franklin Everhart**: the balance now favours **1842**, though the
  stone says otherwise. The history: I first claimed the census settled it at
  1842, then retracted that when the DAR survey read the stone as "Jan. 12,
  1828 – June 25, 1918", agreeing with Balch. On **25 Oct 2026** page 16 of
  the same survey supplied his parents, and they change the picture.

  DAR entries 423–425 give **William N. Everhart, Oct. 23, 1817 – Jan. 10,
  1903**, his wife **Catharine S., Sept. 5, 1820 – Dec. 5, 1862**, and their
  daughter **Annie A., Feb. 20, 1844 – Aug. 9, 1866**. The 1860 Southern
  District household (ark `M41J-FJ1`) reads "William W Everheart 42,
  Catherine 44, Mary S 19, **George F 18**, Arrabella 15, Lydia J 13,
  William W 8". Two children tie that household to Lakeview stones exactly:
  *Arrabella 15* is Annie Arabella above (b. Feb 1844, so 16 in June 1860),
  and *Lydia J 13* is Lydia Jane Everhart Cummings, b. July 5, 1846 — DAR
  entry 427 — age 13 to the month. William N., born Oct 1817, is 42 in June
  1860, matching the head of the household exactly.

  So that household is William N. Everhart's, and the George F. in it was
  born about 1842. **A man born in 1817 cannot have fathered a son in 1828.**

  The assumption, stated plainly: that the George F. Everhart buried at
  Lakeview is the son in that household. Supporting it — his parents, his
  sister Annie Arabella and his sister Lydia Jane are all buried at Lakeview,
  and he lies there with his wife Mary Belle. Against it — the census gives
  Catherine's age as 44, which points to a birth around 1816 rather than
  1820, a five-year gap; and the stone itself, read independently by Balch
  and by the DAR surveyors, says 1828. If 1842 is right, the error is in the
  stone or its cutting, not in the two readings of it. Still not proof; it
  needs a death certificate, an obituary or a family Bible. See
  `data/verified_findings.csv`.
- **Jacob Divine** (HM0041) has a *broken stone with no dates at all* in
  Balch. The 1850 census gives him as 65, so born c. 1785, husband of Betsey
  Dodd Divine — a dated identity recovered for a blank marker.
- **Betsey Dodd Divine** is confirmed a Dodd by the tree profile
  (Elizabeth Dodd, 1787–1874), which supports a link to John Dodd Jr (HM0044).
- **The Harmony 1785–1872 widow** (the Annie French / Ann Burke Arnett
  conflict): the tree profile is **Ann Burke, 1785–1872**, exact stone dates,
  and in 1850 she is living as "Ann Arnete", 66, with Kaziah Arnete 38 —
  who is Keziah Arnett (1810–1889), also at Harmony. So Burke → Arnett, and
  possibly → French by a later remarriage, which would make Balch's literal
  stone reading ("widow of the late Nathaniel French") correct and Find a
  Grave's name her earlier married one. Either way HM0050 and HM0211 are one
  burial.
- **Virginia E. Schooley**, who died 2 Nov 1864 three weeks before the Burning
  Raid, is almost certainly the "Mary E, 10" in her father's 1860 household
  (Southern District p. 167): right birth-order slot between Charles and
  Eliza, and this household's indexed ages run about two years high. The same
  house holds **Emma, 5 — a sixth Schooley daughter with no stone in any of
  the three cemeteries**.
- **Surname variants the matcher should learn**: Ruse→Reese, Beans→Beanes,
  Wilson→Willson, Everhart→Everheart, Chamblin indexed with no middle name,
  Dorrell's "A" indexed as "O", Saunders→Sanders, Fletcher's family migrating
  Fauquier → Prince William → Loudoun between 1850 and 1860.

**Where the Confederate men lived (1860)**

Thirteen of the twenty-three CSA-marked stones are placed in 1860. Eleven are
in Loudoun and **nine of those in the Southern District**, the district that
contains Hamilton. Because the enumerator walked a route, page numbers are a
rough proxy for distance: Chamblin 76, Wilson 102, Shaffer 111, the two Beans
118, Janney 130, Laycock 153, Everhart 162, Saunders 188, Tillett 190.
Saunders and Tillett, two pages apart, were near neighbours. Three more are
in an unnamed "Loudoun" district (McFarland p. 9, Fletcher p. 85, Dorrell
p. 165) which cannot be compared to Southern District page numbers. Two were
outside the county: Lovett in Fauquier and Follin in Fairfax — and the Follin
identification is uncertain.

The striking pattern is age and household position. Only two were heads of
household in 1860: William Beans, 39, and Moses Willson, 48. The rest were
boys and young men still at home — Aaron Beans 18 under his father William,
Everhart 18 under William W., Janney about 18 under Asa, Laycock 18 under
James and Mary Ann, McFarland 14 under Alexander, Dorrell 22 under James T.,
Dowdell 26 under Thomas G., Saunders under his mother Amanda, Tillett under
John L. and Harriett. Chamblin, 24 and newly married, was living with his
wife's family. In several cases those parents are themselves buried in the
same cemetery, which is what confirms the identifications.

One cross-link worth noting: Charles W. White, 25, appears in the Laycock
household in 1860 — and LV0970 Charles W. White is himself an 8th Virginia
man at Lakeview. Two of the regiment under one roof.

Note the census gives an enumeration district, not an address, and the
Southern District covered considerably more than Hamilton.

**Occupation: the 1860 index does not have it.** I checked. A FamilySearch
1860 record carries name, sex, age, estimated birth year, birthplace, race,
event place and page - and no occupation field at all. The 1860 schedule does
record a trade, but only on the image, so occupations for the 1864 snapshot
mean reading census images column by column.

**The 1880 index does carry it,** along with relationship to head and both
parents' birthplaces, and most of these men lived that long. Three done so
far:

| | 1880 district | occupation |
|---|---|---|
| Thomas A. Schooley | Hamilton, District 56 | **Blacksmith** |
| Charles F. Myers | Hamilton, District 55 | **Carpenter** |
| John M. Chamblin | Mount Gilead | **Miller** |
| John F. Laycock | Mount Gilead | **Farmer** |
| William A. McFarland | Mount Gilead | **Merchant** |
| William H. Beans | Jefferson District | **Farmer** |
| Aaron H. Beans | Jefferson District | **Works on farm** |

| William H. Fletcher | Jefferson District | **Works on farm** |

A blacksmith, a carpenter, a miller, a merchant and four men on the land -
about the right shape for a Loudoun village in 1880. Fletcher, who rode with
Mosby, was working someone else's farm at 39.

**The 1880 index is patchy for these particular men: eight found, seven not.**
Tillett, Janney, Everhart, Saunders, Shaffer, Dowdell and Lovett did not
surface under any spelling tried. That is not an empty index - a control
search returns twenty Tilletts in 1880 Loudoun - and many entries are indexed
by initials alone (H. Tillett, C. Tillett, T.R. Tillett). So these men are
most likely present under initials or mangled surnames rather than absent,
and the way in is to search by spouse or by household rather than by name.
Hector Saunders's absence is the oddest of them, since he was alive in 1880
on either reading of his death date.

**Aaron Beans never left home.** He is 18 in his father's house in 1860, 28
there in 1870, and 36 there in 1880, unmarried, working the farm. Three
censuses, one address, one life.

**And a loop closed itself.** William McFarland, the fourteen-year-old of the
1860 census, is a merchant at 35 with a four-month-old daughter, Jessie H.
That baby is LV0596, Jessie Hess McFarland Laycock, 1880-1945 - she married
into the Laycocks, and the 1948 survey records her stone as entry 11. The
Confederate cavalryman's infant daughter, found three ways over.

So Virginia Schooley, who died three weeks before the Burning Raid, was the
village blacksmith's daughter. Laycock being a farmer squares with the deed
whose boundary runs along his land. And the 1880 census names the place
**"HAMILTON, District 56"** outright.

**It also closed an open question.** Emma Schooley - the sixth daughter in
the 1860 household with no stone in any of the three cemeteries - appears in
1880 aged 24, unmarried, still at home. She did not die young; she married
out or died elsewhere.

George F. Everhart is **not** in the 1880 Loudoun index under that name,
which is a pity: his age there would have settled the 1828-versus-1842
conflict outright. Every Everhart returned belongs to a Lovettsville family
and none has a wife Mary Belle. Worth retrying under the Everheart spelling
or by searching his wife.

**An error found and fixed, 24 Oct 2026:** six rows logged early in the
session carried person ids that were a few places off in an alphabetical
list, so they pointed at the wrong burials (Janney, Laycock, Lovett,
Saunders, Shaffer, Tillett). All six are corrected and the corrections noted
in the rows. Five are independently confirmed by the enumerated household
matching parents buried in the same cemetery; the Shaffer row is flagged
uncertain, because its principal is a John Shafer aged 64 while our man was
born in 1837. The `ark` column has also been normalised to bare record ids
throughout. Anyone who took a copy of `census_pilot.csv` before this should
replace it.

## Deed and court sweep, 24 Oct 2026

`data/deed_fulltext_hits.csv` — 47 rows, 150 referenced pages, covering the
nine Southern District men, from FamilySearch's full-text search of
handwritten Loudoun records with the Place filter set to Virginia.

**Correction to what this README said earlier.** Confederate compiled service
records are *not* only on Fold3 and Ancestry. "Virginia. Military Service
Records 1861–1865" is in the free full-text corpus, and a name search
surfaced service-record pages for **six of the nine**: Saunders (7 pages),
Janney (7), Everhart (5), Tillett (3), Wilson (2) and Laycock (1). That is
the cheapest route into these men's service, and it needs no Ancestry
subscription and no trip to Balch.

**The two best threads**

- **Hector A. Saunders** has six pages in Loudoun **Deed Books 1860–1861** —
  the very year he was enumerated. For putting a man on actual ground, that
  is the strongest lead the sweep produced.
- **William Henry Beans** has the richest wartime trail: eight pages of
  Loudoun court records 1858–1866, three more 1858–1868, and two pages of
  **Deed Books 1861–1865**. Land and court business transacted during the war
  itself.

**Also worth having:** a **marriage record** for Laycock (1879–1895) and one
for Wilson (1751–1880) — `events.json` currently carries marriage events with
no dates at all, so these are the first real ones. Birth registrations for
Beans, Everhart and Laycock will name parents. And **five of the nine appear
in the 1948–50 gravestone transcriptions**, with Janney and Everhart on the
same page and Tillett and Laycock on adjacent ones, which means the survey
listed them together and those pages should yield several inscriptions at
once.

**Two men the sweep did not help**

- **John Shaffer**: every hit is 1814–1821, decades before his 1837 birth — a
  different, earlier John Shaffer. Combined with the census row, whose
  principal was a John Shafer aged 64, his identification is still
  unresolved.
- **John Mahlon Chamblin**: no service-record page surfaced, unlike six of
  the others. Worth retrying as "John Chamblin" and "J M Chamblin".

**How to read these rows, and what they are not.** Each row is a *page-level
full-text match on a name*, not a verified record for our man. Common names
will carry false matches — the Moses Wilson rows after 1873 almost certainly
belong to someone else, and the file says so. Five pages have now been read;
the rest have not.

## Reading pass, 24 Oct 2026

Five pages opened and transcribed by eye. The transcriptions are in
`transcripts/`; what they change is in `data/verified_findings.csv` — 25
findings across 23 people.

**Joseph R. Janney's war, in one document.** His Confederate compiled service
record (`3QHN-G3YT-D6GB`) is a claim for commutation of rations, and his
company commander certifies that Private Jos. R. Janney of **Company A, 8th
Virginia Volunteers** "was wounded on the 21st of July 1861" and drew no
government rations until 4 May 1862. The 21st of July 1861 is First Manassas,
where the 8th Virginia fought. So the Quaker family's son was hit in the
war's first major battle and spent the next nine and a half months out of the
field. The stones give only "CSA 8TH VA"; this supplies the company, the
wound, the dates, and the name of his company commander — which opens the
rest of Company A. The service-record route works, and it is free.

**The 1948–50 survey mostly CONFIRMS rather than improves — I over-claimed
here and am correcting it.** I first wrote that year-only dates "became exact
ones for Janney, Tillett, Laycock and both Saunderses". Folding the readings
back into the data shows otherwise: of 38 values taken from the survey,
**29 already matched the dataset exactly** — Balch or Find a Grave had them
all along. Only **John F. Laycock** genuinely gained precision. That does not
make the survey worth less, but it changes what it is *for*: the entries with
no counterpart in either modern source, the relationships spelled out in the
wording, and the occasional real correction — not date precision. The whole
Laycock household of the 1860 census is now independently confirmed against
the stones — James in his 86th year, Mary Ann in her 53rd, John F. born
29 September 1842 — along with his wife Mary Catherine Roberts, their
daughter Mary A. who died at not quite three, and two more children lost in
1857 and on Christmas Day 1859. The Tillett identification is likewise
confirmed three ways: census, stone and DAR.

**Four things it changed.**

1. **Everhart is not settled.** See the retraction above.
2. **Hector A. Saunders's death date is in doubt.** The dataset has 1909; the
   DAR survey reads "b. July 6, 1834 d. Feb. 16, 1900". There is also a
   second Hector A. Saunders in the data (LV0818, 1851–1901), and a
   transcriber may have crossed them.
3. **Summerville A. Schooley was a woman.** LV0842 carries a name that reads
   male, with no sex recorded. Entry 271 has her as "Summervill A., wife of
   Milton Schooley, d. Sept. 5, 1901 Aged 53 yrs." — born about 1848.
4. **Amanda C. Saunders was not necessarily his mother.** My note on his
   1860 census row said she was. The DAR survey calls her "wife of
   P. Saunders" and names Mortimer T. as son of P. & A. C. That was my
   inference, not evidence, and it is withdrawn.

### Service records read, second sitting

Four more men's compiled service records opened. The stones give a regiment;
these give the company, and a good deal more.

| man | unit established | the detail |
|---|---|---|
| Joseph R. Janney | Private, **Co. A, 8th Va Volunteers** | wounded at First Manassas, 21 July 1861; drew no rations until 4 May 1862 |
| George F. Everhart | **4th Sergeant, Co. E, 35th Bn Va Cavalry** | enlisted at Waterford by Capt. White; captured at Leesburg 15 Feb 1863; Old Capitol Prison; exchanged at City Point 6 Apr 1863 |
| Hector A. Saunders | Private, **Co. H, 8th Va Infantry** | enlisted 13 July 1861 at Leesburg by Col. Hunton for one year; detailed to Division Provost Guard by autumn 1863 |
| Moses D. Wilson | Private, **8th Va Infantry** | enlisted at Hillsboro by Capt. Heaton; present Jan-Feb 1863, **absent without leave** by the Mch-Apl muster; unpaid since 31 Aug 1862 |

Three of the four were enlisted by men whose names carry the county's war:
Elijah White raising his cavalry at Waterford, Eppa Hunton signing up his own
neighbours at Leesburg. Everhart signed the prisoner-of-war roll in his own
hand.

**What they do not give is an age.** None of these cards records one, so the
Everhart 1828-versus-1842 question and the Wilson father-or-son question both
remain open. A descriptive roll, or the Old Capitol Prison register for
Everhart, would carry an age and is where to look next.

### The deed books, and a better way into them

One deed opening was read: Loudoun Deed Book 5-T, image 465. Hector A.
Saunders was party to a land purchase of **26 February 1861**, jointly with
John W. Saunders and at least one other Saunders, for one hundred dollars,
from a Clark husband and wife. Three Saunders men buying together points to
brothers or co-heirs. The property description defeated me.

Found on the same opening, unrelated to the nine: a deed describing **"a
certain lot of land at Hamilton Station"**, with metes and bounds, signed by
Tavenners. The town under its railroad name in a deed of about 1861 - worth
following for its own sake.

**Reading these from the viewer is the wrong technique.** A deed opening
takes six to ten screenshots of dense secretary hand, with real risk of
mis-transcription; my reading of one grantee's name in that deed is almost
certainly wrong and the file says so. The machine-read snippet on the search
result card is more reliable for names than my eye on the manuscript - but
snippets render only for the top-ranked card. So the efficient route through
the remaining deed pages is to **search each name until the page you want
ranks first, and harvest the snippet**, rather than opening images. The
typescript sources (the 1948-50 survey) and the printed-form sources (service
record cards) are the opposite: fast, legible, and worth reading directly.

### Working the 1948-50 survey systematically

**The sections are located.** In film 008139870 the Lakeview listing is
headed **"Hamilton, Virginia (City Cemetery)"** and begins at **image 909**,
typescript page 1, entry 1. The typescript page number is the image number
minus 908. The listing runs to about image 943 and is followed by an
alphabetical name index from about image 945, which gives name and page for
every entry - useful as a lookup once the pages are transcribed.

**Technique that works.** Open the section, **zoom in two steps from the
default** (one step is where the 2/3 digit confusion creeps in), click once
on the image itself so keyboard focus leaves the image-number box, then pan
with `shift+Up` / `shift+Down` and page forward with the Next Image arrow:
both the zoom and the pan position persist. Three to four screenshots cover a
28-entry page. Lakeview runs to 27 pages and 754 entries; the volume as a
whole is 1,069 images.

### Folding the survey back into the data

`apply_dar.py` applies hand-curated survey readings and writes three files.
It never touches `people_all.csv`.

- `data/dar_corrections.csv` - 8 field changes across 4 people, each with the
  old value, the new value, the DAR entry number and the ark.
- `data/dar_conflicts.csv` - disagreements, NOT applied. One so far: Samuel
  R. Tillett's birth, where the dataset says 23 August 1842 and the survey
  says the 3rd. One transcriber misread a digit and the stone has to settle
  it.
- `data/people_all_enriched.csv` - the full table with the changes applied
  and three added columns, `dar_entry`, `dar_source` and `dar_note`.

Added in the 25 Oct re-verification pass:

- `transcripts/dar1948_lakeview_VERIFIED.txt` - the whole Lakeview section,
  entries 1-443, second pass at high zoom. Supersedes the earlier per-page
  files, which are kept but marked.
- `reconcile_dar2.py` - the strict matcher. Requires surname, given name and
  dates to agree; assigns each person to at most one entry; takes the surname
  from the end of the name phrase and inherits it for "his wife" style
  entries; reports MATCH / CONFLICT / UNDATED / UNMATCHED. `--csv` appends
  every row to `data/dar_reconcile_v2.csv`.
- `data/dar_reconcile_v2.csv` - all 443 entries with their verdict and the
  person each was matched to.
- `data/dar_date_conflicts.csv` - the 12 date disagreements, with a note on
  each saying what is actually in dispute.

Two bugs caught while building it, both the kind that quietly corrupt a
dataset: the first version **overwrote** John Shaffer's `memo`, destroying
the "CSA 8TH VA" already there, and it **silently resolved** the Tillett date
disagreement in the survey's favour instead of flagging it. Memo fields now
append, and disagreements go to the conflicts file rather than being decided
by whichever source was read last.

### THE LAKEVIEW SECTION IS COMPLETE: all 27 pages, entries 1-754

The Lakeview (Hamilton City Cemetery) listing runs **images 909 to 935 =
typescript pages 1 to 27 = entries 1 to 754**. Image 935 is the last listing
page; the alphabetical name index runs images 936 to about 944. All 754
entries are transcribed in `transcripts/dar1948_lakeview_VERIFIED.txt`, with
every page-boundary gap filled.

> Two corrections I made to myself here, in order. First I reported the
> survey as turning up ~54 stones the modern sources had missed; that was a
> loose matcher plus my own misreadings, and it is retracted below. Then I
> reported the section finished at entry 443; 443 is only where page 16 ends.
> Check both ends of a range before calling it complete.

#### Read this before trusting anything the earlier draft said about the survey

The first pass produced two claims that were wrong, and they compounded.

**The matcher was too loose.** `reconcile_dar.py` accepted a match on
surname-soundex plus *any* year appearing anywhere in the entry, and let one
person be claimed by any number of entries. It matched "Unmarked grave in Cox
lot" to a real burial.

**The transcription had systematic reading errors.** Re-read at high zoom,
the typescript says *Mock* where I wrote "Hock" (10 entries), *Wine* for
"Vine", *Moatz* for "Hoats", *Fincham* for "Pincham", *Mossburg* for
"Vossburg", *Seaton* for "Gaston", *Verts* for "Yerts", *Sagrario* for
"Saggario" - plus a recurring 2/3 confusion in year digits (1888 read as
1889, 1928 as 1938, 1823 as 1853, 1920 as 1930, 1902 as 1908, 1927 as 1937,
1898 as 1892, 1867 as 1897).

Together those produced the claim that the survey finds stones the modern
sources missed, "on the order of a hundred" across Lakeview. **It does not.**
Every one of the Hock, Vine, Hoats, Pincham and Vossburg "missing families"
was my own misreading; all are in `people_all.csv` with dates that match
exactly. The first-pass files in `transcripts/` are marked SUPERSEDED and
kept only for provenance.

#### What the survey actually gives you

Second pass, strict matcher (`reconcile_dar2.py`), all 754 entries:

| verdict | count | meaning |
|---|---|---|
| MATCH | 693 (92%) | surname, given name and every year agree with a known burial |
| CONFLICT | 26 | the people agree, a date does not |
| UNDATED | 17 | plausible person, but the entry carries no year to test |
| UNMATCHED | 18 | no counterpart found |

The rate holds across the section: 407 of 443 on pages 1-16, 286 of 311 on
pages 17-27, both 92%. Row-by-row output in `data/dar_reconcile_v2.csv`.

Most of the 18 unmatched dissolve on inspection - a different given name in
the modern record (Bertie Seaton = LV0848 Bernice W. Seaton; Ora Baldwin =
LV0047 Orianna; the unnamed Rhodes infant = LV0809 Elizabeth E.), a second
dateless marker for someone already matched, or a surname sitting mid-line
where the matcher could not see it (Edward Mauran Dunbar = LV0353). One is
literally "Unmarked grave in Cox lot".

**The survey's value is not new burials. It is four other things.**

**1. Twenty-six date disagreements to settle at the stone** -
`data/dar_date_conflicts.csv`, each with a note on what is actually in
dispute. Several resolve on arithmetic or on family logic alone:

- **Albert C. Davis (LV0310)** is carried as **1822-1998**. DAR entry 318
  reads "b. Aug. 24, 1822 d. June 9, 1898 at 75 yrs. 9 mo. 16 ds." - and 24
  Aug 1822 plus 75y 9m 16d lands exactly on 9 June 1898. The modern record
  has a typo; the survey is right.
- **Ellen D. Menard** (entry 329) is typed "b. Sept. 8, 1939", a typescript
  typo for 1839; both sources agree she died 25 March 1905.
- **George L. Moatz** (entry 499) is modern-dated 1857, but he is "son of
  Daniel & Lizzie Moatz" and Daniel is 1857 - the father's year on the son's
  record. The survey's 1884 fits.
- **Minnie E. White** (entry 673): modern 1861, survey 1881. She is daughter
  of parents born 1834 and 1845, so 1881 fits and 1861 does not.
- **James W. Love** (entry 751) is the one where *neither* source works:
  survey 1859, modern 1829, and he is son of parents both born 1853.

The widest open gap is **Martha W. Ballenger** (LV0053): survey 13 December
1917, modern sources 1947.

**2. Precise dates for one of the nine Confederate men.** DAR entry 640:
**"Hector A. Saunders, b. July 6, 1834 d. Feb. 16, 1900."** `people_all.csv`
(LV0828, memo CSA 8TH VA) has only "1834 - 1909". An exact birth date gained
and a death year now in dispute. A test that would settle it: a man who died
in February 1900 cannot appear in the 1900 census enumerated that June.

**3. Six duplicate or corrupted records in the modern data**, all flagged in
`data/verified_findings.csv`, none changed:

- **LV0267 "James Grafton Cox" / LV0469 "Infant Grafton"** - one child,
  identical dates and parents, one record with the surname and one without.
  The DAR entry (383) is the same child a third time, and the typescript
  also loses the surname.
- **LV0583+LV0584 "Larson" / LV1360+LV1361 "Larsen"** - Niels and Elizabeth
  recorded twice under two spellings. The survey spells it both ways itself,
  on consecutive lines (493, 494), and settles Elizabeth's birth at 1860
  against LV0583's 1869. It also carries a detail neither modern source has:
  **"b. Denmark"**.
- **LV0470 / LV1166, Maggie J. Graham** - LV0470 carries her *husband's*
  death date (1916-01-28) and his birth year, with her birth day. Entry 622
  gives her correctly as 1871-1943, matching LV1166.
- **LV0647 / LV1470 and LV0646 / LV1472, two McDaniels** - a dated record and
  a date-only stub for the same person, in the same family, on the same page.
  In both cases the survey's age arithmetic ("58 yrs. 11 mos. 14 ds.",
  "29 yrs. 8 mo. 17 ds.") counts back to the full record's birth date and
  confirms it.
- **LV0818 "Hector A Saunders 1851-1901"** - those are Annie C. Saunders's
  dates (LV0817, 1851-08-18 to 1901-12-28), same birth day, death day one
  digit apart. The survey lists one Hector, born 1834.

**4. Five candidate missing burials** across 754 entries, down from the
fifty-four I claimed:

- **Frances Traphagen Field, 1868-1935** (entry 533). The strongest: there is
  no Field at Lakeview, and no surname anywhere in the dataset with the same
  soundex. No Traphagen either.
- **Charles D. Weadon, Jr., 9 Sept 1877 - 4 June 1901** (entry 700). Seventeen
  Weadons at Lakeview and no junior. Supporting it: entry 107 records an
  "Infant son of C. D. and M. E. Weadon, Jr." in March 1901.
- **John Alexander Lynch, Jr., 1882-1927** (entry 142). The only Lynch at
  Lakeview is Maude Poulsen Lynch (1885-1959), very likely his widow.
- **George Lee Hawley, b. 1 Nov 1936**, death blank in 1948 (entry 144). A
  pre-cut stone for someone then living would explain it, in which case he is
  not a burial at all.
- **Susan Carter, d. 19 Oct 1867 at 8 yrs** (entry 312). Caution: LV0206
  Edward F. Carter is recorded 1857 - 19 Oct 1865, same day and month, a child
  of similar age. Possibly one weathered stone read two ways.

All five need the stone, not another source.

#### Harmony and Pleasant Valley are NOT in this film - stop looking

Settled 25 Oct 2026. **Image 907 is the table of contents** for the Loudoun
section of the volume, and it lists exactly four cemeteries:

    City Cemetery, Hamilton
    City Cemetery, Hillsboro
    Original Cemetery, New Jerusalem Lutheran Church, near Lovettsville
    Union Cemetery, Lovettsville

The film's own item list (the viewer's **Information** panel, which is the
fast way to get a film's contents and which I should have opened on day one)
gives the whole of film 008139870:

| item | contents |
|---|---|
| 1 | Virginia cemetery records presented to the Genealogical Records Committee, DC - Jewell & Seymour, Federal City Chapter. Its own contents page at **image 8**: Mt. Zion Old Baptist (Route 50), Old Methodist Church Leesburg, Manassas Cemetery, Floris Old School Cemetery |
| 2 | Goose Creek Friends Burying Ground, Lincoln - Freedom Hill Chapter |
| 3 | **Deaths in Loudoun County, Virginia** - Aurelia M. Towner Jewell. From **image 178** |
| 4-5 | Records of the Union Cemetery, Leesburg - Margaret M. S. Spinks, Manor House Chapter. By **image 400** |
| 6 | Cemetery records from Loudoun County, Vol. 1 - the volume containing Hamilton, from **image 905** |

No Harmony, no Pleasant Valley anywhere on the film. For those two the next
thing to try is the 1960 Jewell typescript already listed as a source above.

#### Who actually made this survey, and why that matters

Image 905 is the title page of **DAR Genealogical Records Committee, District
of Columbia, VOLUME 164, 1948-1950**. Image 906: the Loudoun section was
presented by the Federal City Chapter and **prepared by Mr. and Mrs. Walter
T. Jewell and Miss Neda M. Seymour**. Image 908 is Hamilton's own title page,
"HAMILTON (LOUDOUN COUNTY) VIRGINIA / CITY CEMETERY", with "Lake View" added
by hand. Hillsboro's (image 946) is dated "Copied October 1948".

**The Jewells also compiled the 1960 `Cemeteries of Loudoun County`
typescript** listed as a next source above. So the 1948-50 survey and the
1960 typescript are the same compilers twelve years apart - not two
independent witnesses. Where they agree, that is one source read twice. This
matters for the Everhart birth-year question, where "two independent stone
readings" was part of the case for 1828: Balch and the DAR survey are
independent of each other, but the DAR survey and the Jewell typescript are
not.

#### Loudoun death records, `data/loudoun_deaths.csv`

**Item 3 is images 178-288**, and the typescript's own "Page N" header is
exactly `image - 177`, verified against the headers on ten separate images.
The **"End of Page N" rules scattered mid-page are a different numbering** -
the *original* register's pagination, running about four pages behind - so
`src_image` is the locator to trust, not either page number.

The item is **not indexed**: image 289 is a title page reading "INDEX BOOK 1
- THE INDEX OF UNION CEMETERY, LEESBURG", so everything from 289 to about
350 indexes the *Leesburg* lot register, not the deaths. I briefly took that
index for this item's own, and the EVERHART and JANNEY blocks I read off it
are Leesburg burials, not Hamilton ones - the title page one image earlier
said so, and I had not looked at it.

So the only way in is to read the pages. `data/loudoun_deaths.csv` is that
transcription. It keeps a `verbatim` column holding each entry exactly as
typed alongside the parsed fields, so nothing is lost to my parsing.

**The item holds at least three different kinds of record**, which matters
because they carry different fields:

| pages | type | what each entry gives |
|---|---|---|
| 1-~80 | post-1853 state register | name, sex, day and month, **cause of death**, age, birthplace, **parents**, often the informant and their relationship |
| ~85-95 | 1890s-1900 death list | name, full date, often an age as "in his 77 year" |
| ~100-103 | 1820s newspaper death notices | narrative - place of death, burial ground, relationships, sometimes the whole circumstance |

**Years, from the headings in the register itself:**

| year heading | first appears |
|---|---|
| 1853 | page 1, image 178 (section title "Deaths in Loudoun County, Virginia. 1853") |
| 1854 | mid page 13, image 190 |
| 1855 | page 26, image 203, after Elizabeth Alnutt |
| 1856 | page 36, image 213, after John Stedman |
| 1857 | page 44, image 221, after Mary R. Crowsen |
| 1858 | page 53, image 230, after William B. Hutchison and an "End of Page 28" rule |
| 1859 | page 62, image 239, after Nancy Presgraves and an "End of Page 33" rule |
| **1864** | page 69, image 246, after John Littleton. **The register jumps straight from 1859 to 1864 - there is no 1860-1863 block in this typescript.** |
| 1865 | page 74, image 251, at the head of the page, before Wm. A. Walker |
| 1866 | page 81, image 258, after Amanda White and an "End of Page 42" rule. **From 1866 on the register runs roughly ALPHABETICALLY by surname within the year, not in the loose order used 1853-1865.** |

**Two alphabetical runs inside 1866.** The first runs A-W across pages 81-83 (Ambrose ... Wynkoop/White/Ballenger). The alphabet then restarts at A mid-page 83 (Mary Ann Arnett) **with no year heading between them**. The second run is still 1866, not 1867, and this is now CONFIRMED two ways:
(a) Arabela Ann Everhart sits in it, and her Lakeview stone (LV0397) dates her death to 1866 while the register age fits 1866 and not 1867; (b) a faint
PENCIL "1866" is written in the right margin of page 84 (image 261), beside
the Luther Humphrey entry. Probably a supplementary run of late-filed returns.
Note also that the run is GROUPED rather than strictly alphabetical - Mary
Berry is filed between Lowe and Morris on page 84.

Around **page 21 (image 198) the typist's format changes** - from
`name, sex, date, cause, age, b. place, parents` to
`Name, sex, of Cause, Date, at Age. b. Place. Parents: ...` - and from that
point on the entries start naming real places (nr. Harmony, nr. Goose Creek
Meeting House, Philomont, Mt. Gilead, Snickersville, Mountsville, Gum
Spring, Evergreen, Bellfield, Recovery Hill, "the Old Homestead at the foot
of the Blue Ridge", "on James Whitacre's farm", "between the hills") where
the earlier pages mostly just said "Loudoun Co."

**The register duplicates entries, and the duplicates disagree.** See
`data/loudoun_deaths_duplicates.csv`. Both versions of each are kept in the
dataset with the conflict recorded, rather than silently picking one. The
likeliest cause is the copyist re-copying a block from the original
register - one duplicate (Mary Johnson) is simply the last line of one sheet
recopied at the head of the next.

**A transcription failure worth knowing about.** The viewer opens mid-page,
and on five of the first eleven pages I began transcribing from the first
line I could see rather than from the true top of the page, losing **sixteen
entries**. They were recovered on 25 Oct 2026 and images 178-188 were then
re-checked top *and* bottom. The method since: pan to the page header first,
confirm the true top, then read down to the bottom edge.

**Confirmed matches to `people_all.csv` so far:**

| person | what the register adds |
|---|---|
| **HM0132 James Henry Muse** (Harmony) | "Died 9th of February 1897 in his 77 year" - b. 1820-02-23 makes him 76, confirming identity; 2-day conflict against the recorded 11 Feb |
| **LV0972 Mary V. Wiley** | exact death date; gains **cause (Dysentery)** and parents John R. & Elizth. S. Wiley |
| **HM0086 Laura B. Hoskinson** (Harmony) | exact date; gains cause, parents Thos. W. & Virginia, and a **birth date** (~21 June 1853) where the dataset had only a year |
| **HM0093 Ann A. Hoskinson** (Harmony) | **probable, not certain** - two conflicts (d. 20 vs 29 July; age implies b. Nov 1851 vs recorded 1849) |

And from the 1820s notices, a Hamilton death with its burial ground named,
decades before Lakeview existed:

    Died at Hamilton Mill, Loudoun Co., Va., on Saturday the 28th, Mrs.
    Matilda Low, of fever, on succeeding Wednesday, Wm. Low, late consort
    of deceased. Interred in Methodist Burying Ground.   (page 102, Aug 1821)

A "Methodist Burying Ground" at Hamilton in 1821 is worth chasing against
Harmony UMC's own ground.

**Entries at Hamilton and its neighbours** (the register names the place
only from page 21 on, so these are the ones it happens to locate):

    Samuel W. Green, male, July 4, nr. Hamilton, pneumonia, at 6 mo.,
      b. Loudoun Co., parents: T.W. & Elizabeth Green.            (1853)
    Commodore B. Beach, male, Novr. 26, at 21 ds. b. nr. Harmony.
      Parents: Presley and Frances A. Beach.                      (1854)
    Mahlon Craven Taylor, male, Mar. 25, Croup, at 2 mo. b. nr. Goose
      Creek Meeting House. Parents: Richd. and Lydia F. Taylor.   (1854)
    Maria Beans, female, Jany. 7, of Typhoid Fever, at 49 yrs. b. nr.
      Purcellville. Parents: David and Anna Goodwin. Reported by
      Absolom Beans, husband.                                     (1854)
    Sarah L. Beans, female, Septr. 9, of Typhoid Fever, at 50 yrs. on old
      Hough farm. b. Beaverdam.                                   (1854)
    Sarah Ann House, female, Octr. 23, of Spinal Affection, at 32 yrs.
      Parents: Eli and Hannah Pierpoint. Reported by Asa Janney.  (1854)

**Epidemic structure.** The register shows two distinct dysentery summers,
1853 and 1854, and a typhoid run through 1855. Family clusters recorded so
far:

- **Dulin** (Goose Creek) - four children in under two months, 1853
- **Sagle** - three in nine days, August 1854: Charles E. (6 mo.) 12 Aug,
  Michael (53, the father) 15 Aug, Catharine (67, his sister) 20 Aug
- **Thomas** - three in eighteen days, July 1854: the mother Mary E. (31) at
  Washington City, an infant, and Virginia A. (2)
- **Shumate** - two daughters eight days apart, 1853
- **Loy** - Margaret A. (15) 1 May and her brother Samuel W. (7) 2 May, measles
- **Moffett** - Virginia (3) of dysentery in July, Sarah (12) of "contraction
  of brain" in January
- **Kidwell** - George Rust (10) 20 July, William H.H. (13) 20 Aug, dysentery
- **Chick** - Sarah C. (28 ds.) 23 Sept, Harriet (4) 1 Oct
- **Hutchison** - Richard H. (11) 6 Sept, Charles J. (16) 19 Sept, both
  dysentery, both reported by their **aunt** rather than a parent
- **Morrison** - Sophia E. (11) 14 Sept, George H.C. (1) 16 Sept, dysentery
- **Stoutsenberger** - Jacob (56) 25 Aug of jaundice, his wife Mary (54)
  25 Sept of dysentery; their daughter Margaret reported both
- **Stocks** - David W. (3) of croup, Alpheus E. (6 mo.) of dysentery
- **Slack** - twin infants, a boy and a girl, both d. 30 November 1854
- **Paxson** - twin boys Burr and Rodney, d. 6 and 7 August 1855
- **Thompson** - Rebecca (47, a wife) and Nimrod (55, her husband's brother)
  both d. 13 June 1855, both "Apoplexy"; Edward Thompson reported both

**Causes recorded** include, besides the epidemic diseases: killed by horse,
burned to death, drowned (twice - one of them a **ferryman**), found dead,
"effect of a ball" (a soldier), choaked, strangulation, suicide, child bed
(three times), "of drinking", "disapation", cancer of womb, putrid sore
throat, abscess in side, and a great many "old age".

**Occupations recorded** so far: farmer, carpenter, shoemaker, cooper,
tailor, butcher, miller, saddler, wheelwright (x3), chairmaker, bricklayer,
stonemason, painter, tanner, plasterer, ditcher, ferryman, tollgatherer,
clerk, merchant, miner, colporteur, railroad engineer.

**Scale.** 111 pages at three to four screenshots each. The hit rate per page
is low, because this is a county-wide record and the project covers three
cemeteries. The value is cumulative: it is the only source here that gives
**cause of death, parents and informants** at all, and the only one
independent of the Jewells' stone readings.

**TRANSCRIPTION COMPLETE.** All 104 pages (images 178-281) are transcribed
and verified top-and-bottom. Image 282 is the DAR title card for the volume
and image 283 reads "END"; image 284 begins a different film item. There is
no page 105. Nothing remains to read on this film for this volume.

**1,817 entries.** No page is missing from the run (pages 1-104 all present),
no row has a blank name, no row has a blank entry_date.

| field | rows carrying it |
|---|---|
| cause of death | 1,209 |
| parents | 1,238 |
| informant | 660 |
| burial place | 22 |

By record_type: register 1,403 | deathlist 338 | newspaper 76.

Years covered, with the count in each: 1818 (1), 1819 (3), 1820 (24), 1821
(30), 1853 (196), 1854 (209), 1855 (162), 1856 (132), 1857 (141), 1858 (146),
1859 (116), **no 1860-1863**, 1864 (78), 1865 (125), 1866 (98), 1867 (2),
1868 (14), 1869 (8), 1870 (1), 1871 (3), 1872 (7), 1873 (9), 1874 (9), 1875
(4), 1876 (9), 1877 (10), 1878 (10), 1879 (12), 1880 (14), 1881 (17), 1882
(13), 1883 (16), 1884 (14), 1885 (4), 1886 (11), **no 1887**, 1888 (13), 1889
(17), 1890 (1), 1891 (1), 1892 (15), 1893 (9), 1894 (17), 1895 (27), 1896
(16), 1897 (20), 1898 (14), 1899 (11), 1900 (8).

---

### CROSS-MATCH AGAINST THE THREE CEMETERIES

Run once the transcription was complete, over all 1,817 death records against
all 2,732 cemetery records. Method: normalised surname (with a fuzzy fallback
for spelling variants), death year within one, then scored on exact death
date, shared given names, and - where the record names them - parents.
Candidates are in `data/crossmatch_candidates.csv` with their scores and the
basis for each. Confirmed matches are written back into
`loudoun_deaths.csv` (matched_person_id, match_basis) and the new facts into
`verified_findings.csv`.

**21 people matched** (5 found earlier, 16 in the final pass). Of those, eight
are exact death-date matches and four reconstruct the stone's BIRTH date from
the register's age-to-the-day - including Ruth W. Bradfield Taylor, whose
"44 yrs. 10 mo. 26 ds." gives 12 January 1813, exactly the date carved on her
stone.

**What the match gained that the stones do not carry:**

- **Cause of death for 14 people** who had none: pneumonia, diphtheria (x2),
  scarlet fever (x2), consumption (x2), dysentery, measles, typhoid, quinsy,
  "constip. bowels".
- **Parents' names for 9 people** whose stones name none.
- **Two relationships recovered outright**: Betsey Dodd Divine's husband was
  Jacob Divine (Paxson list); Lillie R. Hope's father was John Hope and she
  died of consumption (Paxson list, buried two days after her stone's death
  date).
- **A family reconstructed at C-52 Lakeview.** Lewis Taylor (d.1900, "in his
  88 year") married twice: Ruth W. Bradfield (d. Dec 1857 of pneumonia, her
  mother Mary Bradfield named as informant) and then Elizabeth Roberts
  (d.1914). The register's "Lewis & Elizth. Taylor" as parents of Willie N.
  Taylor (d. Sept 1866 of diphtheria, aged 4) fixes the second marriage and
  explains the two children of "L & E TAYLOR" on the stones.
- **A second Hope daughter.** HM0085 Mary Elizabeth Hope (d.1855 aged 16,
  consumption, "parents John A. and Lydia Hope") and HM0084 Lillie R. Hope
  (d.1883 aged 26, consumption, "John Hope's Daughter") are sisters - two
  daughters of John Hope dead of consumption 28 years apart.
- **A sibling pair at C-54.** Winfield Scott Peacock (d. 14 Feb) and Nancy C.
  Peacock (d. 25 Jan), children of Noble B. & Lucinda Peacock, three weeks
  apart in the same scarlet fever outbreak.

**A dating rule the match exposed.** Both Peacock deaths are filed in the
register's **1858** block but fall in **January and February 1859** - their
stones confirm it. The commissioner's annual return runs past the year end,
so a register year-block is the year of the RETURN, not a guarantee about the
year of death. Treat entries near the foot of a year-block accordingly.

**Date conflicts found: 6**, all logged in `verified_findings.csv` - one day
(Samuel Torrison, Mary E. Hope, Betsey Dodd Divine), six days (Francis E.
Hoskinson), ten days (Frances Ann Laycock), twenty days (Virginia E. Berry),
and the previously known 35-day gap on Annie Arabella Everhart. In every case
the identity is secure on other grounds; it is the date that is in doubt, and
the register is generally the contemporaneous source.

**Candidate missing burials: 8**, in `data/candidate_missing_burials.csv`,
graded. Only two are strong:

- **An infant of Levi and Martha E. James**, dead at six weeks in December
  1857. Both parents lie at C-26 Lakeview; the child falls exactly in the gap
  after their daughter Sarah Frances (b.1855). No stone. The only tight
  parent-couple match in the whole dataset.
- **Elijah Holmes**, died 1 May 1868 "at his residence near Hamilton" in his
  72nd year - the only person in all four sources described as living AT
  Hamilton, and in none of the three cemeteries.

The rest are weak, and the weakness is usually the same: **the register is
county-wide and names no place**, so a surname that also occurs in Hamilton is
not evidence of a Hamilton burial. The three Carter children dead of
diphtheria in six days of May 1865 are in the file for the record, NOT as a
claim that they lie at Lakeview.

**What the 1860-1863 gap costs, in one example.** Ella Gertrude Taylor
(LV0902), daughter of Lewis and Elizabeth, died 14 April 1861 aged about one.
Her brother and her father and both her father's wives all gained a cause of
death or a confirmed date from this register. She cannot: the register has no
1861. Everything the war years would have told us about the people under these
stones is simply not there.

---

### WHO IS NOT IN THIS DATASET

**The state register section (pages 1-86, 1853-1866, 1,403 entries) records no
Black Loudouners at all** - not one entry marked "col", not one owner's name,
not one free-Black notation. In 1860 roughly a quarter of Loudoun's population
was enslaved or free Black, so this is an absence in the SOURCE, not in the
county.

Virginia's 1853 vital-registration law did provide for recording the deaths of
enslaved people, with the owner's name standing in place of parents. Entries of
that kind do survive for some Virginia counties in the Bureau of Vital
Statistics death records. They are not in this typescript. Either the DAR
typist copied only the white pages, or the volume she was given was only the
white pages. Whichever it was, **treat the 1853-66 register rows here as a
white record.**

Every racial marking in the whole 1,817-row dataset - 13 of them - sits in the
two PRIVATE lists and post-dates emancipation: Wm. Sims (1872), Steve Bush
(1876), Mrs. Wils Wems (1879), Moses Wilson (1880), Jennie Parms (1881), Rose
Wilson (1882), Moses Gaskins and Eule Sims (1883), Nancy Roberson (1884),
Georg Johnson (1885), Fill Webster (1889), Henry Thoston (1892). Those are
marked "(colored)" / "(Col)" in the sources and the marking is kept as written.

**CORRECTION - PLEASANT VALLEY IS THE BLACK CEMETERY, AND IT IS ALREADY IN
THIS DATASET.** An earlier note in this file said a timeline built from these
three cemeteries would show a Hamilton with no Black residents. That is wrong
as written, and the error mattered. Pleasant Valley Cemetery on Harmony Church
Road, established 1922, is one of Loudoun County's largest African American
cemeteries (Loudoun Museum / loudounhistory.org). Its 368 records are in
people_all.csv and have been all along. The data agrees: only 5 of its burials
predate 1922 (one of those, Beverly Ramey, is a known corrupted record with a
birth date after its death date), the run really begins in 1924, and the
surname profile - Lucas, Mallory, Chinn, Coates, Caesar, Flint, Rector, Ramey,
Trammell, Gore, Owens - is that of Loudoun's African American families.

The accurate statement is narrower and still worth making: the dataset is
thin on Black Hamiltonians **before 1922**, because Pleasant Valley had not
opened and the register section is white-only.

**The two grounds are one community's, in sequence.** Pleasant Valley is the
SECOND location of this burial ground. The FIRST was at Harmony UMC - the
separate ground beside the white congregants' graves. So Harmony and Pleasant
Valley are not two unrelated cemeteries that happen to both be in Hamilton;
they are where the same community buried its dead before and after 1922, and
this project holds both ends of that.

Hamilton's Black community sat on "the Hill" north of town, with Brownsville
(Swampoodle) just east and Irene and Ivandale just south. Mt. Zion Methodist
(1881, still active) was its church; Second Mount Olive Baptist (1892) served
Brownsville.

**Harmony UMC.** Local tradition in Hamilton holds that the stones lost or
moved at Harmony were those of enslaved people. A local history account
(historicwanderings.blogspot.com, a blog rather than scholarship) states that
Harmony's enslaved congregants had a separate burial ground beside the white
graves; that part of it was bulldozed for a parking lot in the 1990s; that
witnesses were never told whether remains had been removed; and that the
church later raised a memorial to people who "may or may not still be buried
there", with the surviving stones consolidated into one communal marker. The
Harmony data here is consistent with that: all 263 records are named
individuals, earliest 1836, with no entry for the communal marker, no
"unknown" and no memorial row - the Jewells read legible stones, and there
were none left to read.

**Consequence for the timeline.** A scrolling timeline built only from these
three cemeteries plus this transcript will depict a nineteenth-century
Hamilton with no Black residents. That is an artefact of the sources. The
recovery route, if it is wanted, is the ORIGINAL Loudoun County death
registers at the Library of Virginia - a different film from this DAR
typescript - not this volume.

---

### THE VOLUME IS FOUR SOURCES STACKED, NOT ONE

Each section has its own heading page, its own compiler, its own date range
and its own layout. They are NOT in chronological order relative to one
another.

| src_page | src_image | source | years | record_type |
|---|---|---|---|---|
| 1-86 | 178-263 | Loudoun County death register (the state returns) | 1853-1866, **no 1860-1863** | register |
| 87-91 | 264-268 | John James Dillon's private list, Purcellville | 1892-1900 | deathlist |
| 92-99 | 269-276 | Burr W. Paxson's list, via John A. Divine of Waterford | 1868-1892 | deathlist |
| 100-   | 277-    | Deaths abstracted from various newspapers | 1818- | newspaper |

**Section 3 - the Paxson list (pages 92-99).** Heading on page 92, verbatim:

> "Record of Deaths kept by Burr W. Paxson dated July 25th 1884. This record
> was loaned to me by John A. Divine of Waterford and I believe the original
> list is in his possession."
>
> "List of Deaths from 1869"

A private family-and-neighbourhood record from the WATERFORD side of the
county, laid out as a date column plus a name and (often) a cause and age.
Reading notes that matter for using it:

- **Many dates are of BURIAL, not death** - the entry says "buried" or "was
  buried". Every such row says so in its verbatim. Do not treat these as
  death dates without checking.
- The compiler names his own kin by relationship, not by given name: "Uncle
  Amasa Hough", "Grandma Paxson", "Grandfather Paxson", "Aunt Louisa Steer",
  "Cousin Jane Paxson", "Aunt Henryetta Paxson", "Uncle Griffith Paxson".
  Those are filed under the surname with the relationship kept in verbatim.
- Women are often recorded only under a husband's name ("Mrs. John Virts",
  "Mrs. Jacob Divine"); children often only as "X's daughter" or "X's baby".
  Those rows carry a descriptive name field and say in verbatim that the
  given name was not recorded.
- African American decedents are marked "(colored)" or "(Colored)". Kept as
  written.
- Despite the 1884 date in its heading, the list runs on to **February 1892**
  - entries were clearly added after the copy was first made.
- **HAMILTON appears here by name**, which it never does in the state
  register: "May 30,1879 Dr.Gormon buried Hamilton" and "Feb.10,1880 Jack
  Janny Hamilton Consumption". Other place names used: Waterford, Leesburg,
  Catoctin, Salem Church, Round Hill, Clarks Gap, Tankerville, Maryland.
- Causes recorded include consumption (by far the commonest), typhoid,
  diphtheria, pneumonia, heart disease, Brights disease, gangrene, cancer,
  childbirth ("Confined"), and a run of violent and accidental deaths:
  killed in a fight, killed by the Cars (a train), killed by a colt, stabbed,
  dropped from his horse, killed by falling "shelvings", drowned, two men who
  cut their own throats, one woman who hanged herself, one death recorded as
  "foul play" and one as "found drunk".
- The compiler also recorded **President Garfield's death** (19 Sept 1881,
  at Long Branch) in among his neighbours.
- The last months of the list, Jan-Feb 1892, are thick with **"LaGrippe"** -
  the influenza pandemic reaching Loudoun.

**Section 4 - newspaper abstracts (pages 100 onward).** Heading on page 100:

> "Deaths abstracted from various newspapers. All deaths related to Loudoun
> Co. Va."

Earliest source in the book by seventy-five years: it opens with the *Genius
of Liberty* (Leesburg), 12 May 1818. These are prose obituary notices, not
table rows, so the whole notice is kept in verbatim. Dates in the notices are
relative to the issue date ("Saturday last", "the 11th inst.") and have been
resolved only where the notice itself makes them certain.

**SECTION BOUNDARY (1).** The state death register runs pages 1-86
(images 178-263), 1853-1866 with no 1860-1863. Page 87 (image 264) opens a
SECOND, UNRELATED SOURCE, transcribed with this heading:

> "The following are death records kept by John James Dillon, Loudoun County,
> Virginia, 1892-1900. His grandson kindly loaned me the original so that I
> might make a copy of same. Mr. John A. Dillon, Purcellville, Va., has the
> original list in his possession."

These rows carry record_type = deathlist. It is a PRIVATE list, not a state
return: entries give time of death to the minute ("20 minutes past 3 oclock
in the afternoon"), mark African American decedents "(Col)", and name the
Goose Creek Quaker families - Nichols, Osburn, Tavenner, Chamblin, Jewett.
It fills the gap between the register's end in 1866 and the modern records.

**RESOLVED - the third alphabetical run (pages 85-86) is 1866.** After the
"End of Page 44" rule on page 85 the alphabet restarts a third time and runs
through page 86 to the "End of Page 45" rule. There is no year heading for it,
but it is 1866 on three grounds: (a) the STATE REGISTER ENDS at page 86 - page
87 begins a different source entirely (the Dillon list, 1892-1900), so no
1867 block exists in this typescript; (b) a faint pencil "1866" sits in the
right margin of pages 84, 85 AND 86; (c) the multiple alphabetical runs are
most likely the separate returns of Loudoun's magisterial districts, each
filed alphabetically by its own commissioner of revenue. The 16 rows are
dated 1866 BY INFERENCE and say so in their verbatim.

Page 73 was first read as an early sample before the top-and-bottom method
was adopted; it has now been re-read in full. Three entries were recovered at
the foot of the page (Thos. E. Tippett, Hugh W. Pool, Bery Woods) and the
cut-off Saml. H. Tippett line completed. All 17 are dated 1864.

---

### DIGITAL-ONLY RESEARCH ROUTES — TESTED 26 OCT 2026

Three routes tested under the constraint "digital only, no site visits or
in-person organisation research."

#### 1. Historic aerial photography of Harmony UMC — CONFIRMED, strong

Harmony United Methodist Church, 380 E Colonial Hwy, Hamilton VA
(**39.1338485, -77.6552956**).

Aerial coverage available at this location (historicaerials.com / NETR):

**1957, 1965, 1969, 1974, 1980, 1982, 1988, 1989, 1990**, 1994, 2002, 2003,
2006, 2008, 2009, 2011, 2012, 2013, 2014, 2016, 2018, 2021, 2023.

Nine frames predate 1990. The 1990 -> 1994 -> 2002 sequence brackets the
parking-lot construction, and 1957-1990 should show the burial ground as it
was. This is the single most promising way to establish the ORIGINAL EXTENT of
the ground without setting foot on it.

Caveat: historicaerials.com imagery is watermarked and copyrighted (NETR,
free to view only). For clean copies of the same source frames, USGS
EarthExplorer holds the originals; it needs a free USGS account.

#### 2. LIDAR — the data exists and is excellent, but a drone is unnecessary

USGS flew Loudoun 9-28 December 2022 (effectively leaf-off, no snow):
**~14 points/m2 aggregate, 1-foot DEM, non-vegetated vertical accuracy 4.35 cm
RMSE.** Free from the Virginia LiDAR Download Application. That resolves
grave-shaft depressions of 5-15 cm. Commissioning a drone survey would be
buying what is already downloadable.

What LIDAR can and cannot do here:
- It measures the SURFACE. It finds graves only where the ground still
  remembers them - the settling of a collapsed shaft, usually in rows.
- Over the parking lot it returns a flat plane. Grading destroyed the
  micro-topography and asphalt sealed it. **LIDAR cannot establish whether
  remains are still under the lot.**
- It CAN map the burial ground's extent in the unpaved margins, which is the
  tractable question.
- The right instrument for the asphalt is ground-penetrating radar, which
  reads through pavement. That is fieldwork.

NOT DONE: this session's container could not fetch the DEM. The egress policy
returned 403 at the proxy for apps.nationalmap.gov, rockyweb.usgs.gov,
prd-tnm.s3.amazonaws.com and earthexplorer.usgs.gov, so no tile was downloaded
and no hillshade was rendered. Needs a session with those hosts allowed, or a
local download.

#### 3. Newspaper obituaries via Virginia Chronicle — CONFIRMED, the best route

virginiachronicle.com (Library of Virginia). Free, full-text searchable,
157,440 issues / 1,142,249 pages. Loudoun titles held:

| title | place | years |
|---|---|---|
| **Weekly Enterprise** | **HAMILTON, VA** | **1890-1923** |
| Loudoun Mirror | Leesburg | 1908-1921 |
| Loudoun Times | Leesburg | 1918-1924 |
| Loudoun News | Leesburg | 1936-1953 |
| Blue Ridge Herald | Purcellville | 1930-1957 |
| Washingtonian-Mirror | Leesburg | 1903-1906 |
| Mirror | (Leesburg) | 1875-1902 |
| **Genius of Liberty** | Leesburg | **1817-1839** |
| **Leesburg Genius of Liberty** | Leesburg | **1839-1843** |

**Mechanism proven.** Searches return obituary snippets naming the place of
burial verbatim - "Interment was in the ... Cemetery", "burial was in ...".
A test query of "Lakeview Cemetery" + Hamilton returned facet counts of
**286 hits in the Blue Ridge Herald, 21 in the Loudoun Mirror, 6 in the
Loudoun Times and 2 in the Weekly Enterprise.**

Anyone named in such a notice as buried at Lakeview / Harmony / Pleasant
Valley but ABSENT from the 2,732 stone records is a candidate unmarked grave,
with a date and usually a family attached.

**TRAP - scope every query.** Cemetery names are generic. A bare search for
"Pleasant Valley Cemetery" returned 57 hits and NOT ONE was in Loudoun:
Annandale, Fairfax, Weyers Cave, Floyd County, Ashland, Olean NY, Carroll
County MD, Ohio, Kansas. Always constrain by county (Loudoun) or by title.

**BONUS - the Genius of Liberty is here in full.** That is the very paper the
DAR typist abstracted by hand for pages 100-104 of the death volume. Her
abstracts were selective; the full run 1817-1843 is now searchable, so her
selection can be gone past and checked.


---

### FIELD EXTRACTION AND DATA REPAIR — 26 OCT 2026

Work done entirely on the data already in hand, no new sources.

#### Three new columns on `loudoun_deaths.csv` (now 21 columns)

The DAR typist flattened the register's columns into prose, so several fields
were sitting inside `verbatim` with no column of their own. Parsed out:

| column | rows filled | notes |
|---|---|---|
| `occupation` | 237 | 35 distinct trades |
| `spouse` | 99 | from "wife:X" / "husband:X" / "wife of X" / "relict of X" |
| `marital_status` | 58 | single, bachelor, spinster, unmarried, widow, widower, married |

Occupations, in full: farmer 114, miller 14, shoemaker 12, cooper 11, soldier
9, blacksmith 9, carpenter 8, physician 8, laborer 7, merchant 5, tailor 4,
butcher 4, teacher 4, ferryman 2, saddler 2, keeper 2, baker 2, clerk 2,
engineer 2, wheelwright 2, and one each of plasterer, ditcher, tollgatherer,
miner, colporteur, bricklayer, chairmaker, painter, stonemason, tanner,
cabinetmaker, steward, bank cashier.

Extraction is conservative: a term is only recorded where the source states
it plainly. Titles (Capt., Col., Dr.) are stripped from spouse names and
sentence remnants are cut, but the spelling is otherwise left as the typist
set it, including her missing spaces ("Geo.W.Duke").

#### Two impossible rows corrected, one quarantined

- **LV0310 Albert C. Davis** — Balch had d. 1998-06-09 against b. 1822, a
  lifespan of 176 years. Find a Grave gives **1898**-06-09, and the DAR's 1948
  reading of the stone gives "d. June 9, 1898 at 75 yrs. 9 mo. 16 ds." - an
  interval that runs exactly from 24 Aug 1822 to 9 June 1898. Three-way
  agreement against a Balch typo. **CORRECTED to 1898-06-09.**
- **LV0526 Nona Carolyn Hirst** — Balch had d. 1891-08-25 against b.
  1930-07-30. Find a Grave gives **1930**-08-25, making her an infant of 26
  days, which is coherent. **CORRECTED to 1930-08-25.**
- **PV0193 Beverly Ramey** — b. 1896-07-11, d. 1856-05-31. No second source on
  file to adjudicate, so nothing has been guessed. **QUARANTINE from any
  timeline.** Note that Pleasant Valley was established in 1922, which makes
  an 1856 death there doubtful on its own.

#### Timeline readiness, measured

**The spine is sound.** 2,573 of 2,732 people (94%) carry both a birth and a
death year, which is all that "who was alive on this date" requires. Date
precision: 1,860 full birth dates and 2,026 full death dates; 751 birth-year-
only and 575 death-year-only rows will need a display convention for
fuzziness. 112 have no birth, 109 no death.

Living population by year, from the stones alone:

| year | alive | year | alive |
|---|---|---|---|
| 1800 | 11 | 1920 | 1,404 |
| 1840 | 217 | 1940 | 1,375 |
| 1860 | 523 | 1960 | 1,139 |
| 1880 | 912 | 1980 | 755 |
| 1900 | 1,268 | 2000 | 413 |

Peak 1,456 in **1927**.

**The flesh is thin, and this is the real constraint on the design.**

- **Occupation** exists for 237 register entries but only 21 of those are
  matched to a stone, so per-person occupation on the timeline will be almost
  empty. The 35 trades are better used as a county-wide context layer than as
  a per-person field.
- **Spouse** is on 99 register rows plus 120 `wife_of` rows in
  relationships.csv - under 10% of people either way.
- **Relationships**: `relationships.csv` holds 237 rows (120 wife_of, 56
  son_of, 51 daughter_of, 5 child_of, and a few others) but **only 81 are
  resolved to an actual person_id**; the rest point at a NAME, not a node.
  And `relation_raw` is present on 405 people, so roughly 168 relationship
  strings have not been parsed at all.

**Highest-value next step on existing data:** resolve those relationship names
to person_ids. Plot adjacency makes it tractable - a wife is nearly always in
the same plot as her husband - and it would turn ~156 dangling strings into
real edges, which is what the timeline needs to show a spouse at all.


---

### THE COUNTY-WIDE CONTEXT LAYER, AND HOW TO SHOW WHO IS MISSING

New files: `data/context_demography.csv` (county population by race, 1790-1860,
measured) and `data/context_documented_vs_county.csv` (this project's
documented burials per decade against that composition).

#### The county these people lived in

Loudoun County population, US decennial census as reported by the Loudoun
Museum's *Era of Enslavement: Loudoun County Virginia 1757-1861*:

| year | total | white | free Black | enslaved | Black share |
|---|---|---|---|---|---|
| 1790 | 18,962 | 14,749 | 183 | 4,030 | 22% |
| 1810 | 21,338 | 15,577 | 604 | 5,157 | 27% |
| 1830 | 21,939 | 15,497 | 1,079 | 5,363 | 29% |
| 1850 | 22,079 | 15,066 | 1,373 | 5,641 | 32% |
| 1860 | 21,774 | 15,021 | 1,251 | 5,501 | **31%** |

Between a fifth and a third of Loudoun was Black across the whole antebellum
period, mean 29%, rising to 31% by 1860.

#### What this project documents, per decade

| decade | Lakeview + Harmony | Pleasant Valley | PV share |
|---|---|---|---|
| 1850s | 32 | 1 | 3% |
| 1870s | 48 | 0 | 0% |
| 1890s | 83 | 0 | 0% |
| 1910s | 188 | 3 | 2% |
| 1920s | 177 | 12 | 6% |
| 1950s | 171 | 30 | 15% |
| 1970s | 171 | 39 | 19% |
| **1990s** | 125 | 55 | **31%** |
| 2010s | 128 | 31 | 19% |

**Before 1920 this project documents 590 burials. Four are at Pleasant Valley,
and one of those four is the corrupt Beverly Ramey row.**

#### The finding, which is a ratio and not an estimate

The county was about 31% Black in 1860. Documented Black burials in Hamilton
before 1920: effectively none. By the 1990s, with Pleasant Valley open and its
stones read, documented Black burials reach **31% of the decade's total** -
almost exactly the county's antebellum share.

**The zero before 1922 is a documentation artefact, not demography.** When the
community had a cemetery whose stones survived to be read, its share of the
record looks like the county. Before it had one, the record reads as empty.

Three specific, documentable mechanisms produced that emptiness, and naming
them is more honest than any single missing-population number:

1. Both stone sources (Balch database, Find a Grave) record **legible stones**.
   An unmarked grave enters only by accident.
2. The state death register section, pages 1-86, 1853-66, contains **not one**
   Black decedent (see WHO IS NOT IN THIS DATASET).
3. Harmony's separate ground for its enslaved congregants was **partly paved
   for a parking lot in the 1990s**, its surviving stones consolidated into one
   communal marker, and nobody was told whether the remains were moved.

#### Rules for rendering this layer

- **Different visual grammar for different epistemic status.** Documented
  people are discrete marks that open a record. County composition is a
  measured line. Absence is a hatched band with no interaction. Never the
  same mark type for two of these.
- **Never draw an estimated person.** No ghost dots, no placeholder names.
- **Label absence as absence.** A gap in a chart reads as "nobody lived here";
  a band labelled "no surviving record" reads correctly.
- **The census line is CONTEXT, not a denominator.** Hamilton is one village;
  the three cemeteries are not a sample of Loudoun, and county proportions do
  not transfer to them arithmetically. Use the line to say "this is the county
  these people lived in", never to compute a count of missing individuals.
- **The one defensible numeric estimate** is for the lost Harmony ground:
  Pleasant Valley holds 368 burials over about a century (~3.7/yr); the
  earlier ground was in use roughly 80 years; **order of magnitude 300**.
  Label it as a rate projection with its derivation shown, never as a count.


---

### EDUCATIONAL RECORDS — THE EDWIN WASHINGTON PROJECT (checked 26 Oct 2026)

edwinwashingtonproject.org — a digital archive of Loudoun County Public
Schools records from the segregation era, built from documents recovered from
a Leesburg schoolhouse plus private sources (Lovettsville Historical Society,
Prosperity Baptist Church). Omeka S, free, browsable by school, district and
instructor, with keyword and field search. Separate sections for Colored
Schools and White Schools. Rights throughout: Loudoun County Public Schools.

**This is the first source found that documents Hamilton's Black community
during the gap in our burial data.** 209 items mention Hamilton.

#### There was a Hamilton Colored School, and its records survive

Twelve items titled "Hamilton Colored":

| item | years | kind |
|---|---|---|
| 33393, 33391 | **1922-1924** | **Register for Hamilton Colored** |
| 32278-32296 (10 items) | **1938-1947** | annual files, one per school year |

Item 33393 (`1001696_EWP_Hmamilton1922to24.pdf`) is subject-indexed
*school, report, 1923, enrollment, attendance, grades, teacher,
qualifications, boys, girls*.

Also at or near Hamilton:
- **EWP 4-3 Contract for J. Walter Brown Colored (1904)** and **EWP 4-3-1
  Contract for Robert H. Tyler Colored (1904)** - named Black teachers at
  Hamilton in 1904, eighteen years before Pleasant Valley opened.
- **Brownsville petitions, 1922**, over competing requests to use the
  **Odd-Fellows Hall in Hamilton** - the same Odd Fellows lodge the Loudoun
  Museum lists among the Hill community's institutions.
- **EWP 11 Yr 1940**, described as "the building which replaced the Black
  school in Hamilton."
- EWP 6-6 Hamilton C Grades 1-7 (1930-1947).
- A parallel white series: EWP 13 Hamilton 1922-1947, EWP 6-6 Hamilton W
  Grades 1-7 (1917-1965), 1961 Hamilton Elementary Enrollment, and others.

#### What this class of record contains — verified on a comparable item

**EWP 2-5B Yr 1926 Enrollment of Lincoln Elementary** (item 66396) is
catalogued as listing "the **names, ages, and parent or guardian
information**" of first-, second- and third-year pupils, organised by grade,
with the teacher marking who was present. It draws pupils from Bluemont,
Purcellville, Lincoln, Leesburg, **Hamilton**, Winchester, North Fork,
Hillsboro, Upperville, Round Hill, Harpers Ferry and Philomont. It is
unrestricted, with a PDF and a large image preview available.

So the record class carries exactly the fields this project needs: a living
child, named, with an age and a parent, in a given year.

#### The access caveat, stated plainly

**Item 33393, the Hamilton Colored register, is tagged "Restricted."** The
Lincoln Elementary white enrolment report is not. Neither has a human
transcription. The project's own About page says some items are available
only by request and the site serves as a finding aid for digitised and
non-digitised material alike. Why this particular item is restricted is not
stated on the page, and nothing here should be read as imputing a reason -
it may be rights, archival processing, a privacy decision, or an inconsistent
tag. **Treat it as: the record is known to exist and is described, but ask
the project before assuming it can be read online.** Do not work around the
restriction.

#### Why it matters to this project

School records approach the missing population from the opposite end to
burial records: they document the LIVING, by name and age, year by year, with
a parent. For the pre-1922 and segregation-era Black community of Hamilton -
the Hill, Brownsville, Irene, Ivandale - this is the only digital source found
so far that names individuals systematically. The 1904 teacher contracts in
particular reach back into the period where the cemetery data is silent.


---

## OPEN LEADS AND STANDING CONSTRAINTS

Consolidated 26 Oct 2026 so nothing has to be rediscovered, and so a later
session does not re-propose something already declined.

### Standing constraints (stated by Curtis, 26 Oct 2026)

- **Digital only.** No site visits, no in-person research at libraries,
  courthouses or historical societies.
- **No sign-ups.** No account creation of any kind at this time. Anything
  gated behind a registration or a request form is logged, not pursued.
  **Lifted for FamilySearch only, 30 Oct 2026** (Curtis, after town readers
  pointed to it): Curtis creates the free account and signs in himself. The
  pacing rule below still holds. Every other sign-up stays declined.
- Find a Grave forbids bulk extraction - do not scrape it.
- FamilySearch: human-paced single lookups only, never automated or bulk.
- Never enter credentials anywhere; Curtis signs in himself if it ever
  becomes necessary.

### Leads that are blocked by those constraints — LOGGED, NOT PURSUED

| lead | what it would give | why it is blocked |
|---|---|---|
| **EWP item 33393**, Register for Hamilton Colored School 1922-24, plus the 1938-47 annual files | Named Black children of Hamilton with ages and parents, year by year - the only systematic naming source found for the community in the gap | Tagged **"Restricted"** in the archive. Would need a request to the Edwin Washington Project. **DECLINED 26 Oct: "I'm not signing up for anything at this time, but keep it logged."** |
| USGS EarthExplorer | Clean, unwatermarked copies of the 1957-1990 aerials of Harmony UMC | Needs a free USGS account |
| Lakeview Cemetery Association interment ledger and plot map | Probably the single richest source of unmarked burials - an active cemetery records burials whether or not a stone follows | Needs contacting the association |
| Original Loudoun death registers at the Library of Virginia | The 1853-66 pages for enslaved and free Black decedents, absent from the DAR typescript | **Unblocked 30 Oct 2026** on FamilySearch (catalog 780106 is titled 1853-1906, so it should hold the original 1853-66 pages, not only the typescript; unchecked). A town reader states the 1853 register does list African-American deaths: a reader's report, to be checked on the page. LVA visit still not needed |
| **Loudoun death registers 1866-1896** (Library of Virginia microfilm; also FamilySearch catalog 780106, *Death registers, 1853-1906 (Virginia)*). Logged 30 Oct 2026 after a town reader asked when Black deaths were recorded again | Thirty years of county death returns past the end of the DAR typescript, in which Black Loudouners should appear as free people - the biggest single step toward the pre-1922 gap. Virginia registered deaths 1853-1896; nothing statewide until death certificates began 14 Jun 1912 | Never brought into the project. LVA has no statewide index for 1853-96, so it is a page-by-page read of the film. **Unblocked 30 Oct 2026**: FamilySearch account allowed, human-paced reading only |
| EWP 1904 teacher contracts (J. Walter Brown, Robert H. Tyler) | Named Black teachers at Hamilton in 1904 | Not yet checked for access state |

### Leads that are OPEN and need no account — ready whenever wanted

| lead | status |
|---|---|
| **Virginia Chronicle obituary run** — scoped to Loudoun, cemetery by cemetery, to build an unmarked-grave candidate file | Route proven 26 Oct. Free, full-text, no login for searching. Curtis: "maybe later." |
| **Relationship resolution** — ~156 dangling relationship strings to person_ids using plot adjacency | Pure data work on files in hand. Proposed 26 Oct, not yet run. |
| 2022 USGS LIDAR hillshade of the Harmony margins | Data is free and needs no account; blocked only by this session's egress policy, which 403s every USGS host. Needs a session that can reach them. |

### One real decision, and a pile of work that was mislabelled as decisions

An earlier version of this section listed six things as "waiting on Curtis".
That was wrong and is corrected here: almost none of them need his judgment.
Reviewed 26 Oct 2026.

**The one genuine question — a policy, not a list.** Of the 26 DAR date
conflicts, roughly four are not conflicts (LV0310 Davis, already corrected;
LV0939 Warner, a matcher artefact pairing one man with himself; LV0658
Menard, where the DAR's "b. Sept. 8, 1939" is a plain typo for 1839), and
about five resolve on internal evidence alone (LV0017 Allder, whose "Aged 64
yrs" fits the DAR's 1863 and not the modern 1862; LV0971 White, whose DAR
1881 fits her parents' ages and whose modern 1861 does not; LV0678 Moatz,
whose modern 1857 looks like his father Daniel's year copied across). That
leaves about fifteen that are one source against another with nothing to
break the tie, and one (LV0619 Love) where both readings look wrong.

So the question is: **when two sources disagree and nothing corroborates
either, what should the dataset do?**

**Recommendation: do not pick.** Neither source dominates. The 1948 DAR
survey read the stones 78 years less weathered, which favours it; but it is
a typescript and has demonstrably introduced typing errors (1939 for 1839,
"Feb.17,1864" for 1886, the Heaton self-correction). Record both readings,
mark the person's date as disputed, and let the timeline treat a disputed
date as a precision range rather than a wrong number. Reserve outright
correction for cases with INTERNAL corroboration - an age statement that
reconstructs the other date. That is how LV0310 Davis, LV0901 Ruth Taylor
and the two Peacock children were settled, and it is the only standard that
has not produced a guess.

**AGREED AND IMPLEMENTED, 26 Oct 2026 — Curtis: "yeah, don't pick."**

The rule is now standing policy for this dataset:

> Where a source corroborates itself — an age statement that reconstructs a
> date — correct, and log why. Where two sources simply disagree with nothing
> to break the tie, **record the dispute and pick neither.**

Applied:
- `data/disputed_dates.csv` — all 26 DAR conflicts, each carrying BOTH
  readings with its source, classified: **22 DISPUTED (do not pick)**, 3
  not-a-conflict, 1 resolved by internal evidence.
- `people_all_enriched.csv` gains a **`date_disputed`** column; the 22 are
  flagged so a renderer knows not to trust a single value and should show a
  range.
- **LV0017 Thomas C Allder, b. 1862 -> 1863.** The stone reads "d. Apr. 25,
  1927  Aged 64 yrs", which reconstructs 1863. Internal corroboration, so it
  is corrected rather than disputed. Logged in `verified_findings.csv`.

**Everything else on the old list is work, not a decision:**

- Probable duplicates and corrupt records - cleanup. Example: LV0818 "Hector
  A Saunders" carries dates that belong to LV0817 Annie C. Saunders.
- The Saunders dates - a research thread with findings already logged in
  `verified_findings.csv`, not an approval gate.
- `candidate_missing_burials.csv` - a research file. Nothing to approve; two
  of the eight are strong and the rest are explicitly weak.
- Annie Arabella Everhart's 35-day date conflict - falls under the policy
  above.
- **PV0193 Beverly Ramey** - already quarantined. No source exists to fix it,
  so there is nothing to decide.


---

### THE 1948 DAR SURVEY FOLDED INTO THE MASTER — 26 OCT 2026

`dar_reconcile_v2.csv` had worked all 754 Lakeview survey entries through to a
verdict, but only **11** people in the master carried any of it. It is now
folded in.

`people_all_enriched.csv` gains **`dar_text`** (the surveyors' verbatim 1948
reading of the stone) and **`dar_verdict`**, and fills `dar_entry` and
`dar_source`. Hand-written notes already present were preserved, never
overwritten.

**746 of 2,101 Lakeview people now carry their 1948 reading.** That is the
stone as it could be read 78 years closer to its carving, including
relationship phrases the modern sources dropped - "dau. of J. H. & Ann V.
Gulick", "son of E. E. & S. S. Dunbar, stepson of R. N. McVeigh", "b.
Denmark".

#### CORRECTION — most of the "unmatched" entries were matcher failures

An earlier note in this file, and a statement made to Curtis on 26 Oct, said
that 18 people read off stones in 1948 were absent from the modern record.
**That was wrong.** Checking each against the Lakeview surnames showed that
**ten of the eighteen were failures of the matcher, not lost stones** - most
with exact date agreement:

| DAR entry | 1948 reading | is | why it failed to match |
|---|---|---|---|
| 89 | M. M. Poulsen (No dates) | LV0775 M M Poulsen | both undated, so no date key |
| 204 | Infant dau., L.C. & C.V. Rhodes, 1924-11-18 to 1925-12-03 | LV0809 Elizabeth E. Rhodes | DAR read no given name |
| 223 | Bertie, dau. Thos. & Bessie Seaton, 1919-02-18 to 1924-08-19 | LV0848 Bernice W. Seaton | Bertie / Bernice |
| 246 | Buddy Hardy, 1929-02-11 to 1932-01-03 | LV0500 Buddy Hardy | same name, same dates - plain miss |
| 383 | Grafton, son of J. A. & Teresa M., 1918-01-25 to 1920-01-23 | LV0267 James Grafton Cox | surname not in the DAR text |
| 400 | Laura L. Cox d. May __, 193-- | LV0269 Laura L. Cox d. 1930-05 | DAR could not read the year |
| 494 | Niels P. Larson b. Denmark 1852-1934 | LV0584 Niels P Larson | plain miss |
| 504 | Edward Mauran, son of E. E. & S. S. Dunbar | LV0353 Edward Mauran Dunbar | surname is the father's, given names are the DAR's |
| 526 | George Zachary Warner 1847-06-25 to 1923-05-20 | LV0939 George Zachary Warner | plain miss |
| 652 | Ora, wife of Orion Baldwin, 1864-04-13 to 1915-01-16 | LV0047 Orianna Chamblin Baldwin | Ora / Orianna |

All ten are folded in with `dar_verdict = MATCH (recovered 26 Oct 2026 from
UNMATCHED)` and a note giving the evidence.

**A duplicate surfaced in the process.** LV0469 "Infant Grafton" and LV0267
"James Grafton Cox" carry identical dates, 1918-01-25 to 1920-01-23, and DAR
entry 383 names one child only. LV0469 is flagged as a suspected duplicate of
LV0267.

#### What is genuinely unaccounted for: `data/lost_stones.csv`, 9 rows

- **5 unresolved** - read in 1948, nothing matching in the modern data:
  John Alexander Lynch Jr. (1882-1927), Ida Lee Costello (d. Mar 1931 at 63),
  Ellem McDaniel (d. 1 Apr 1934), **Frances Traphagen Field (1868-1935)** and
  Chas. D. Weadon Jr. (1877-1901). Field is the strongest: no person of that
  surname appears anywhere in the Lakeview data.
- **1 documented unmarked grave** - entry 401, "Unmarked grave in Cox lot".
  Not a name; the surveyors recorded the fact of an unmarked burial. It
  belongs in any unmarked-graves tally and was not among the three previously
  flagged.
- **1 probable misreading** - entry 312 "Susan Carter d. Oct. 19, 1867 at 8
  yrs" against LV0206 Edward F. Carter, 1857 to 19 Oct 1865, "S/O SUSAN
  CARTER", who would have been 8. Same day, same month, same age. One stone,
  two readings, 78 years apart.
- **1 not-a-burial** - entry 144 George Lee Hawley, b. 1 Nov 1936, death
  blank: he was alive and aged 11 when the survey was made.
- **1 conflict or second person** - entry 622 Maggie J. Graham b. 25 May 1871
  d. 27 Jul 1943 against LV0470 Maggie J Graham 1856-05-25 to 1916-01-28.
  Same name, same day and month of birth, fifteen years apart. Do not merge.


---

### RELATIONSHIPS PARSED AND RESOLVED — 26 OCT 2026

New file `data/relationships_v2.csv`. The old `relationships.csv` (237 rows,
81 resolved) is left untouched.

Folding in the DAR survey paid off immediately: `dar_text` turned out to carry
relationship phrasing the modern sources dropped, so the pool of statements to
work from more than tripled.

| | old | now |
|---|---|---|
| relationship statements parsed | 237 | **845** |
| resolved to an actual person_id | 81 | **397** |
| people carrying at least one resolved edge | 237 | **418** |

By relation: 499 child_of, 344 spouse_of, 2 parent_of. By source: 532 from
`relation_raw`, 313 from `dar_text`.

**Method.** Parse `W/O`, `H/O`, `S/O`, `D/O`, `C/O`, `MOTHER OF` from
`relation_raw`, and "wife of X", "son of X & Y", "dau. of X & Y", "relict of
X" from `dar_text`. A pair like "J. & M. J. Alder" is split and the shared
surname carried to both. Then resolve the named relative against people of the
same surname **in the same cemetery**, preferring **the same plot** - a wife is
nearly always buried with her husband. Confidence: `high` = given name +
surname + same plot; `medium` = given name + surname in the cemetery, or given
initial + same plot; `ambiguous` = several candidates; `unresolved` = none.

Two parser bugs were found and fixed mid-run, which is worth recording because
both would have been silent:
1. The name capture stopped at a full stop, so "Isaac P. Atkinson" truncated to
   "Isaac P" and the surname was lost - the resolver then looked for a family
   named "P". Fixed by stopping at the comma instead, which is what the DAR
   format actually uses.
2. Surnames are sometimes mistyped in `relation_raw` ("BENDEDUM" for Benedum).
   A fuzzy surname fallback was added, and every fuzzy match says so in its
   basis.

**The DAR's "his wife" problem, solved.** The surveyors sometimes wrote only
"Katie V., his wife" because the husband was the entry immediately above.
Those are resolved to the preceding survey entry number, and the basis records
that this is what was done.

#### The date check, and what it caught

Every resolved edge is tested against the two people's dates and the result
written to a **`date_check`** column. Of 378 checkable edges, **26 FAIL** -
a parent born after the child, spouses born 59 years apart, and so on. They
are flagged rather than deleted, because most are pointing at bad DATA rather
than a bad match:

- **George L. Moatz child_of Daniel Moatz, both born 1857.** Independent
  confirmation of a DAR conflict already on file - George's modern 1857 looks
  like his father's year copied across, against the DAR's 1884.
- **James W. Love child_of F. M. Love, parent b.1853, child b.1829.** Confirms
  the one DAR conflict where neither reading works.
- **Frances Ann Laycock child_of James Laycock, parent b.1842, child b.1853** -
  a parent aged eleven. Something is wrong in one of the three dates.

#### And it surfaced a new missing burial

**Noble B. Peacock has no stone anywhere in the three cemeteries.** The
register names "Noble B. & Lucinda Peacock" as the parents of two children
dead of scarlet fever in Jan and Feb 1859, both matched to stones at **C-54
Lakeview**. His wife Lucinda Beans Peacock (LV0759, 1828-1890) is in that plot
with four of their children. The only Noble in the data is LV0757 Noble Braden
Peacock, 1896-1904, a child of eight plainly named after him two generations
later - which is what the resolver wrongly matched Nancy to, and what the date
check caught. Added to `candidate_missing_burials.csv` as **strong**.

#### What is left unresolved, and why

| reason | count |
|---|---|
| ambiguous - several people share the name | 184 |
| surname present but given names disagree | 183 |
| the relative is not buried in that cemetery | 42 |
| only the subject matched | 39 |

These are largely irreducible from the data in hand: spouses buried elsewhere,
initials-only names with several candidates, and families where the same name
recurs across generations. 47% resolution with honest confidence levels is a
better outcome than a higher number reached by guessing.


---

### THE TIMELINE DATASET — ASSEMBLED 26 OCT 2026

Everything this project has gathered, joined into **one row per person** so a
timeline can be driven straight off it: `data/timeline_people.csv`, 2,732 rows,
30 columns. Plus `data/timeline_population.csv`, a ready-made
year-by-year living count, 1754-2026.

Built by script from the sources; it changes none of them and can be rebuilt
at any time.

**What each row carries:** identity and plot; birth and death with their
precision; age at death; resolved **spouse / parent / child** ids *and* names;
cause of death, occupation, birthplace and parents from the death register
where the person was matched; the **verbatim 1948 reading of the stone**; the
military and veteran flags; and two quality fields - `timeline_usable` and
`date_disputed` - so a renderer never has to guess what it is allowed to trust.

**Placeable on a scrolling timeline: 2,572 of 2,732 (94%).** The rest are
honest about why: 50 death-only, 47 birth-only, 63 unusable (no years at all,
or death before birth). Edges whose `date_check` FAILED are deliberately **not**
wired into the family links - they are kept in `relationships_v2.csv` to be
looked at, not silently believed.

| field | people carrying it |
|---|---|
| any family link | 399 |
| spouse | 248 |
| parent | 83 |
| child | 88 |
| the 1948 stone reading | 744 |
| cause of death | 17 |
| occupation | 1 |
| date flagged disputed | 22 |

Living population peaks at **1,455 in 1927**.

#### It works - the C-52 Taylor plot, read as the timeline would read it

```
Lewis Taylor              1813-1900  age 87
      spouse  : Elizabeth Roberts Taylor; Ruth W. Bradfield Taylor
      children: Ella Gertrude Taylor; Willie N. Taylor
      stone   : "Lewis Taylor d. Oct. 21, 1900 at 87 yrs. 8 mos."
Ruth W. Bradfield Taylor  1813-1857  age 44
      spouse  : Lewis Taylor          cause: Pneumonia
      stone   : "Ruth W., wife of Lewis Taylor, Jan. 12, 1813 d. Dec. 8, 1857
                 at 44 yr. 10 mo. 26 ds."
Elizabeth Roberts Taylor  1826-1914  age 88
      spouse  : Lewis Taylor
      children: Ella Gertrude Taylor; Willie N. Taylor
Ella Gertrude Taylor      1860-1861  age 1
      parents : Lewis Taylor; Elizabeth Roberts Taylor
Willie N. Taylor          1862-1866  age 4
      parents : Lewis Taylor; Elizabeth Roberts Taylor   cause: Diptheria
```

Two marriages, four children across them, a cause of death on each of the two
that the register reached, and the stones in the surveyors' own words - all
assembled from four separate sources that did not previously speak to each
other.

Stopping the timeline on 1 January 1866 returns **617 people alive**, of whom
**408 carry something beyond a name and two dates**.

#### What it still cannot show, stated plainly

- **Occupation: one person.** The register holds 237 occupations, but they
  belong to county-wide decedents and only one of the 21 register-to-stone
  matches had a trade recorded. Occupation is a **context layer**, not a
  per-person field, and the dataset should not pretend otherwise.
- **Cause of death: 17 people**, almost all inside 1853-1866.
- **Family links reach 399 of 2,732.** Most stones simply never stated a
  relationship; `George Oscar Taylor` sits in the Taylor plot with no link
  because his stone does not say whose son he was, and nothing else does
  either.
- Everyone here is someone with a **surviving, legible stone**. The project's
  own figures on who that leaves out are in WHO IS NOT IN THIS DATASET.


---

### THE EVENT OVERLAY EXPANDED — 26 OCT 2026

`data/context_events.csv` grew from 45 to **84 events** and gained a
`confidence` column. Previous version preserved as
`data/context_events_pre26oct.bak`.

Five layers, independently toggleable: **national 30, regional 15, medical 20,
economic 13, local 6.** Confidence: 78 verified, 5 unverified, 1 disputed.

**The medical layer is the reason to do this at all.** This dataset records
what killed people; the new layer records when those things stopped killing
people, and the event notes name the counts directly:

| | |
|---|---|
| **1882** Koch finds the tubercle bacillus | CONSUMPTION, 183 deaths here, 1819-1890. Cause known; nothing changes yet |
| **1884** diphtheria bacillus identified | 18 diphtheria deaths here, all 1864-66 - Willie N. Taylor, three Carter children in six days of May 1865 |
| **1894** diphtheria antitoxin in wide use | the FIRST disease in this dataset to become treatable |
| **1908** public water chlorination begins | DYSENTERY, 141 deaths, every one 1853-1866. TYPHOID, 69 deaths, 1853-1882 |
| **1935** sulfonamides reach the market | PNEUMONIA, 70 deaths here, becomes survivable |
| **1944** streptomycin | CONSUMPTION BECOMES CURABLE - 62 years after its cause was found |

**Economic layer** covers the occupational and economic shifts: the 1831
turnpike, the Homestead and Morrill Acts, emancipation remaking Loudoun's
labour system, Rural Free Delivery 1896, the Model T, the 1920 majority-urban
census, **Rural Electrification 1935**, post-war farm mechanisation, the 1956
Highway Act, Dulles 1962.

**Local layer** adds Mt. Zion Methodist (1881), Second Mount Olive Baptist
(1892), Pleasant Valley Cemetery (1922) and the paving of Harmony's Black
burial ground (c.1990, marked unverified).

**Two research gaps are recorded as gaps, with no date, rather than guessed:**
Hamilton's first grocery or general store, and the founding of the Hamilton
post office. Neither has been established by this project. They carry an empty
`date` and `source = none`, and the spec requires that rows with an empty date
are excluded from rendering. The *Weekly Enterprise*, published in Hamilton
1890-1923 and full-text searchable on Virginia Chronicle, is the obvious place
to settle the first.

The railroad reaching Hamilton remains **disputed** - carried at 1874 but
flagged, with deed evidence pointing to 1870-75. The spec forbids drawing it
as a confident date.

`APP_SPEC.md` gains section 6, *The event overlay*, covering the layers, the
confidence rules, the medical pairing and the acceptance checks.


---

### THE FAMILY LAYER — 26 OCT 2026

Three derived files, no new sources.

**`data/family_events.csv` — 336 life events across 190 people.** Events the
resolved family links make datable: 116 `widowed`, 112 `child_died`, 107
`child_born`, 1 `died_in_childbirth`. They attach to the parent's or spouse's
life, which is the point - a timeline can now show a man being widowed and
burying a child, not just dying himself.

**Marriage: there are no marriage records in this project and no marriage
dates.** The relationship is known for 248 people; when it began is not. The
only derivable form is a window, in `data/marriage_windows.csv` (8 rows),
where someone had two resolved spouses: the first spouse's death is the lower
bound, the eldest child of the second marriage the upper. **Lewis Taylor
remarried between 1857 and 1860.** The spec forbids rendering any of these as
a point.

**`data/family_losses.csv` — 44 clusters.** Families that buried more than one
member in a year, grouped from the register's own `parents` field. **26 of the
44 fell inside 30 days. Four families lost three or more.**

- **Dulin, 1853** - FOUR children in 47 days: Henry 8, James 3, Charles 4,
  Ann 6. Dysentery took three.
- **Cooksey, 1821** - three in two days. Edward on 24 July; George and
  Harrison both on the 25th. Bilious fever.
- **Carter, 1865** - three in six days of May. Courtney 7, Emma 6, Juliet 8.
  Diphtheria.
- **Ault, 1865** - three of typhoid. George 19, Richard 17, Martha 13.
- **Paxson, 1855** - Burr and Rodney, both aged 2 months 15 days, dead a day
  apart. Twins.

Caveat written into the spec: most of these come from the **county-wide**
register, so the families are not necessarily buried in these three
cemeteries. The Carters are the worked example - the register's three children
are of E. L. & M. L. Carter, while Lakeview's Carter plot C-89 holds a
different child of a different mother.

`APP_SPEC.md` gains section 7, *The family layer*, with its own acceptance
tests.


---

### BIRTHS CORRELATED BY FAMILY — 26 OCT 2026

The inverse of the loss clusters. `data/family_births.csv`, 58 families.

**The register reconstructs birth dates.** It states an age at death precise
to the day - "7 yrs. 1 mo. 18 ds." - next to a death date, and the two
together give a birth date. **1,328 of the 1,817 entries carry both**; 1,059
of those also name parents; grouping by parents gives **48 families** with two
or more reconstructible births, with sibling intervals, childbearing span and
median gap. A further **10 families** come from the cemetery side, using
resolved parent links and the birth dates carved on the stones.

**53 sibling intervals are measurable. The median gap between siblings is 48
months.**

The Carters are the sharpest case: born May 1857, March 1858, May 1859 -
three children inside 24 months - and all three dead of diphtheria inside six
days in May 1865.

**The selection bias is written into every row.** The register records only
children who DIED, so a register sibling set is the children *lost*, not the
children *born*. Counts are floors; intervals are measured only between
children who both died.

### CEMETERY-SIDE LOSS CLUSTERS, AND A DUPLICATE DETECTOR BY ACCIDENT

`data/family_losses_cemetery.csv` - 42 clusters of people in one plot who died
within 90 days. Unlike the register clusters these attach to actual graves.

**36 are apparent genuine losses. 6 turned out to be the same person recorded
twice** - same plot, same death date, same birth year, overlapping given
names. Written out separately as `data/probable_duplicates_found26oct.csv`:
Cockerill/Cockerille (two of them), Brown-Hayslett, Cecelia/Cecilita Rodriguez
De Alvarez, William/John William Wynkoop, and Mary D Davis / Mary D. Hawley -
one infant, two surnames, identical dates.

The detector first over-matched and flagged **Janet Lee M. Lewis (18) and
Wayne D. F. Lewis (20)**, dead the same day in 1970, as duplicates on the
strength of a shared surname. Tightening the rule to require overlapping GIVEN
names and an identical birth year put them back where they belong: two
siblings who died together.

The genuine clusters worth knowing:

- **N-23, 1943 - three Loves dead on one day.** A. Morris Love 60, Ruth Grubb
  Love 54, James Woolf Love 23. Father, mother and son, same date.
- **C-57, 1970 - the two Lewis siblings**, 18 and 20, same day.
- **C-21, 1918 - Ruth Payne 24 and Elizabeth Payne 17**, three days apart in
  late October. The influenza pandemic; `context_events.csv` already carries
  its Virginia peak at that moment.


---

## ERAS AND THE SEGREGATION-ERA GAP — 26 Oct 2026 (afternoon)

### What prompted this

Curtis asked whether the beginning and end of the segregation era were
denoted in the data, and what other eras could be shown.

**Answer to the first: no.** `context_events.csv` held exactly one
segregation-adjacent row out of 84 — `1964-07-02, Civil Rights Act signed` —
and it carried `source: general`, the same unverified pattern that the
Burning Raid row carried before it was challenged and verified.

### What was added

**`context_events.csv`: 84 → 102 rows.** Eighteen new rows, every one with a
real citation and `confidence: verified`:

| date | event | source |
|---|---|---|
| 1857-03-06 | Dred Scott v. Sandford | US National Archives |
| 1865-12-06 | 13th Amendment ratified | US National Archives |
| 1868-07-09 | 14th Amendment ratified | US National Archives |
| 1870-02-03 | 15th Amendment ratified | US National Archives |
| 1896-05-18 | Plessy v. Ferguson | Library of Congress |
| 1901-06-12 | Virginia constitutional convention convenes | Encyclopedia Virginia |
| 1902-06-26 | Virginia Constitution of 1902 completed | Encyclopedia Virginia |
| 1904 | Virginia poll tax takes effect | Encyclopedia Virginia |
| 1941-09 | Douglass High School opens, Leesburg | LCPS / Douglass HS |
| 1954-05-17 | Brown v. Board of Education | Encyclopedia Virginia |
| 1956-02-25 | Byrd calls for Massive Resistance | Encyclopedia Virginia |
| 1956-08-27 | Stanley Plan announced | Encyclopedia Virginia |
| 1958-09-15 | Virginia begins closing schools | Encyclopedia Virginia |
| 1959-01-19 | Massive Resistance ruled unconstitutional | Encyclopedia Virginia |
| 1964-01-23 | 24th Amendment ratified | Encyclopedia Virginia |
| 1965-08-06 | Voting Rights Act signed | Encyclopedia Virginia |
| 1968-05-27 | Green v. New Kent County | Encyclopedia Virginia |
| 1968 | Loudoun County schools desegregated | Douglass HS / LCPS |

The `Civil Rights Act signed` row was also moved off `source: general`.

### Three findings worth keeping

1. **Virginia disfranchisement has hard numbers.** Registered Black voters in
   Virginia fell from about **147,000 in 1900 to about 21,000 in 1904**, and
   fewer than half of those 21,000 qualified. Black votes in the 1904
   presidential election fell about 90 percent. (Encyclopedia Virginia,
   *Disfranchisement*.)

2. **Loudoun did not desegregate on its own initiative.** The county
   desegregated in **1968** — fourteen years after Brown — because
   *Green v. New Kent County*, decided **27 May 1968**, struck down
   "freedom of choice" and forced large-scale desegregation across Virginia.
   The 1968 date is an effect, not a decision, and the app should not imply
   local initiative.

3. **No high school existed for Black students in Loudoun County before
   September 1941**, when Douglass opened in Leesburg. Before that the only
   secondary option was the upper level of the Loudoun County Training
   School. **Every person in the Pleasant Valley records born before roughly
   1925 had no high school available to them in this county.** This bounds
   any claim the project makes about education.

### New file: `data/context_eras.csv` — 18 spans

`context_events.csv` holds only point events. Eras need a start and an end,
so they get their own file. Columns: `era_id`, `layer`, `label`,
`start_date`, `start_precision`, `end_date`, `end_precision`, `open_ended`,
`basis`, `source`, `confidence`, `note`.

Layers: `documentation` 8, `social` 6, `medical` 3, `economic` 1.

Eras **nest and overlap** — `soc-massive-resistance` (1956–59) sits inside
`soc-disfranchisement` (1902–65), which overlaps `soc-segregated-schools`
(1941–68). The file is not a partition.

Two rows are `open_ended = yes` with an empty `end_date`
(`doc-modern-survey`, `med-antibiotic`). An empty `end_date` must never be
read as ending at the present day.

### THE DOCUMENTATION LAYER IS THE MOST IMPORTANT THING IN THAT FILE

Burials per decade in `timeline_people.csv`:

```
1830s   2     1880s   61     1930s  215     1980s  193
1840s   5     1890s   83     1940s  213     1990s  180
1850s  33     1900s  150     1950s  201     2000s  181
1860s  17     1910s  191     1960s  215     2010s  159
1870s  48     1920s  189     1970s  210     2020s   77
```

That shape is **the record arriving, not the town filling up.** Three spans
bound what the app may claim:

- **`doc-blackout` (1822–1852) — thirty-one years with no source of any
  kind.** The newspaper abstracts stop at 1821; the state register does not
  begin until 1853. Seven people total die in the 1830s and 1840s here.
- **`doc-register-gap` (1860–1863)** — four consecutive years absent from the
  state register, covering secession and most of the war. Verified
  empirically: no register row carries 1860, 1861, 1862 or 1863.
- **`doc-modern-survey` (1990– )** — where coverage becomes effectively
  complete.

Also note, from the per-source year audit: the newspaper abstracts are **two
clusters, not one range** — 1818–1821 and 1867–1869. The private death lists
run 1868–1900 **with 1887 absent**.

A build that presents the pre-1900 stretch without reference to the
`documentation` layer is asserting a demographic claim the data does not
support.

### APP_SPEC.md

Added **§6.6** (the eras data contract and its rules) and six new acceptance
assertions. All 14 era/event assertions verified passing against live data.
Secondary-inputs table updated.

### KNOWN WEAKNESS, NOT YET FIXED

**73 of the 102 event rows still carry `source: general`.** They are mostly
uncontroversial national facts (Gettysburg, the Model T, Pearl Harbor), but
`general` is not a citation and the Burning Raid showed what happens when one
of them is wrong. These should be upgraded to real sources before the app
surfaces any of them with a clickable source, which §6.4 requires.

### STILL MISSING FROM THE EVENT LAYER

- **Vietnam, entirely** — no begin, no end, no battles. There is a Vietnam
  Marine buried at Lakeview.
- **Battles**, for every war except Gettysburg.
- **Indoor plumbing, town sewer service** — no rows.
- **Roadway and county transportation** — thin to absent.
- Hamilton's first grocery/general store and post office founding — logged as
  deliberate gaps in §6.5.

---

## PRE-1870 SCHOOLS IN LOUDOUN COUNTY — 26 Oct 2026

Curtis asked whether any history exists on which schools operated in the
county before 1870. It does, and it produced the single most locally
significant find of the day.

### THERE WAS A SCHOOL FOR BLACK CHILDREN AT HARMONY — TODAY'S HAMILTON

By **March 1869**, seven schools educated Black children in Loudoun County:
near Hillsboro, and at Leesburg, Lincoln, Middleburg, Waterford, Willisville,
and **"Harmony" — located at either Hamilton or nearby Brownsville.**

**Hamilton was named Harmony until 1875.** This is the earliest documented
school for Black children in this town — **53 years before Pleasant Valley
Cemetery was established, and 72 years before Loudoun County had a Black high
school.** The Hamilton-or-Brownsville ambiguity is in the source and has NOT
been resolved; the spec forbids the build resolving it.

Source: Loudoun County Historical Society, *Timeline of Important African
American Events in Loudoun County*.

### What Virginia had instead of a school system

No public system until 1870. What existed was the **Literary Fund**:

- Passed by the General Assembly early 1810 (House 24 Jan, Senate 8 Feb);
  account established **1811**.
- The **1818 act** set aside $15,000 a year for the University of Virginia and
  **$45,000 a year for educating the poor**.
- **County school commissioners**, not a school board, administered it. Each
  locality drew about **three and a half cents per child per day of actual
  attendance**.
- Literary Fund records at the Library of Virginia span **1794–1869**, bulk
  1811–1850, under APA accessions 146–150.

In Loudoun, as it actually operated: **75 schools for 900 poor children in
1831, open only 70 days a year** (reported, marked `unverified`).

### LOUDOUN VOTED DOWN PUBLIC SCHOOLS IN FEBRUARY 1846

Virginia let localities choose whether to establish public schools. **Loudoun
rejected the option**, reportedly out of fear the schools would have to admit
free Black children. The county had the chance **twenty-four years before
1870** and turned it down.

### Named schools that operated before 1870

| school | date | note |
|---|---|---|
| **Leesburg Academy** | chartered 1799 | Classical Latin grammar school for boys; purpose-built beside the courthouse 1844; operated through the Civil War; moved to North Street 1873 |
| **Goose Creek Friends' Schoolhouse**, Lincoln | 1820s | Quaker |
| **log schoolhouse, Purcellville** | 1820s | Quaker |
| **Springdale Boarding School for Girls**, Lincoln | founded 1839 | Founded by Samuel M. Janney; ~3 miles from Hamilton |
| Middleburg; near Hillsboro (by Asbury Methodist) | late 1865 / Jan 1866 | Freedmen's Bureau |
| **"Janney's School"**, Lincoln; and Waterford | 1866 | Quakers + Baptists + Freedmen's Bureau |
| **"the African School"** and **"Bailey's School"**, Leesburg | 1866 | Freedmen's Bureau. Rev. William L. Robey teaching, per *The Washingtonian*, 22 Jun 1866 |
| **Waterford School** | built 1867 | Bureau + Philadelphia Friends; land bought by Black trustees Jul 1866; served ~90 years |
| **Willisville** | 1868 | Built for $150; first public school for Black children in southwest Loudoun |
| **"Harmony"** (Hamilton or Brownsville) | by Mar 1869 | **See above** |

The 1820s Quaker claim — that Black children on Quaker farms attended school
with white children at Purcellville and Lincoln — rests on **John Jay Janney's
1901 memoirs**, written eighty years after, and is marked `unverified`.

### THE LEGAL BOUNDARY

**1818:** A letter signed "Judex" in the Leesburg *Genius of Liberty* states
that teaching enslaved people to read and write is illegal: *"the order of
society must prevail over the notions of individuals."* The *Genius of
Liberty* is **one of this project's own four sources** — see
`loudoun_deaths.csv`, src_page 100–104.

**1831–32:** After Nat Turner's revolt, Virginia barred enslaved and free
Black people from assembling to read, write, or hear a Black preacher. Slaves
of one master could still meet for prayer.

That is **thirty-four years in which schooling Black children in this county
was against the law**. Individuals defied it — William Benton of Waterford,
who held 19 people in 1850, and Margaret Harrison Benton of New Lisbon (now
Huntlands) — but no institution could.

### WHY THE CONFEDERATE-CLASSMATE QUESTION IS CLOSED

All 23 Confederates in this project were born 1810–1845, entirely inside
`edu-no-public-system`. They were schooled in private academies, old-field and
subscription schools, and Quaker schools. **Enrollment records for these
largely do not survive and are not digitised.** No classmate relationship
between any two people in this dataset can be established, and §6.6 now
forbids the build implying one. This is not a gap more searching will close.

### Data changes

- **`context_events.csv`: 102 → 118 rows.** Sixteen new education events. A
  new **`education`** layer; the eight existing school rows (Brown, Byrd,
  Stanley Plan, the 1958 closings, the Jan 1959 rulings, Green, Douglass,
  Loudoun 1968) were migrated into it. Layers now: national 37, education 24,
  regional 18, medical 20, economic 13, local 6.
- **`context_eras.csv`: 18 → 21 rows.** New `education` layer with
  `edu-no-public-system` (1811–1870), `edu-black-education-illegal`
  (1831–1865), `edu-freedmens-bureau` (1865-03–1868).
- **`APP_SPEC.md` §6.6** gained the education-layer rule, including the
  explicit prohibition on implying classmate relationships. Acceptance tests
  updated. **All 15 event/era assertions verified passing.**

### LOGGED, NOT PURSUED (digital-only constraint)

- **Literary Fund records, Library of Virginia**, APA 146–150, 1794–1869.
  Whether Loudoun county-commissioner pupil or teacher lists survive within
  them is not established. Partly digitised; worth a remote check.
- **Loudoun County school commissioners' records** — LVA county records
  holdings not yet checked for this county.
- **Quaker meeting records**, Goose Creek Monthly Meeting (Lincoln) — Quaker
  schools kept their own minutes; some Friends records are digitised.
- The *Genius of Liberty* (1817–43) is full-text searchable on Virginia
  Chronicle and would carry school advertisements and teacher notices. This
  is the cheapest unexplored route to named pre-1870 schools.

---

## BROWNSVILLE, THE NAME QUESTION, AND HUNTLAND — 26 Oct 2026

### CORRECTION TO THE SECTION ABOVE

The pre-1870 schools section said "William Benton of Waterford." **That was
my conflation of two separate chronology entries.** The chronology records
William Benton, who held 19 people in 1850 and taught them to read and write,
*without* placing him at Waterford; the Waterford reference is a separate and
**unverified** note about eight Black men and women at Waterford listed as
literate in the 1850 census. Corrected in `context_eras.csv`
(`edu-black-education-illegal`). William Benton is almost certainly of the New
Lisbon / Huntland family — see below — which makes the story cohere rather
than scatter.

### THE HARMONY SCHOOL LOCATION IS RESOLVED — it was at Brownsville

`context_events.csv` (1869-03) has been updated. The school stood at
**Brownsville**, on property belonging to **William H. and Marion P. Brown,
white Quakers**, who let the Freedmen's Bureau open it on their land just
after the war. **It had 64 students in 1870, taught by a Black teacher,
ELLIS S. PORTER.**

The earlier chronology's "either Hamilton or nearby Brownsville" is superseded
by the communities record, which names the family, the teacher and the
enrolment. The name "Harmony" comes from the town — Hamilton was Harmony
until 1875.

### WHERE BROWNSVILLE WAS

**Just east of Hamilton**, in a low, swampy area. Also called **Swampoodle**
— that nickname is about the ground, not the people. Both names date to the
19th century.

Brownsville is also the community where **Second Mount Olive Baptist Church**
was built in **1892, on land donated by NANCY MURRAY** — a row already in
`context_events.csv`, now enriched with the donor's name and the link back to
the 1869 school. Same community, same ground, 23 years apart.

### IS "BROWNSVILLE" A RACIST NAME? NO — BUT OTHERS IN THIS COUNTY ARE

Brownsville is a surname place-name, and pointedly not a segregated one: the
Loudoun County Historical Society describes it as home to **both Black and
white Browns**, and it was the white Quaker Browns who hosted the school for
Black children on their own land.

**However**, Curtis's instinct about Loudoun's naming landscape is sound —
just aimed at the wrong village. The same source's list of historic African
American communities includes:

- **Watson** — "Watson Mountain or **Negro Mountain**", the high ridge south
  of Leesburg
- **Britain** — "**Guinea**", on the eastern flank of Short Hill; originally
  known as Guinea and later renamed for Michigan senator Calvin Britain.
  Became a free African American settlement in the mid-19th century; Mount
  Sinai Free Baptist Church built 1880, serving as the community school until
  1915; the last Black families left in the 1920s.
- **Guinea Hill** and **Guinea Bridge**, southwest of Lincoln along the North
  Fork of Goose Creek

"Guinea" attaches specifically to free Black settlements here. **CAUTION: no
source consulted states the origin or intent of the Loudoun "Guinea" names.**
The Chesapeake-region association with the Guinea coast of West Africa is the
obvious reading but is NOT documented for these places and must not be
asserted as fact in the app.

### WHERE HUNTLAND IS — and the spelling

**Huntland**, not Huntlands. The chronology spells it "Huntlands"; the DHR
National Register nomination uses **Huntland** throughout.

- **35955 Huntland Farm Road, about four miles northwest of Middleburg**,
  southern Loudoun. Bordered by Foxcroft Road north and Pot House Road east;
  the main house faces east.
- **Formerly NEW LISBON.** The property was bought from Jeremiah Bronaugh in
  **1833**; the nomination dates the house to about **1834** (a date of 1837
  appears on the house, but the nomination's research places it three years
  earlier).
- Built by **William Benton, Sr.**, an English-born master brickmason.
- The **Benton family owned it for much of the 19th century** — sons James
  Monroe Benton, William Benton, Jr., Benjamin Hyde Benton.
- **Joseph B. Thomas renamed it Huntland and remodelled it in 1915.**

Note it is roughly **13 miles south of Hamilton** — outside this project's
immediate area, and no one in the three cemeteries is yet linked to it.

### A LEAD WORTH FOLLOWING: the Hamilton-area Black communities

The Historical Society's community list names several in Hamilton's immediate
orbit, which bears directly on Pleasant Valley's 368 records:

- **Hamilton** itself is listed as a historic African American community
- **Brownsville (Swampoodle)** — just east
- **Irene** and **Ivandale** — just south of Hamilton, at the Washington and
  Old Dominion Railroad station

Loudoun County also publishes a **GIS layer of historic African American
communities** (`logis.loudoun.gov`), which would give these mapped extents
rather than prose locations. Not yet pulled. This is the strongest remaining
lead for placing Pleasant Valley's people in the settlements they actually
lived in.

---

## LOUDOUN COUNTY GIS — THE COUNTY CORROBORATES THE HARMONY LEGEND, 26 Oct 2026

Curtis knew where Ivandale is but not that it was a Black community, observed
that it is not one now, and had never heard of Irene. Chasing that pulled in
the Loudoun County GIS historic layers, which turned out to hold the most
important single find of this project so far.

**Access note:** `logis.loudoun.gov` is blocked at the container proxy
(CONNECT tunnel 403). It is reachable via WebFetch and via Claude in Chrome.
The ArcGIS REST endpoints were queried through the browser, not curl. No
policy denial was routed around.

Service: `logis.loudoun.gov/gis/rest/services/COL/Historic/MapServer`
Layers: 0 Historic Communities (144 pts) · 1 National Register Historic
Districts (poly) · 2 Original Landgrants (poly) · 3 **Cemetery (233 pts)** ·
4 Historic Sites (84 pts) · 5 Historic Communities Villages (pts)

### THE FINDING: Loudoun County's own cemetery record for Harmony UMC

Record **PCEM-1998-0072**, field `CM_Notes`, verbatim:

> **"Graves believed to be historically African-American were disturbed
> during construction of a parking lot pre-2000."**

Curtis said on 24 Oct: *"I believe the stones at Harmony Methodist that were
moved or lost were that of slaves (or so the legend here in Hamilton goes)."*

**The county government's own cemetery inventory says essentially that.** This
is documentary corroboration of the Hamilton legend from an official source —
not proof the graves were of enslaved people, which the county does not claim,
but official confirmation that graves believed to be historically African
American at Harmony were disturbed by parking-lot construction.

What the county does NOT say: how many graves, whose, where they went, or the
exact date. `CM_Notes` gives only "pre-2000". Added to `context_events.csv`
as a `local` event dated 2000 with the note stating plainly that the year is
an **upper bound, not the event date**.

### New file: `data/context_cemetery_official.csv` — and three count conflicts

| | county est. | county earliest | county graves | project records |
|---|---|---|---|---|
| **Lakeview** | 1857 | **1854** | **1,893** | 2,101 |
| **Harmony UMC** | No Data | **1837** | **221** | 263 |
| **Pleasant Valley** | No Data | **1913** | **301** | 368 |

Coordinates: Lakeview 39.139790, −77.664364 · Harmony 39.133605, −77.655191 ·
Pleasant Valley 39.131307, −77.654465. Lakeview carries DHR ID 232-5008.
Pleasant Valley is the only one the county flags `CM_AFFILIATION =
African-American`.

Three things to notice:

1. **The project exceeds the county count in all three cemeteries.** That is
   expected — the project folds in the 1948 survey and modern memorial records
   — but it means the county figure is NOT a validation target. §9 now
   forbids using it as one.
2. **Lakeview's earliest burial (1854) predates its establishment (1857).**
   Either reinterments or 1857 is a formal organisation date.
3. **Pleasant Valley: the county says earliest burial 1913.** The project has
   been working to an 1922 establishment date. **UNRESOLVED CONFLICT** — 1913
   would push the first Black burials in this project's area back nine years.

### WHERE IRENE IS — and it is not south of Hamilton

The Historical Society's prose page says "just south of Hamilton, at the
Washington and Old Dominion Railroad station." The GIS disagrees.

**"Irene & Ivandale" is a SINGLE combined record** — GIS id 31, category
*Predominantly Black Community*, at **39.134380, −77.669067**. That is
**0.40 km WEST-SOUTHWEST of Hamilton's centre point** — effectively inside
the town, not south of it.

The county records a point and a category for it and **nothing else**:
`HC_SUMMARY` is **NULL**. Same for **The Hill** and for **Hamilton School**.
The county marks them and documents nothing. That Curtis has never heard of
Irene is consistent with the record itself being this thin.

### New file: `data/context_communities.csv` — 25 sites within 5 km of Hamilton

Nearest first, with bearing from Hamilton's centre:

| km | bearing | site | category |
|---|---|---|---|
| 0.00 | — | **Hamilton** | Biracial Community |
| 0.17 | NW | Grand United Order of Odd Fellows | Fraternal Lodge |
| 0.21 | N | **Galilean Fisherman Fraternal Hall** | Fraternal Lodge |
| 0.40 | WSW | **Irene & Ivandale** | Predominantly Black Community |
| 0.40 | NW | Mt Zion United Methodist Church (Hamilton) | Church |
| 0.43 | WNW | Hamilton School | School |
| 0.45 | NNW | **The Hill** | Predominantly Black Neighborhood |
| 1.16 | E | Brownsville (Harmony) School | School |
| 1.93 | E | Brownsville (Swampoodle) | Predominantly Black Community |
| 1.93 | E | Second Mt Olive Baptist Church | Church |
| 3.41–4.19 | | Lincoln, Purcellville, Hughesville, Cooksville, Paeonian Springs, **The Color Line**, Loudoun County Emancipation Association HQ, and six churches/schools/lodges | |

**Hamilton itself is classified a "Biracial Community":** *"Freedmen
established homes in Hamilton after the Civil War. The community centered on
Mount Zion Methodist Episcopal Church and nearby schools for African American
children."*

**Galilean Fisherman Fraternal Hall**, 0.21 km north: *"Formed by Hamilton
residents as a mutual aid society, since Black residents were often denied
access to insurance and credit. Its building on West Virginia Avenue no
longer stands."*

**The Color Line**, 4.13 km west in Purcellville: *"G Street became known as
'the color line', since this street separated the Black and White
neighborhoods."* — an actual place name in the county's official layer.

County-wide tally of layer 0 (144 records): Church 37 · School 35 ·
Predominantly Black Community 34 · Biracial Community 13 · Predominantly
Black Neighborhood 13 · Fraternal Lodge 11 · Government Office 1.

### A SCHOOL DATE CONFLICT, LEFT OPEN

The GIS dates **Brownsville (Harmony) School to 1887**, closing to students in
1925 when it became a residence. But the Historical Society chronology puts a
Freedmen's Bureau school named "Harmony" at this community **by March 1869**,
on William H. and Marion P. Brown's land, 64 students in 1870 under Ellis S.
Porter.

These are most likely **two schools** — a Bureau school of 1869 and a public
school building of 1887. Both are now in `context_events.csv` as separate
events, and the 1887 note states that whether they share a site or a lineage
is **not established and must not be asserted**.

### Data changes

- **NEW** `data/context_communities.csv` — 25 rows, 8 cols
- **NEW** `data/context_cemetery_official.csv` — 3 rows, 13 cols
- `context_events.csv` 118 → **121** (1887 school opens, 1925 school closes,
  the Harmony grave disturbance). Layers: national 37, education 26,
  regional 18, medical 20, economic 13, local 7.
- `APP_SPEC.md` §2.2 lists both new files; §9 gains the rule that the
  county's grave count must not be used to validate the project's counts.

### OPEN QUESTIONS THIS RAISED

1. **Pleasant Valley: 1913 or 1922?** The county says earliest burial 1913.
   Worth resolving — it moves the project's earliest documented Black burial.
2. **The Harmony disturbance: when, how many, and where did they go?** The
   county says only "pre-2000". The historic aerials already confirmed for
   Harmony UMC (1957, 1965, 1969, 1974, 1980, 1982, 1988, 1989, 1990, 1994,
   2002+) would **date the parking lot's construction to within a year or two**
   by showing when it appears. That is a digital-only route to a real answer.
3. **Layer 5, Historic Communities Villages**, not yet pulled.
4. **Layer 1, National Register Historic Districts** (polygons) — would give
   the mapped extent of the Hamilton district.

---

## THE 1920s DISPLACEMENT — ANSWERED, 26 Oct 2026

Curtis asked what happened in the 1920s to displace so many Black families,
noting there are very few in Hamilton even today.

### FIRST, A CORRECTION TO THE PREMISE

The 1920s were **not** the worst decade, and the decline was not a 1920s
event. Loudoun's Black population fell in **every decade from 1900 to 1950**:

| year | Black population | change |
|---|---|---|
| 1870 | 5,691 | (first post-emancipation census) |
| 1900 | 5,868 | — |
| 1910 | 5,221 | **−11.0% — steepest** |
| 1920 | 4,810 | −7.9% |
| 1930 | 4,347 | **−9.6% — second steepest** |
| 1940 | 4,094 | −5.8% |
| 1950 | 3,976 | −2.9% |

From **31.0% of the county in 1860** to about **10% by the early twentieth
century**. So the 1920s were the second-worst decade of a fifty-year decline,
not the cause of it.

**The census counts UNDERSTATE the outflow.** They take no account of natural
increase — a falling count against ordinary birth rates means a substantially
larger net departure than the differences suggest. Do not present
decade-to-decade differences as the number of people who left.

### WHERE THEY WENT: Montclair, New Jersey

Not a diffuse drift north — a specific chain. **A Montclair businessman
brought Loudoun African Americans north to work as house servants as early as
1870**, and the networks those early migrants built carried Loudoun families
to Montclair for the next eighty years, "probably numbering in the hundreds."
Montclair's Black population grew from about 2,500 in 1910 to 6,300 in 1930.

Named Loudoun migrants, several of whom **came back**:

- **Flossie Sinclair Furr (1908–2004)** — family moved to Montclair for work;
  father Henry Sinclair a chauffeur, butler and handyman, mother Laurinda a
  cook, maid and laundress. She attended an integrated Montclair elementary
  school c.1913–17. Her parents returned to Purcellville and owned their home
  by 1930.
- **Jesse Randolph (1916–1987)** — graduated high school in Montclair,
  returned to Loudoun, founded a trash hauling service.
- **Basham Simms (1924–2006)** — junior high in Montclair, returned, founded
  a contracting business, and in **1967 became the first African American
  elected to the Purcellville Town Council**.
- **Clifford Hooe (1870–1894)** — grandson of a woman enslaved at Welbourne;
  first known African American to own a business in Montclair, a newsstand.

Families also sent children to Washington DC, Baltimore, **Storer College**
in Harpers Ferry, and the **Manassas Industrial School** — because Loudoun had
nowhere to send them.

### THE TWO 1920s LAWS

Both are now in `context_events.csv`, verified from Encyclopedia Virginia:

- **Racial Integrity Act — signed 20 March 1924** by Gov. E. Lee Trinkle.
  Defined a white person as one with "no trace whatsoever of any blood other
  than Caucasian", banned interracial marriage, required birth and marriage
  records to note race, and **put the burden of proof on the individual**.
  Proposed by the Anglo-Saxon Clubs of America (founded 1922 by Walter A.
  Plecker, Ernest S. Cox, John Powell); Plecker as state registrar enforced a
  stricter "trace of negro blood" standard in practice. The marriage ban stood
  until *Loving v. Virginia*, 12 June 1967. The General Assembly denounced the
  act and eugenics in 2001.
- **Public Assemblages Act — became law 22 March 1926.** Required separation
  of white and colored persons at public halls, theatres and other public
  gatherings. House 63–3, Senate 30–5; **Gov. Harry F. Byrd Sr. let it become
  law without signing it.** Hampton Institute stopped opening its events to
  the public rather than comply.
- Also added: **4 March 1930**, Virginia redefined "colored" to include anyone
  with any "negro blood", and reclassified all Virginia Indians not living on
  the two reservations as "colored".

Documented push factors, per the Loudoun Museum: Jim Crow and a hardening of
racial attitudes; the 1902 constitution; the 1924 and 1926 acts; and
**poorly funded, overcrowded, often unsafe Black schools**. Loudoun had no
Black high school until 1941 — see the education era rows.

### THE FINDING THAT MATTERS MOST FOR THE APP

**The burial record runs the opposite way to the population.** Pleasant
Valley burials by decade, computed from `timeline_people.csv`:

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
has it exactly backwards.** The burials are the documentation arriving; the
population is the people leaving. New spec section **§6.7** states this and
forbids conflating them.

### WHAT THE COUNTY'S OWN SURVEY DOES *NOT* SAY

Worth recording, because it shaped how confidently this is stated: the
**Loudoun County African-American Historic Architectural Resources Survey**
gives **no population figures and no migration analysis for 1910–1940 at
all.** Its only explicit statement about out-migration concerns the Civil War
era: African Americans "held their own referendum on slavery during the Civil
War and immediately afterwards by leaving Loudoun County" (p.16). It notes the
1902 constitution halved Loudoun's voters by 1904 but does not connect that to
departures, and its evidence for the 1910s–30s is about continued building,
not decline.

So the decade-by-decade figures and the causal account above rest on the
**Loudoun Museum's** Montclair article, not the county survey. One local
source, well documented, not independently corroborated on the numbers.

### Data changes

- `context_demography.csv` **8 → 15 rows**: 1870 and 1900–1950 Black
  population. NOTE: rows from 1870 on have empty `total`, `white`,
  `free_black`, `enslaved` and `black_share_pct` — only `black_total` is
  populated, and §9 now forbids computing a share from them.
- `context_events.csv` **121 → 125**: the 1924, 1926 and 1930 laws, and the
  1870 Montclair recruitment. Layers: national 37, education 26, regional 21,
  medical 20, economic 14, local 7.
- `context_eras.csv` **21 → 22**: `soc-great-migration` (1900–1950).
- `APP_SPEC.md`: new **§6.7**, the Great Migration counter-trend, with the
  explicit prohibition on reading rising burials as a growing community.

### STILL OPEN

- The decade figures come from one source. Worth checking against the census
  directly, which is digital.
- **One Pleasant Valley burial is dated 1850**, against the county's stated
  earliest of 1913 and the project's 1922 establishment date. Previously
  flagged as a probably-corrupt record; now there are three competing dates
  for PV's beginning and all three should be reconciled.

---

## HARMONY PARKING LOT — AERIAL SURVEY, 26 Oct 2026

Purpose: narrow the county's "pre-2000" for the construction that disturbed
graves believed to be historically African American at Harmony UMC.

Source: historicaerials.com (NETR), WMS tiles, centred 39.13325, −77.65475,
Leaflet zoom 18 (the native resolution limit of the source frames). 23 years
available at this location, confirming the earlier README finding.

**The imagery is watermarked and copyrighted (NETR, free to view only). No
frames were downloaded or redistributed. What follows is a reading, not a
reproduction.**

### Results — `data/harmony_aerial_survey.csv`

| year | lot south of church | note |
|---|---|---|
| **1957** | **absent** | Open ground and trees. No pavement adjacent to the church at all. |
| **1980** | **absent** | Grass or bare ground. No striped lot, no sharp pavement edge. |
| **1990** | **absent** | Vegetation and open ground. Parking in 1990 is a **row of cars along the west drive**, not a formal lot. |
| 1994 | **indeterminate** | Coarse B&W; a dark blob (likely tree canopy) over lighter ground. Resolution and watermarking do not permit a call. **Must not be treated as either present or absent.** |
| **2002** | **present** | Large asphalt lot south/southwest of the church, **painted stall striping clearly visible**. |

### THE ANSWER

**There is no aerial frame between 1994 and 2002.** The sequence therefore
cannot do better than a bracket — but the bracket is real:

- The lot is **certainly absent in 1990**.
- The lot is **certainly present in 2002**.
- The county independently says the construction was **pre-2000**.

**→ The parking lot was built between 1994 and 2000, and certainly after
1990.**

That narrows the county's open-ended "pre-2000" to a window of at most six
years, and rules out the lot being an old or mid-century feature. Whatever
was disturbed was disturbed within living memory, in the 1990s.

### WHAT THIS DID NOT ESTABLISH — read before citing it

1. **Which pavement overlaps the historic burial ground.** Clean registration
   of the cemetery boundary against the aerial frames was not achieved. The
   county's OSM/GIS cemetery polygon sits southeast of the church; the lot
   that appears is south/southwest. **Whether they overlap is not shown by
   this survey.**
2. **How many graves, whose, or where they went.** The county says nothing
   and the imagery cannot.
3. **The 1994 frame is genuinely unreadable** at the needed detail. It is
   recorded as `indeterminate`, not as absent, and must stay that way.

The aerial reading is **interpretation of imagery, not a document.** The
county's `CM_Notes` remains the only documentary statement that graves were
disturbed.

### Method notes for repeating this

- The viewer's year buttons are a Leaflet WMS layer. Years can be switched
  directly: find the layer whose `_url` contains `historicaerials`, then
  `layer.wmsParams.layers = '1980'; layer.redraw();` — far more reliable than
  clicking, and the list scrolls off a 665px viewport below 1974.
- `maxNativeZoom` on the aerial layer is 20, but **anything above 18 is an
  upscale** and produces blur, not detail. Work at 18.
- The OSM base caps at zoom 18; `map.options.maxZoom` must be raised first or
  `setView` silently clamps.
- Watermarks are baked into the tiles and fall diagonally across the church
  and cemetery. There is no clean frame.

### THE OBVIOUS NEXT MOVE

**Loudoun County land records.** A parking lot built in the 1990s at a church
on East Colonial Highway would have left a **site plan, a building or land
development permit, and very likely a county review file** — all dated, all
naming the parcel, and some of it digital. That would give the actual
construction date, the footprint, and possibly correspondence about the
graves. The county's own cemetery record (PCEM-1998-0072, created in the 1998
survey round) suggests someone at the county knew about this at the time.

---

## WEEKLY ENTERPRISE / LOUDOUN PAPERS — FIRST RUN, 26 Oct 2026

### COVERAGE FIRST — this is the headline, and it is bad news

The Hamilton *Weekly Enterprise* is **TWEP** on Virginia Chronicle:
**9 May 1890 – 24 August 1923, but only 113 ISSUES.** A weekly over 33 years
would be roughly 1,700 issues. **Digitised coverage is about 7 percent.**

Issues by year:

```
1890  3   1895  1   1900  1   1909  1   1922  2
1891  2   1896  1   1902 40   1911  1   1923 22
1892  4   1897  1   1903 16   1916  2
1893  1   1899  2   1904 12
1894  1
```

**1902, 1903, 1904 and 1923 hold 90 of the 113 issues.** There is NOTHING at
all for 1898, 1901, 1905, 1906, 1907, 1908, 1910, 1912–1915, 1917–1921.

Exact issue dates are saved as `data/weekly_enterprise_issues.txt`.

### TARGETING

481 people in `timeline_people.csv` died between 1890 and 1923, and **not one
of them has a cause of death.** 353 Lakeview, 124 Harmony, 4 Pleasant Valley.

But an obituary needs an issue to run in. Matching each death against the 113
known issue dates, allowing 0–28 days between death and publication, gives
**46 people who could plausibly have an obituary in a surviving issue** —
32 Lakeview, 14 Harmony. Saved as `data/weekly_enterprise_targets.csv`.

**That is 46 of 481. Ten percent.** The other 435 died in a gap.

### METHOD THAT WORKS

Searching `sp=TWEP` does NOT restrict results — it is ignored. What works is
**county + date range**, which also picks up the *Loudoun Mirror*, *Loudoun
Times*, *Blue Ridge Herald*, the *Mirror* and the *Washingtonian-Mirror*:

```
/?a=q&hs=1&r=1&results=1&txq=SURNAME&txf=txIN&ssnip=txt
  &dafdq=DD&dafmq=MM&dafyq=YYYY&datdq=DD&datmq=MM&datyq=YYYY
  &ccq=Loudoun (VA)&e=-------en-20--1--txt-txIN----------
```

Results parse from `.searchresult`, snippet from `.txtsearchsnippet`.

- **Search the SURNAME, not the full name.** Quoted full names returned ZERO
  across all 46 — the OCR is too poor and the papers wrote "Mrs. Levi
  Wynkoop", not "Eliza Wynkoop".
- `txf` has only one value, `txIN`, so a multi-word query is a phrase.
  `SURNAME AND died` works but matches page-level, not proximity, so it is
  barely less noisy.
- **Only the first 20 results come back.** Common surnames return 300–2,000
  hits in a 30-day window and the obituary may not be in the first 20. This
  is the main reason the yield is lower than it should be.
- Cloudflare challenges the first load; it clears on its own in under 10
  seconds. Do not try to bypass it.
- Requests were paced at ~1.1–1.2 s.

### RESULTS — 6 CONFIRMED, in `data/newspaper_findings.csv`

Every one corroborates independently against data already in the project.

| person | corroboration | NEW FACT |
|---|---|---|
| **Edwin H. Tavenner** d.1902-03-11 | exact name in a death headline | — |
| **Stuart R. Steele** d.1902-04-12 | name and standing; two papers | **place of death: Purcellville** |
| **Albert H. Chamblin** d.1903-11-08 | "died on Nov. 8th" exact; father already recorded as John Robert Chamblin; age 1 matches "year old son" | **mother exists** (Mr. *and Mrs.*); **family residence Hamilton**; died at his father's house |
| **Wesley Carruthers** d.1904-06-08 | exact full name | **residence: Clarks Gap**; **dataset age error** |
| **Mary F. Coffman Ballenger** d.1923-04-18 | paper says "died on Wednesday morning last"; **1923-04-18 was a Wednesday** | **spouse: W. H. Ballenger** (field was empty); **"after a lingering illness"** |
| **Eliza Jane Carlisle Wynkoop** d.1899-02-13 | paper says "Mrs. Levi Wynkoop"; spouse already recorded as **Levi H. Wynkoop**; paper says "died on Monday of last week" and **1899-02-13 was a Monday** | **residence: near Silcott's Springs** |

Two corrections logged to `verified_findings.csv`, **NOT yet applied** to
`timeline_people.csv`:

- **HM0031 Wesley Carruthers** — `age_at_death` recorded as **79**, should be
  **78**. b.1825-09-28, d.1904-06-08 = 78y 8m. The paper is right.
- **LV0066 Mary F. Coffman Ballenger** — spouse **W. H. Ballenger**, field was
  empty.

### UNRESOLVED, LEFT OPEN

- **Steele**: the Winchester dispatch is dated 14 April and says "died
  yesterday", i.e. the 13th; the dataset has 12 April. Do not reconcile.
- **Carruthers**: the paper says "Thursday last"; 1904-06-08 was a Wednesday.
- **Ballenger**: one snippet in the same result set mentions burial "in The
  Union cemetery", but she is recorded at Lakeview. That line may belong to a
  different article on the same page. **Do not treat the Union cemetery as
  hers.**

### WHAT THIS RUN DID NOT DO

40 of the 46 targets produced nothing usable, mostly because the first-20
result cap buries the obituary under a common surname. The fix is paging
through results (`&st=21`, `&st=41`…), which multiplies the request count but
is the only way to clear common names like Saunders, James, Jones, White and
Myers. That is the next tranche.

The 435 people who died in a coverage gap are **not reachable through this
source at all**, and no amount of searching changes that.

---

## THE PAPER IS NOT MAINLY OBITUARIES — 26 Oct 2026

Curtis asked whether the interred appear in the newspaper outside obituaries.
They do, constantly, and this is a far larger vein than the death notices.

### THE KEY UNLOCK: `puq=TWEP`

The publication filter is **`puq`**, not `sp`. With it, a search is restricted
to the Hamilton *Weekly Enterprise* alone:

```
/?a=q&hs=1&r=1&results=1&txq=SURNAME&txf=txIN&ssnip=txt&puq=TWEP
  &e=-------en-20--1--txt-txIN----------
```

This was the missing piece in the obituary run, where `sp=TWEP` was silently
ignored and every search went county-wide.

Per-page OCR text is **not** fetchable: `a=d&d=TWEP19020110.1.1` returns only
a 2,315-character viewer shell and loads text by script. A corpus download of
all 113 issues is therefore not available by this route; search is.

### 32 HAMILTON SURNAMES, ALL PRESENT

Every one of the 32 most common surnames among people alive in Hamilton
1890–1923 returns hits in the town's own paper. Counts range from 1
(Hindman) to 416 (White). Full results in `data/newspaper_mentions.csv`.

### WHAT THE PAPER GIVES THAT THE STONES DO NOT

**A Hamilton business directory.** `occupation` is currently filled for
**1 of 2,732 people**. The paper is full of it:

| person as printed | what they did |
|---|---|
| **F. J. Beans** | **"Undertaker, HAMILTON, VA."** |
| **C. W. Warner** | **"Warner's Hardware Store, Hamilton, Va."** — pocket cutlery, scissors, spoons, tin |
| **G. T. Schooley** | **"Breeder of Thoroughbred"** stock |
| **G. W. Laycock** | **"the well known merchant of Hamilton"**; the firm **Laycock & Thompson** — and Thompson is also a cemetery surname |
| **James Wynkoop** | creamery, then **hardware**, "in the building now occupied by The Hamilton Mercantile" |
| **Mrs. G. S. Tiffany** | poultry settings at $4.50 per hundred — **trading under her own name** |
| **G. O. Tavenner** | listed among area businesses |
| **R. L. Saunders** | named with Hamilton Mercantile Co., C. O. Oochnauer, Flippo Bros. |
| **Charles K. Arnett** | **"Manager"**, with a wanted ad for a dairy hand |
| **Theodore Reid** | attending **the Bankers Association** |
| **W. N. Everhart** | classified ad, "Hamilton, Va." — **almost certainly LV0395 William Nathaniel Everhart**, d.1903-01-10 |

**F. J. Beans, undertaker, is the most consequential name on that list.** A
Hamilton undertaker in this period very likely handled burials in these three
cemeteries.

**Life events the stones cannot carry:**

- **A MARRIAGE**: *"Mr. Lester Payne and Miss Hannah Hindman were married in
  Washington and have begun housekeeping in ..."* — joining **two** cemetery
  surnames. This is exactly the material the family layer (§7) was built for
  and currently has almost none of.
- **Property**: *"Mr. R. L. Myers has sold his dwelling house in this town."*
- **An establishment**: *"a guest at the Preston House."*
- **Relationships stated outright** in social notes: *"Mrs. Colbert's parents,
  Mr. and Mrs. W. A. Smith, near this town"*; *"spending a few days with her
  brother, Mr. James Mock"*; Elmer Beales visiting "his brother" and "his
  mother, Mrs. Frank Everhart" — a **Beales–Everhart marriage link**.
- **An agricultural fair premium list**: *"N. B. Warner 1 do bronze turkeys.
  A. E. Warner 2d"* — names people and what they raised.
- **A murder trial**: Rev. Austin U. Donaldson, charged with the murder of
  Louis N. Meyer. **Relationship to the buried Donaldsons NOT established.**

### WHY THIS MATTERS MORE THAN THE OBITUARY RUN

The obituary run is capped at **46 reachable people** by issue coverage. These
mentions are not — they appear across all 113 surviving issues and name the
living, not just the dead. Occupation, business, property, marriage, kinship
and residence are all recoverable here, and all of them are fields the project
is currently near-empty on.

### CAUTION BEFORE ANY OF THIS IS APPLIED

**Not one mention in `newspaper_mentions.csv` is yet tied to a person_id.**
The paper prints initials — "C. W. Warner", "F. J. Beans", "G. T. Schooley" —
and the project holds full names. Matching initials to a person is exactly the
kind of inference that produced the DAR matcher errors. Each one needs the
same corroboration standard the six obituaries met: an independent fact
(a date, a spouse, an age, a recorded relationship) that agrees.

The OCR is also poor enough that names are frequently mangled
("R. L. Saunders" appears as "K. L. Saunders"; "Myers" as "Meyer"). Counts in
the table are search hits, not verified mentions.

### NEXT

1. **Match initials to person_ids**, with corroboration, starting with
   F. J. Beans, C. W. Warner, G. T. Schooley, G. W. Laycock and W. N.
   Everhart.
2. **Harvest the social columns systematically** for kinship statements - the
   single richest source of relationship edges found in this project.
3. Page past result 20 (`&st=21`, `&st=41`) for the common surnames.

---

## F. J. BEANS, UNDERTAKER — AND A CAUTION ABOUT THE FRY HOUSE, 26 Oct 2026

Curtis reports that his neighbour directly across the street says that house
was the town funeral home, and that old mortuary equipment was found in it.
He also reports his own house was owned by someone named **Fry**.

### THE BEANS IDENTIFICATION — STRONG, NOT PROVEN

**In the project already:** `LV1034 Flavius J. Beans, b.1845, d.1932,
buried at LAKEVIEW.` The town undertaker is one of the interred.

**In the Hamilton Weekly Enterprise:**

> **F. J. BEANS, Undertaker, HAMILTON, VA. An Experienced Funeral Director**

**In the Blue Ridge Herald, 4 August 1932:**

> **FLAVIUS BEANS DIES AT WATERFORD.** Flavius Beans, aged 85 years, ...

And on 11 August 1932: *"CARD OF THANKS. Mrs. Flavius Beans wishes to express
the gratitude of herself and ..."* — he left a widow.

Age 85 in August 1932 implies birth about 1846–47; the project has 1845.
Consistent within the usual slack of a reported age.

**WHAT IS NOT ESTABLISHED.** No line found in any paper calls *Flavius*
Beans an undertaker. The match rests on initials + surname + town + period,
plus his being the only F. J. Beans in 2,732 records. That is the same class
of inference that produced the DAR matcher errors, and it is recorded as a
**candidate**, not applied to `timeline_people.csv`.

Two specific cautions:

1. **He died at WATERFORD, not Hamilton.** That may mean a late-life move, or
   dying at a relative's house, or that the undertaker and the decedent are
   different men.
2. **A second Beans died the same month** — Blue Ridge Herald, 18 Aug 1932:
   *"RETIRED FARMER DIES. G. T. Beans, retired farmer, 75 years of age."*
   Do not conflate.

**There was also a competitor:** *"JOHN B. CORNWELL, UNDERTAKER,
PURCELLVILLE, VIRGINIA."* Burials in these three cemeteries were not
necessarily all handled by Beans.

### ON THE NEIGHBOUR'S HOUSE

The newspaper places an undertaker named Beans **in Hamilton** across the
Weekly Enterprise's run. It does **not** place him at any address. Local
testimony plus mortuary equipment plus a Hamilton undertaker named Beans is
good corroboration, but **the paper cannot locate the funeral home**, and
nothing here should be written down as the building's identification.

### ON FRY — AND A TRAP

Fry / Frye in the project:

| id | name | dates | cemetery |
|---|---|---|---|
| **HM0229** | **Foster B Fry** | **1840-03-04 – 1919-08-06** | **Harmony** |
| LV0447 | Clarence C. Frye | 1940 – 1941 | Lakeview |
| LV1696 | Careline Virginia Frye Putman | 1909 – 1979 | Lakeview |
| PV0086 | Robert Lee Frye | 1939 – 1976 | Pleasant Valley |
| PV0282 | Charles Henry Frye | 1948 – 2016 | Pleasant Valley |
| PV0292 | Gertrude Moore Frye Johnson | 1942 – 1960 | Pleasant Valley |
| PV0325 | Mamie Gertrude Campbell Murphy Frye | 1914 – 1980 | Pleasant Valley |

**Foster B Fry is the only Fry at Harmony or Lakeview of an era that could
own a house in the 1800s.** But "mid-century previous" is ambiguous between
the mid-1800s and the mid-1900s, and **no property record was consulted** —
this is a name match and nothing more.

**THE TRAP:** four of the seven are at **Pleasant Valley**, which the county
flags `CM_AFFILIATION = African-American`. The Pleasant Valley Fryes are a
separate family from the Harmony/Lakeview Frys. A surname match across those
two cemeteries is **not** evidence of one family, and the build must not join
them.

### THE RIGHT SOURCE FOR BOTH HOUSES

Neither question is a newspaper question — they are **land record**
questions. Loudoun County deed books and the county's parcel database would
give chain of title by parcel, naming owners and dates for both houses
directly. That also remains the best route to the Harmony parking-lot date.
No address was looked up; none was given, and none is needed until Curtis
asks.

---

## THE OTHER LOUDOUN PAPERS — THE GAPS ARE COVERED, 26 Oct 2026

Curtis asked whether other local papers cover the Weekly Enterprise's gaps.
**They do, comprehensively, and the Enterprise turns out to be a rounding
error in the available material.**

### TWELVE DIGITISED LOUDOUN PAPERS — `data/loudoun_papers.csv`

| code | paper | place | span | issues |
|---|---|---|---|---|
| GL | Genius of Liberty | Leesburg | 11 Jan 1817 – 5 Oct 1839 | **1,178** |
| LSBS | Leesburg Spectator | Leesburg | Jul–Aug 1825 | 2 |
| LGL | Leesburg Genius of Liberty | Leesburg | 12 Oct 1839 – 20 May 1843 | 179 |
| MIR | Mirror | Leesburg | 7 Jan 1875 – 7 Aug 1902 | **1,302** |
| **TWEP** | **Weekly Enterprise** | **HAMILTON** | 9 May 1890 – 24 Aug 1923 | **113** |
| WM | Washingtonian-Mirror | Leesburg | 16 Apr 1903 – 11 Jan 1906 | 84 |
| MIRR | Mirror | Leesburg | 1 Feb 1906 – 7 Mar 1907 | 30 |
| LM | Loudoun Mirror | Leesburg | 4 Jun 1908 – 29 Dec 1921 | 316 |
| LDT | Loudoun Times | Leesburg | 20 Nov 1918 – 30 Oct 1924 | 154 |
| BRHR | Blue Ridge Herald | Purcellville | 4 Sep 1930 – 8 Aug 1957 | **1,361** |
| LNS | Loudoun News | Leesburg | 17 Dec 1936 – 8 Jan 1953 | **838** |
| MBC | Middleburg Chronicle | Middleburg | 17 Sep 1937 – 25 Jun 1943 | 89 |

**5,646 issues in total. The Weekly Enterprise is 113 of them — 2 percent.**

### EVERY ENTERPRISE GAP IS COVERED

| Enterprise hole | filled by |
|---|---|
| 1898, 1901 | **Mirror** (Leesburg), 1,302 issues |
| 1905, 1906 | Washingtonian-Mirror; Mirror (1906–07) |
| 1907, 1908 | Mirror (to Mar 1907); **Loudoun Mirror** (from Jun 1908) |
| 1910, 1912–15, 1917–21 | **Loudoun Mirror**, 316 issues |
| 1918–21 also | **Loudoun Times** |

**All 481 people who died 1890–1923 have a non-Enterprise Loudoun paper
covering their death year.** Not one of them is out of reach for lack of a
paper. The earlier conclusion that only 46 were reachable was an artefact of
searching one title.

Across 1817–1957: **1,167 of 1,356 deaths in this project — 86 percent — fall
in a year some Loudoun paper covers.**

### THE TWO REAL VOIDS

- **1844–1874. Thirty-one years, no digitised Loudoun paper at all.** The
  Leesburg *Genius of Liberty* ends 20 May 1843; the *Mirror* does not begin
  until 7 January 1875. **75 people in this project die inside it, and it
  swallows the entire Civil War and the Burning Raid.** This is why the state
  death register (1853–66) is the only substantial source for that period —
  and why its 1860–63 gap hurts so much: for those four years there is
  neither a register nor a newspaper.
- **1925–1929.** Five years, **114 deaths**. The *Loudoun Times* ends Oct 1924
  and the *Blue Ridge Herald* does not start until Sep 1930.

### A CORRECTION TO THIS README'S OWN EARLIER CLAIM

The era `doc-blackout` was written as **"1822–1852 — thirty-one years with no
source of any kind."** That is **wrong as a statement about surviving
sources.** It is true only of *this project's extraction*. The *Genius of
Liberty* is digitised for 1817–1839 (1,178 issues) and the *Leesburg Genius
of Liberty* for 1839–1843 (179 more).

`context_eras.csv` has been corrected: `doc-blackout` is relabelled **"No
source IN THIS PROJECT (newspapers exist)"**, and a new era
**`doc-newspaper-void` (1844–1874)** records the real void.

### WHAT THIS CHANGES

1. **The obituary run should be re-scoped.** It was capped at 46 people by
   Enterprise issue coverage. The real ceiling is 481 for the 1890–1923 cohort
   and 1,167 across 1817–1957.
2. **The Mirror (1875–1902, 1,302 issues) is the single densest source for the
   project's worst cause-of-death gap.** 0 of 2,732 people who died in that
   window carry a cause.
3. **The Genius of Liberty (1817–1843) can extend the project backwards.**
   The project's newspaper abstracts stop at 1821; 1,357 issues sit unread
   between 1822 and 1843.
4. **Hamilton-specific local news still needs TWEP** — the Leesburg papers
   carry county news, but the town column is the Enterprise's.

### Data changes

- **NEW** `data/loudoun_papers.csv` — 12 rows.
- `context_eras.csv` **21 → 23**: `doc-blackout` corrected,
  `doc-newspaper-void` (1844–1874) added. Documentation layer now 9.
- `APP_SPEC.md`: new **§6.8**; §6.6's documentation-layer bullets corrected;
  acceptance counts updated.

---

## THE OTHER PAPERS, AND HAMILTON'S EPIDEMICS — 26 Oct 2026

### 1. ARE THE INTERRED IN THE OTHER PAPERS? YES, BUT THE YIELD IS LOW

The Mirror (Leesburg) covers 1875–1902 with **1,302 issues**. In that window
the project holds **215 deaths — 114 Lakeview, 101 Harmony — and exactly ONE
carries a cause of death.** It is the single best-stocked gap in the dataset.

**A 14-person pilot against the Mirror returned 1 confirmed hit.**

> **SUDDEN DEATH.** Mr. John Iden, a well-known citizen of this county,
> died at his ...
> — *Mirror* (Leesburg), **9 December 1875**

**LV0549 John T. Iden, d. 4 December 1875** — published five days after
death, surname and county match. Added to `newspaper_findings.csv` (now 7).
**"SUDDEN DEATH" is itself a cause indication.**

Why the other 13 missed: seven returned **zero hits** for the surname in a
35-day window, which means the name does not appear at all, not that the
obituary was buried in the results. 1870s–80s letterpress OCRs far worse than
1900s print, and names break apart.

**Two of the misses are worth noticing on their own.** HM0251 *A Sinkfield*
(d. 1876) and HM0253 *Clara Mae Sinkfield* (d. 1878), both at Harmony, both
returned **0 results**. Caroline Sinkfield (d. 1916) also returned 0 earlier.
**NOT TESTED, but worth testing:** whether Black decedents at Harmony are
systematically absent from the white county papers. If so, that absence is
itself a finding, and it would match the register's silence documented in
`doc-state-register`.

### 2. HAMILTON'S EPIDEMICS — YES, AND THEY ARE IN THE TOWN'S OWN PAPER

New file: **`data/hamilton_health_news.csv`**, 10 dated reports.

**The town reporting its own sickness, 31 October 1890:**

> *"... is at this time lying very low with typhoid fever.*
> ***Some mild cases of scarlet fever in town.***  *Quite ..."*

**12 February 1892** — a child: *"... and a favorite among his schoolmates.
His disease was scarlet fever ..."* The name is not recoverable from the
snippet.

**18 August 1916** — water filtration argued locally: *"... filtered water, or
water of equal purity, the urban typhoid fever death rate would be 14 per
100,000 ..."*

**AND THEN 1923, WHICH IS THE REAL FIND.**

| date | report |
|---|---|
| **20 Apr 1923** | *"The Medical Director has already begun his campaign against Diphtheria. **The Sanitary Officer has already begun sanitating the schools** ..."* |
| 27 Apr 1923 | *"Loudoun County Health Unit applied the **Schick test** for Diphtheria to a large number of children at the Aldie ..."* |
| 25 May 1923 | *"**Tests Show Many Children Susceptible To Diphtheria.** The work for Diphtheria prevention in five of the ..."* |
| 15 Jun 1923 | *"**Protect Your Children Against Diphtheria.** The parents of Leesburg will have an opportunity to ..."* |
| 29 Jun 1923 | *"**Four Cases Of Typhoid Fever in Loudoun.** There are four cases ..."* |

**In ten weeks of 1923 the Loudoun County Health Unit is testing children,
sanitising schools, offering immunisation and COUNTING typhoid cases.** This
is the point where bacteriology stops being national news in the event layer
and becomes something happening to children in this county. Added to
`context_events.csv` as a `medical` event; the file is now **127 events**,
medical layer **22**.

### A CORRECTION I ALMOST PUBLISHED

The 5 May 1923 snippet reads *"...a teacher, is temporarily closed on account
of an epidemic of diphtheria."* I nearly reported a Hamilton school closure.
The full line is:

> *"Stuart Trainham is home from **Marshall** as the school there, in which
> she is a teacher, is temporarily closed on account of an epidemic of
> diphtheria."*

**The closed school was at Marshall, in Fauquier County, not Hamilton.** A
Hamilton-area teacher came home because of it. Recorded with that warning
attached.

### HOW THE SEARCHES BEHAVED

- **`ccq=Loudoun (VA)` DOES NOT RELIABLY RESTRICT RESULTS.** A county-filtered
  search for Hamilton + disease terms returned the Northampton Times,
  Free Lance-Star and Calhoun Chronicle. **Use `puq=<CODE>` per title.** The
  earlier obituary run's county filter should be treated as unverified.
- Multi-word queries behave as loose phrase matches under `txf=txIN`, so
  "Hamilton diphtheria" mostly finds people surnamed Hamilton. **Search the
  disease term alone against the Hamilton paper** — any hit is local by
  construction.

### WHAT TO DO NEXT WITH THIS

1. **The Mirror, 1875–1902, is still the prize** — 215 deaths, 1 cause, 1,302
   issues. The pilot's 1-in-14 is a floor, not a ceiling: paging past result
   20 and trying given-name variants should lift it.
2. **Test the Sinkfield observation.** If Black decedents at Harmony are
   absent from the white papers, that belongs in the documentation layer.
3. The 1890 and 1892 scarlet fever reports **name no one recoverable**. The
   underlying page images would, and they are viewable.


---

## CAUSE-OF-DEATH COUNTS — TWO FIGURES, RECONCILED, 26 Oct 2026

Earlier sections say **dysentery 141**. The infographic says **dysentery 154,
consumption 155**. Both are right; they count differently.

- **141** is an exact-string count of the cause field as transcribed.
- **154 / 155** fold the register's spelling variants together — *dysentary*,
  *disentery*, *consumtion*, *consump.* and so on — which is the honest total
  for the disease.

Normalised top causes, 1,403 register entries, 1,123 with a cause:
consumption 155 · dysentery 154 · typhoid fever 84 · old age 74 ·
pneumonia 64 · dropsy 52 · croup 43 · inflammation 31 · whooping cough 24 ·
paralysis 22 · scarlet fever 19 · diphtheria 18 · cancer 15.

**Use the normalised figures from here on.** The one claim that survives
unchanged: every dysentery entry falls between 1853 and 1866.

## THE INFOGRAPHIC — `video/infographic/`

`hamilton_infographic.mp4` — four minutes, 1280×720, eight scenes. Built as a
canvas page, `hamilton.html`, with a deterministic `window.render(t)`;
`capture.js` steps it through Playwright at 24 fps and ffmpeg encodes. Palette
is the dataviz reference instance in dark mode, validated by the skill's
script before any chart was drawn. Every data constant in the page carries a
SOURCE comment naming its CSV.

## 1900 census — Hamilton ED 55, full occupation read (2026-10-26)

Source: FamilySearch, United States Census 1900, Virginia › Loudoun › ED 55 "Mt. Gilead District Hamilton town", 24 images, read
one page at a time in the browser (Curtis signed in; no bulk access). Enumerated 1–18 June 1900.

- `data/census_1900_hamilton.csv` — 1,142 people, every line of the 24 images, with occupation transcribed from the page
  (the FamilySearch index does NOT carry occupation). Columns: image, line, dwelling, surname, given, relation, race, sex, age,
  occupation, note. Dwelling numbers `T1…T83` are inside the corporate limits; plain numbers are the surrounding district.
- The enumerator wrote on sheet 8B: *"Here ends the enumeration of all the territory outside the limits of the corporation of
  Hamilton town"* (image 16) and on sheet 12B: *"Here ends the enumeration of Hamilton Town"* (image 24). So images 1–16 = rural
  ED 55 (~800 people), images 17–24 = incorporated Hamilton (~340 people).
- `data/census_1900_index_raw.txt`, `data/census_1900_index_images3to24.txt` — the FamilySearch image-index names/ages used to
  anchor the line-by-line read.
- `data/census_1900_matches.csv` — 119 census people matched to the interred list on surname + first given name + birth year ±2
  (111) or name only where the index gave no age (8, low confidence — includes two Black "Lakeview" name-only hits that are
  probably namesakes, LV0272 and LV2042). 3 ambiguous left unmatched. Cemeteries: Lakeview 109, Harmony 7, Pleasant Valley 3.
- `timeline_people.csv` gained `census_1900_occupation`, `census_1900_zone`, `census_1900_match` for those 119.

### What 1900 looks like (404 people with a stated occupation, excluding "At School")
Rural ED 55 (287): Farmer 86, Farm Laborer 87, Day Laborer 54, Servant 26, then single digits — teachers 4, washwomen 4,
carpenters 3, dressmakers 3, two saw-mill engineers, two stone masons, two clergymen, two blacksmiths.
Town (117): Day Laborer 17, Servant 13, Carpenter 8, Boarding House 5, Dressmaker 4+1+1, Preacher 4, Tinner 3, Dry Goods
Clerk 3, Dry Goods Merchant 3, Butcher 3, plus one each of physician, dentist, veterinary surgeon, druggist, jeweller,
machinist, wheelwright, shoemaker, undertaker, milliner ×2, newspaper editor, printing foreman, type setter ×2, compositor,
postmaster, asst postmaster, post office clerk, town sergeant, hardware merchant, grocer, livery man, hostler, drummers ×2.

By race: rural Black workers (103) are 39 farm laborers, 28 day laborers, 20 servants, 4 washwomen, 4 farmers, 2 stone masons;
rural white (184) are 82 farmers, 48 farm laborers, 26 day laborers. Town Black workers (21): 9 servants, 8 day laborers, 1
preacher (Simon Fisher), 1 nurse, 1 washwoman, 1 housekeeper. Town white (96) hold every trade, shop and profession.

### Interred with a 1900 occupation (53)
Farmer 10, Farm Laborer 6, Carpenter 4, Day Laborer 3, and one or two each of blacksmith, mill laborer, tinner, dressmaker,
teacher, dry-goods merchant, butcher, livery man, painter, hardware merchant (C. W. Warner), undertaker (Arthur L. Hough —
reading faint, verify), wheelwright, shoemaker, printing foreman, nurse, grocer, type setter, carriage agent, boarding house,
medical student, jeweller, physician (Thomas F. Keen).

Readings flagged "uncertain" in the note column: Dowell "Type Setter", Crockett "Canvasser (Insurance)", Everett "Market man",
Milton "Carriage Agent", Chalmers "Examiner Dept Justice", Hough "Undertaker". Index-vs-image disagreements noted inline
(Alberta Brown 21→1; Luther/Lester Furr 27/25→7/5).

## 1940 census — Hamilton town, both parts, full occupation read (2026-10-26)

In 1940 the incorporated town is split across two magisterial districts and therefore two EDs:
- **ED 54-21** "Mount Gilead Magisterial District, Hamilton Town (part)" — 8 images, 304 people, 98 households, enumerator
  Anne G. VanDeventer. 299 white, 5 Black (Daisy Chinn and children). Ends "End of Hamilton Incorporated."
- **ED 54-4** "Jefferson Magisterial District, Hamilton Town (part)" — 3 sheets (+1 blank), 105 people, 25 households,
  enumerator Patience A. Purcell, 29 April 1940. **95 Black, 10 white.** This is the west end of town — West Virginia Avenue /
  "The Hill" in the county's Historic Communities layer.

So Hamilton town in 1940 = 409 people, 100 Black (24%), and the Black population is almost entirely in one ED.

Files: `data/census_1940_hamilton.csv` (409 rows; image J1–J3 = ED 54-4), `data/census_1940_index_ED54-21.txt`,
`data/census_1940_index_ED54-4.txt`, `data/census_1940_matches.csv` (84 interred matched: Lakeview 70, Pleasant Valley 14; 83
on name + birth year). `timeline_people.csv` gained `census_1940_occupation/industry/class/match`.

### 1940 occupations (145 stated)
White (106): Laborer 23 (painter ×6, farm, grain mill, auto garage, plumber, laundry, floor sanding…), Salesman 13 (grocery,
clothing, automobiles, radio, insurance, nursery, feed), then farmers 5, clerks 3 (bank, Social Security, U.S. Govt), carpenters 3,
two ministers (Baptist, Methodist), a medical doctor, a registered druggist, a dentist is gone, an auditor at Treasury, a Navy
Yard employee, a station agent on the electric railroad, postmistress and assistant postmaster, two newspaper pressmen and a
rural supervisor for the *Evening Star*, a tree surgeon, a music teacher, two public-school teachers.
Class of worker: 65 wage (PW), 28 own-account (OA), 11 government (GW).

Black (39): Farm Laborer 14 (most "26 weeks, $234, seeking work 39 weeks"), House Help/House Work/House Boy/House Man/Maid/
Cook/Housekeeper 15, Laborer at the flour mill 2, janitor at the public school, boiler operator at the slaughter house, truck driver
for the milling company, caretaker of a private estate, cemetery caretaker (William Lewis, 63 — likely Lakeview's sexton),
laundress, odd jobs, and **one teacher (Theodora Ross, 40, born DC, lodger)**. Class: 36 wage, 2 government, 1 own-account.

### 1900 → 1940, the same town
- Farmers in town: 2 → 5 (and the rural ED is gone from the comparison, since 1940 EDs follow town limits).
- "Laborer" replaces "Day Laborer" and now carries an industry: painter, mill, garage, plumber, road.
- Retail salesman is the new white male default (13). Three dry-goods merchants of 1900 → two grocers, a clothing merchant, a
  trading store, and a dozen employees.
- Government work appears: Social Security clerk, Treasury auditor, U.S. Govt clerk, Navy Yard, county assessor, road maintenance,
  school bus driver — 13 of 145 workers. Washington is 40 miles away and the W&OD electric line stops in town.
- Black occupations: 1900 town — 9 servants, 8 day laborers, 1 preacher, 1 nurse. 1940 town — 14 farm laborers, 15 domestic, 2
  mill laborers, 1 teacher. The structure is unchanged in forty years; the one new thing is the teacher, and the cemetery caretaker.
- Eight people appear in both censuses as residents: Thomas R. Preston (1 → laborer at the nursery, 67), George Edwin Thomas
  (mill laborer 31 → county assessor 71), Lawrence H. Johnson (age 5 on his father's rented farm → flour-mill laborer, 45, owns
  his house, $900), Alice M. Norris (school teacher 44 → 86), Nora Thomas Myers (widow 30 → 70), Bessie Myers, Mary Francenia
  Brown, Margaret Virginia McFarland (grocer's daughter 11 → 55).
- Charles F. Johnson, Black, farmer *renting* in 1900 (image 3), is in 1940 a farm laborer aged 67 who **owns a $2,000 house** —
  the most valuable Black-owned dwelling in the ED.

Readings flagged uncertain: none material; a few wage figures in ED 54-4 are hard to read and left blank.

## 1910 census — Hamilton Town (2026-10-26)

ED 71, Mt Gilead district: images 1–7 are the incorporated town (315 people, 91 households, enumerator George E. Thomas — himself
hh 81, "Auctioneer, Commission"); image 8 blank; images 9–34 are the rural remainder of ED 71 (index saved to
`data/census_1910_index_ED71.txt`, pages not read). Files: `data/census_1910_hamilton.csv`, `data/census_1910_matches.csv`
(81 matched: Lakeview 75, Harmony 6; 78 on name+birth year).

Town in 1910: 281 white, 26 Black, 8 "Mu" (mulatto). 114 stated occupations excluding "Own Income" (the 1910 enumerator's term for
the retired/rentier — 14 of them, nearly all elderly widows and the Iden sisters).
White (92): Salesman 10, Laborer 8 (odd jobs, livery stable), Farmer 7, Farm Laborer 6, Teacher 6, Butcher 5 (the Myers shop plus
Flippo's "country shop"), Carpenter 4, Merchant 8 (dry goods ×3, grocery, hardware, feed & flour, clothing), Trained Nurse 3,
Dressmaker 3, Miller 3 + a mill manager, Tinner 2, Minister/Clergyman 3, and one each: pharmacist, physician, veterinarian,
undertaker (Arthur S. Hough — confirms the faint 1900 reading), jeweler, wheelwright, blacksmith, shoemaker, saddler, apiarist,
hotel proprietor (Orion Baldwin), newspaper editor (George E. Leith), traction-engine engineer, music teacher, church janitor.
Black + mulatto (22): Servant 13, Laborer 3, Laundress 3, Farm Laborer 2, Wagoner at the flour mill 1. No Black trade, shop or
clerk, same as 1900 and 1940.

Firsts: Jacob and Lena Schafer, Russian-born (German-speaking) dry-goods and grocery merchants with nine children, are the first
immigrant family in the town enumerations; George Wilson, retired hat manufacturer, born Scotland; Edward Aston, ditcher, born
England. The McCormick children were born in Mexico (father a minister).

## 1920 census — Hamilton Town (2026-10-26)

ED 75, Mount Gilead district, sheets 1A–3B (images 1–6 of 22): "Here Ends the Enumeration of the Incorporated Town of Hamilton."
287 people, 78 households, enumerator Gordon G. Morland, 2–10 January 1920. Images 7–22 are the rural remainder (index only).
Files: `data/census_1920_hamilton.csv`, `data/census_1920_matches.csv` (67 matched: Lakeview 64, Harmony 3).

**Caveat on the Black count.** The 1920 town enumeration holds only 12 Black residents (275 white). 1910 had 26 + 8 mulatto,
1940 had 100. The 1940 figure includes ED 54-4, the Jefferson-district (west) end of town; in 1920 that end was presumably
enumerated under Jefferson district, not in ED 75. So the 1920 town file is the Mount Gilead half only, and the 1920 Black
population of the whole town is NOT 12. The same caveat may apply to 1910 (ED 71 is also Mt Gilead) — to be checked against the
Jefferson EDs for 1910 and 1920.

1920 occupations (106): White (94) — Laborer 17 (farm 15, milling 1), Farmer 13, Merchant 7 (hardware ×2, dry goods, clothing,
jewelry, meat, general store), Carpenter 5, Plumber 4 (new — three young men plus Elton Tribby the former saddler), Teacher 4,
Nurse 3, Minister/Clergyman/Evangelist 5, Salesman 3, Doctor 2 (Claggett, Sydnor), bank cashier, telephone operator and telephone
manager (new), two garage machinists and a garage partner (new), chauffeur for the milling company (new), mail carriers 2,
postmaster (Mervyn Herndon, dry-goods merchant in 1910), insurance agent (John W. Chamblin, merchant in 1900/1910), undertaker
and assistant undertaker (the Houghs), druggist, cobbler, type setter, produce buyer, milliner, beekeeper, threshing-machine
engineer. Class: 73 wage, 32 own-account, 1 employer.
Black (12): Laborer (farm) 6, Cook 4, Servant 1, Laundress 1.

What's new since 1910: plumbers, garage, telephone, bank, chauffeur — the automobile and the wire arrive; the butchers, saddler
and wheelwright go. Charles W. Warner, hardware merchant 1900–1910, is an "Evangelist, Methodist" boarding with his former
clerk, who now owns the hardware store.

## 1930 census — Town of Hamilton, ED 54-17 (2026-10-26)

In 1930 Hamilton is its own township in the FamilySearch tree. ED 54-17, 6 images, 295 people, 88 households, enumerator Stella
M. Collins, April 1930: "Here Ends the Enumeration of the Town of Hamilton." Files: `data/census_1930_hamilton.csv`,
`data/census_1930_matches.csv` (76 matched, all Lakeview; 74 on name+birth year).

**Only 4 Black residents**, all live-in servants — Virginia Cross 17, Dorothy Cross 18, and in Henry J. Hoge's household **William
Sinkfield, 80, gardener, and Octavius Sinkfield, 66, cook**. The Sinkfield absence test from the pending list is answered: two
Sinkfields were in town in 1930, as servants. The Black west end is again outside this ED (same pattern as 1920; the 1940 count of
100 comes from ED 54-4 under Jefferson district). The 1930 and 1920 Jefferson EDs need reading to complete the Black series.

1930 occupations (113). The telephone exchange is the new employer of women: 5 operators plus a chief operator (Bessie Myers, widow,
owns a $7,000 house) and a "trouble man" on the line. Government and quasi-government: commissioner of revenue (George E. Thomas),
state-road patrolman, state-road traffic inspector, post-office register clerk, assistant postmaster + postmistress (the Orrisons),
rural mail carriers 2, revenue secretary, government file clerk, Navy Yard machinist, W&OD relief agent and bookkeeper (the Beales),
B&O engineer. Trades: carpenters 6, plumber, blacksmith (Henry Mock), tinsmith, stone mason, cabinet maker, paper hanger, painters 2,
shoemaker, furniture repair. Shops: grocery (Kidwell; Laycock partners; chain-store manager aged 17), hardware (Saunders; Schooley),
dry goods (Wiley), meat (Flippo; Tavenner), drug store (Kerr), garage ×2, apiary, nursery agent, florist/greenhouse, orchardist,
elevator mill (Rogers partner; Herndon manager; Flippo miller). Professions: doctors 2, pastors/ministers 4, teachers 5 (one "physical
culture", one music), practical nurse, hospital assistant. Class: 74 wage, 38 own-account, 1 employer.

## 1910 census — Mt Gilead rural (ED 71, images 9–18, 25, 27, 29–32)

`data/census_1910_hamilton.csv` now carries 891 rows: 315 from the incorporated
town (ED 71, images 1–7, image codes `1`–`7`) and 576 from the countryside that
surrounds it (ED 71, images 9–18, 25, 27, 29–32, image codes `R9`–`R32`,
sheets 5A–9B, 13A, 14A, 15A–16B). All of it was enumerated by **George E. Thomas**
between 18 April and 5 May 1910 — the same man who turns up in the project's own
burial list, and who by 1940 was the county assessor.

**Where the Black west end was in 1910.** In 1920, 1930 and 1940 the Black
households at the west edge of Hamilton were enumerated in a separate Jefferson
district ED, with margin notes reading "West Edge of Hamilton Town." No such
block exists in 1910. Jefferson district that year had only two EDs:

- **ED 61** is Purcellville (enumerator Clifton M. Warner): Copeland, Brent,
  Ford, Dorrell, Poston, Colbert, Reid, Huff, Willingham, Bach, Carlisle,
  Flaherty, Hern, Reynolds, Larrick, Ballenger, Carruthers, Mock, Clothier,
  Hurst, Hall. Its Black neighbourhood (images 6–8: Waters, Rodney C. Clark,
  Turner, Scipio, Levenberry, Anderson, Fletcher, Parrott, Jackson, Williams,
  Grimes, Ashby) belongs to Purcellville, not Hamilton. Checked and set aside.
- **ED 62** is Waterford Town plus rural Jefferson. Its first sheets are headed
  "Name of incorporated place: Waterford Town."

So in 1910 Hamilton's Black families were still counted with the rural Mt Gilead
pages — interleaved through ED 71 sheets 5A–9B rather than grouped as a separate
west-end block. The distinct "west edge" enumeration first appears in 1920.

### Black occupations in the 1910 Hamilton orbit

212 of the 576 rural rows are Black or mulatto — more than a third of the
countryside. Their recorded work:

| Occupation | Count |
|---|---|
| Farm laborer | 32 |
| Servant (private family) | 23 |
| Laborer / odd jobs | 17 |
| Laundress | 12 |
| Farmer | 6 |
| Stone mason | 1 |
| Barber (own shop) | 1 |
| Retail merchant (grocery) | 1 |
| Gardener (vegetable garden) | 1 |

Five Black households own their land outright. **Hamilton W. Wood**, 68, farms
his own place (sheet 6B, farm 25). **Lewis Jones**, 60, born in Maryland, owns
farm 40. **Nelson Jones**, 62, owns farm 91. **Lee Bryant**, 57, owns farm 114;
**David E. Bryant**, 31, owns farm 103. **Daniel Gordon**, 36, rents farm 47 and
is entered as a farmer in his own right rather than a laborer.

Three Black men are in business for themselves:

- **James B. Levenberry**, 48, *barber, own shop* (sheet 5A) — the same trade
  Marshall Randolph would be running at the west end in 1920 and 1930.
- **Daniel T. White**, 23, *retail merchant, grocery store* (sheet 7B) — a Black
  grocer, renting, a decade before the town EDs show any Black proprietor at all.
- **James N. Swann**, 59, *gardener, vegetable garden*, own account, owns his
  home (sheet 9A).

Inside the incorporated town, by contrast, the 26 Black residents are servants
(8), laborers (3), laundresses (3) and farm laborers (2) — nothing else. The
colour line in the town's occupation column holds in 1910 exactly as it does in
every other decade read so far; the Black trades and shops sit just outside it.

### Other notes from the 1910 rural pages

- **Foster B. Fry**, 68, widower, owns his home on sheet 8A and is entered as a
  *servant, private family*. His daughter **Ella V. Robinson**, 45, widow, is a
  laundress; grandsons James (26) and Stanley (9) are in the household. Fry is
  buried at Harmony; Ella and Stanley at Pleasant Valley.
- **Allison Cravens**, 75, and his wife Alcinda, 75, own their home; their
  grandson Nathan D. Price, 34, is a farm laborer.
- **Charles F. Johnson**, 38, is a renting farm laborer on sheet 6A with eight
  children, two of them (15 and 14) already working out. By 1940 he owns a
  $2,000 house in town.
- **James M. Corbin**, 52, blacksmith in his own shop (sheet 16A), with son
  **Eugene W. Corbin**, 30, a printer on the weekly paper — the *Loudoun
  Telephone*/*Hamilton Enterprise* world in one household.
- **Annie T. Peugh**, 25, and **Daisey V. Tavenner**, 22, both teach public
  school; **Minnie L. Thompson**, 60, teaches in a private family. Teaching is
  the only professional occupation open to women on these pages.
- **Flavius J. Beans**, the town undertaker, is *not* on the Mt Gilead pages;
  he and the Hough undertaking family appear in the town ED and in ED 62.

### Coverage caveat

ED 71 images 19–24, 26, 28, 33–34 (sheets 10A–12B, 13B, 14B, 17A–17B) were not
transcribed — they run out toward Mt Gilead itself and carry no interred
matches. ED 71 images 20 and 26 are not indexed by FamilySearch at all.

## Census occupation coverage, all five decades

| Decade | Interred matched | …with a recorded occupation |
|---|---|---|
| 1900 | 119 | 65 |
| 1910 | 138 | 64 |
| 1920 | 75 | 33 |
| 1930 | 100 | 40 |
| 1940 | 84 | 30 |

**324 of the 2,732 interred** now appear in at least one federal census read for
this project; **154** carry at least one occupation. 124 appear in two or more
censuses, 50 in three or more, 15 in four or five.

### Careers traced across three or more censuses

| Person | Cemetery | Arc |
|---|---|---|
| George Edwin Thomas (1868–1944) | Lakeview | mill laborer 1900 → auctioneer 1910 → county assessor 1940 |
| George T. Schooley (1860–1932) | Lakeview | blacksmith 1900 → farmer/blacksmith 1910 → merchant 1920, 1930 |
| Harry Flippo (1890–1971) | Lakeview | at school 1900 → butcher 1910 → typesetter 1920 → operator 1930 |
| James Edgar Tavenner (1867–1931) | Lakeview | carpenter 1900, 1910, 1920 → repair worker 1930 |
| William Thomas Tavenner (1871–1939) | Lakeview | day laborer 1900 → laborer 1910 → butcher 1920, 1930 |
| Joseph E. Beales (1855–1933) | Lakeview | mill laborer 1900 → miller 1910 → relief agent 1930 |
| Robert L. Saunders (1862–1939) | Lakeview | salesman 1910 → merchant 1920 → proprietor 1930 |
| John S. Rhodes (1903–1964) | Lakeview | laborer 1920 → painter 1930 → painting contractor 1940 |
| Thomas R. Preston (1872–1964) | Lakeview | farm laborer 1900, 1910 → florist 1930 → laborer 1940 |
| Charles F. French (1846–1928) | Harmony | jeweller 1900, 1910 → merchant 1920 |
| Arthur S. Hough (1864–1920) | Lakeview | undertaker 1900, 1910, 1920 |
| Alice M. Norris | Lakeview | schoolteacher 1900, 1910, 1920 |
| Welby S. Arnett (1855–1939) | Lakeview | farmer 1900 → laborer 1910 → farmer 1920 |
| Lawrence H. Johnson (1894–1940) | Pleasant Valley | farm laborer 1910 → laborer 1920, 1930, 1940 |

The last row is the pattern in miniature. Lawrence Johnson was fifteen and
working out on his father's rented place in 1910; thirty years and three
censuses later he was still entered as "laborer," and he died that same year at
forty-six. Beside him, George Thomas went from the mill floor to the county
assessor's office over the same span. Both men are buried three miles apart.

## 1950 census — Hamilton Store, Harmony, and Mount Gilead District

FamilySearch collection **4464515**. Unlike 1900–1940, the 1950 index **carries
occupation as free text**, so this decade was read from the search index's data
sheet rather than from page images. 871 rows in
`data/census_1950_hamilton.csv`.

The town has two place names in 1950 — **"Hamilton Store"** (165 rows) and
**"Harmony"** (185 rows), with 5 more under plain "Hamilton". Households straddle
the two, so both come back from one query.

Occupations are recorded in the enumerator's own words rather than a standard
code, which makes 1950 the most vivid decade in the set: *Filling Station
Operator*, *Checker And Presser In Dry Cleaners*, *Teller In Bank*, *Clerking In
Post Office*, *Selling Real Estate And Insurance*, *Automobile Master
Technician*, *County Agricultural Agent*, *Radio And Television Service*,
*Teaching Kindergarten*, *Dairy Business And Milk Route*, *Writing For Paper*,
*Post Master*, *Registered Nurse*. A dry-cleaning plant now employs at least five
people in the village; so does the motor trade.

### The 1950 colour line is a line on the map

Of the 355 people enumerated under Hamilton Store and Harmony, **one** is
recorded as Black. That is not because the Black community had gone. In 1950
the Black households of the Hamilton orbit were enumerated under a third place
name, **"Mount Gilead District"**, which holds **531 Black residents** — found by
searching that place with the race facet set to Negro / Neg / Ng. All 531 are in
`census_1950_hamilton.csv` with image code `Mount_Gilead_District`.

So the separate enumeration that began in 1920 as a "West Edge of Hamilton Town"
block had, by 1950, become a separate place name altogether. The village and the
Black neighbourhood beside it are no longer counted as one settlement.

Their recorded work, 1950:

| Occupation | Count |
|---|---|
| Farm helper / farm hand / farm laborer | 62 |
| Maid, house cleaning, housework | 31 |
| Labor / laborer | 27 |
| Construction, carpenter helper, contractor helper, masonry, brick layer | 15 |
| Dairy helper | 4 |
| Cook, helper cook | 3 |
| Butler | 2 |
| Truck driver | 2 |
| Handyman, yard man | 4 |
| Farmer (own account) | 2 |
| Teaching | 2 |
| Stone mason | 1 |
| Janitor, porter | 2 |

Two names carry straight through the project's other decades. **James
Levenbury**, 89, a boarder — the same James B. Levenberry who ran his own barber
shop on sheet 5A in 1910, seventy years old then in his own house, now a widower
boarding in someone else's. **David Bryant**, 71, who owned farm 103 in 1910 at
thirty-one, is still a household head in 1950 with ten grandchildren under his
roof, two of them entered as *Yard Man* at sixteen and nineteen. **Clara
Gordon**, 69, a *Maid* — in 1910 she was the 31-year-old wife of Daniel Gordon,
who rented farm 47 and was entered as a farmer in his own right.

## 1880 census — Hamilton, Districts 55 and 56

FamilySearch collection **1417683**. The 1880 index carries occupation, and
**"Hamilton" is already its own place** five years after incorporation:
**756 people** across Districts 55 and 56, all transcribed in
`data/census_1880_hamilton.csv` — 501 White, 192 Black, 63 Mulatto, with
**642 occupations**.

### How the District 55 gap was closed

The two districts were indexed in separate projects, and the search results'
data sheet drops the Occupation column on any page whose records all come from
the District 55 schema. This looked at first like missing data. It was not: a
search constrained by occupation (`q.occupation=Carpenter`) returns Charles F.
Myers, 53, District 55, *with* his occupation shown. Occupation is fully indexed
for both districts; only the display was dropping it.

The fix was to change which records share a page. Splitting the query by sex —
331 males, 428 females, queried separately — put schema-B records on every page,
and the column rendered throughout. No image reading was needed.

### What the village looked like in 1880

Hamilton is a trades village with a large Black working population living inside
it rather than beside it.

Among the White heads: Bernard Hough, H. Vandebanta, E. H. Tavenner and J. Z.
Shugert, *Merchants*; **Thos. A. Schooley**, 55, *Blacksmith*, with his son
**Geo. T. Schooley**, 19, entered as *Works In Shop* — the same George who is
still a blacksmith in 1900 and a merchant by 1920, learning the trade in his
father's shop at nineteen. The professional and skilled trades are thick on the
ground: *Medical Doctor* (J. R. Bromwell), two *Lawyers* (J. W. Hughes, John
Milmese Hews), *Editor* (Y. T. Brown), *Undertaker* (Jno. F. Warner),
*Silversmith* (Charles F. French), *Tailor* (Jas. H. Muse), *Tanner* (Thos. M.
Weadon), *Harness Maker*, *Tinsmith* and two *Tinners*, *Confectioner*, *Shoe
Merchant* with four *Shoemakers* named Wiley, *Milliner*, two *Mantua Makers*,
*Plasterer*, *Painter*, *Livery Man*, *Mercantile Agent*, *Runs Steam Mill*
(D. G. Corbin), *Works On Rr* (Chas H. Lacey), three ministers, and a
*School Teacher* (Daisy Carter, 24).

Among the Black and mulatto households the overwhelming entry is *Works On
Farm* — Archie Allen, Chas. Fields (household of eleven), Jas. Redman, Adie
Jones, Wm. Collins, Robt Coleman, Wm. H. Wood, Loues Jones, David Morten,
Fenton Stewart, I. W. Jenning, Jos. L. Chamk, Geo. W. Carter, Adam Beaner,
Thos. Pinn, Santfera Coats, Geo. Hughes, L.H. Seldon, Danl Willis, Jas. Payne.
Women are *Servant*, *Cook*, *Housekeeping*, *Nurse*, *Waits On Table*.

Three entries break the pattern:

- **Henry Framil**, 27, mulatto, *Engineer* — married, keeping his own house.
- **Thos. White**, 44, Black, *Farmer* — not "works on farm"; farmer.
- **Manley Fox**, 39, mulatto, *Farmer*.

And the children are in school. The Wood household has three daughters entered
*School*; the Coleman, Collins, Jones, Murry, Beaner, Pinn and Hiegman
households each have school-age children recorded the same way, fifteen years
after emancipation.

Two family threads run forward from here:

- **Wm. H. Wood**, 42, *Works On Farm*, is almost certainly the father of
  **Hamilton W. Wood**, who by 1910 owns farm 25 outright at sixty-eight.
- **Godfrey Friar** (75), **Forrester Friar** (45) and **Foster Fryor** (38) are
  three generations of one family in 1880, all *Works On Farm*. Foster is
  **Foster B. Fry**, 1840–1919, buried at Harmony — who in 1910, at sixty-eight,
  owns his own home on sheet 8A.

## Census coverage, seven decades

| Decade | Interred matched | …with a recorded occupation |
|---|---|---|
| 1880 | 40 | 31 |
| 1900 | 119 | 65 |
| 1910 | 138 | 64 |
| 1920 | 75 | 33 |
| 1930 | 100 | 40 |
| 1940 | 84 | 30 |
| 1950 | 74 | 36 |

**374 of the 2,732 interred** appear in at least one federal census read for this
project. 151 appear in two or more, 69 in three or more, 25 in four or more,
8 in five or more, and one person appears in **all seven**.

### Lives traced across four or more censuses

| Person | Cemetery | Arc |
|---|---|---|
| **Bessie Estelle Myers** (1880–1964) | Lakeview | present in **all seven censuses**, 1880 as an infant to 1950 at seventy; *Operator* 1920 → *Chief Operator* 1930 at the telephone exchange |
| **George T. Schooley** (1860–1932) | Lakeview | *Works In Shop* 1880 (age 19, his father's forge) → *Blacksmith* 1900 → *Farmer / Blacksmith* 1910 → *Merchant* 1920, 1930 |
| **Thomas R. Preston** (1872–1964) | Lakeview | farm laborer 1900, 1910 → *Florist* 1930 → laborer 1940 → *Florists* 1950, still at it aged 77 |
| **Charles F. French** (1846–1928) | Harmony | *Silversmith* 1880 → *Jeweller* 1900 → *Jeweler* 1910 → *Merchant* 1920 |
| **Harry Flippo** (1890–1971) | Lakeview | *At School* 1900 → *Butcher* 1910 → *Type Setter* 1920 → *Operator* 1930 |
| **James Edgar Tavenner** (1867–1931) | Lakeview | *Carpenter* 1900, 1910, 1920 → *Repair Worker* 1930 |
| **William Thomas Tavenner** (1871–1939) | Lakeview | day laborer 1900 → laborer 1910 → *Butcher* 1920, 1930 |
| **Alice M. Norris** | Lakeview | *School Teacher* 1900 → *Teacher* 1910, 1920 |
| **Nora Thomas Myers** (1869–1959) | Lakeview | *Trained Nurse* 1910 → *Nurse* 1920 |
| **Nellie Tavenner** (1877–1952) | Lakeview | *Housekeeper* 1940 → *Taking Boarders* 1950 |
| **Elizabeth Pancoast Chamblin** (1907–1956) | Lakeview | *Teacher* 1930 → *Teaching Music* 1950 |
| **Lawrence H. Johnson** (1894–1940) | Pleasant Valley | *Farm Laborer* 1910 (age 15, working out) → *Laborer* 1920, 1930, 1940; died that year at 46 |

George Schooley and Lawrence Johnson bracket the whole set. Schooley is nineteen
in his father's blacksmith shop in 1880 and a merchant fifty years later.
Johnson is fifteen and working out on his father's rented place in 1910, and
thirty years and three censuses later the enumerator still writes "laborer."

## What is not available after 1950

Individual census returns are sealed for **72 years**. The 1950 census was
released 1 April 2022; **1960 opens in April 2032**, 1970 in 2042. There is no
individual-level census data for this project past 1950. What exists for later
decades is aggregate tables by place and anonymized sample microdata too
geographically coarse to isolate Hamilton.

**Virginia, Death Certificates, 1912–1987** was checked as an alternative. The
collection is excellent for death date, death place, race and parents' names —
George Thomas Schooley's certificate confirms he died at Hamilton on 4 August
1932, son of Thos A Schooley and Hannah Hough, which ties the 1880 household to
the headstone — but **its index does not include an occupation field**.
Occupation appears on the certificate image only, one record at a time, so it is
not a substitute for a census read.

For occupations after 1950 the practical sources remain obituaries (partly
mined), city directories, and headstone/Find a Grave biographies.

## The infographic film — occupation scenes

`video/infographic/hamilton.html` renders deterministically: `window.render(t)`
draws the frame for time *t*, and `capture.js` frame-steps it through Playwright
to `hamilton_infographic.mp4`. Every figure on screen traces to a row under
`data/`.

The film grew from 240s to **340s** with three scenes built from the seven
census reads:

**`work` (150–184s) — "What the town did for a living."** Stacked bars of the
working population by occupation category, computed by `scripts/occ_analysis.py`.
1880 is shown as a prologue bar and labelled as such, because that return counts
village and countryside as a single "Hamilton" place; from 1900 the enumeration
separates the incorporated town from the country around it, so the 1900–1950
bars are a consistent series. The finding on screen: shop and counter work more
than triples inside the town line, 13 people in 1900 to 47 by 1950, while the
trades hold steady.

**`line` (184–218s) — "A line you can read in one column."** The colour line,
counted. In 1880, 255 of Hamilton's 756 people were Black or mulatto — a third
of the place, living in the village, in trades and on farms of their own. From
1900 the occupation column inside the corporate limit holds servants,
laundresses and day labourers and nothing else: the count of Black residents in
a trade, a shop or a profession inside the town line is **0 in every decade from
1900 to 1950**. Beyond the line, in the same decades, it is 4, 4, 2, 0, 3, 22 —
and the named proprietors are listed: Levenberry's barber shop, Daniel T.
White's grocery, Swann's market garden, Randolph's barber shop, Clark's
insurance agency.

The scene is built to rhyme with the register scene at 50–86s, where zero of
1,403 death-register entries mark a Black decedent. That zero is documentation.
This one is a boundary.

**`lives` (290–322s) — "The same column, four lives."** Four life lines across
the seven censuses: George T. Schooley (works in shop 1880 → merchant 1930),
Bessie Estelle Myers (present in all seven; operator → chief operator at the
telephone exchange), James B. Levenberry (barber with his own shop in 1910,
boarding at 89 in 1950), and Lawrence H. Johnson (farm laborer at fifteen in
1910; "laborer" in 1920, 1930 and 1940, the year he died at forty-six).

Scene order is `count · map · reg · war · town · work · line · leave · eras ·
lives · close` — the occupation material sits between the population curve and
the departure scene, because the colour line is what makes the leaving legible.

## The score

`video/infographic/score.py` generates `score.wav` (340s stereo, 44.1 kHz) by
additive synthesis — no sampled or licensed material, nothing sourced. It is
deterministic: a fixed seed (`1853`, the year on Yardley Taylor's map) and
explicit note events, so re-running it produces a bit-identical file.

Tonal centre D, Aeolian. Grave rather than sentimental: the film covers
slavery, Mosby's raid, the diphtheria years and a colour line that held for
fifty years, and a warm score would lie about it. Three voices only — a low
drone with slow detune beating, inharmonic struck tones (bell/struck-string,
8 partials, exponential decay, 12 ms attack so there is no click), and a
filtered-noise bed used twice. Space comes from a five-tap feedback delay
network per channel rather than a reverb impulse, with a 4.2 kHz rolloff so
the taps sit behind the notes instead of beside them.

Cue points match the scene table in `hamilton.html` exactly, and the scoring
follows what is on screen:

| Scene | Treatment |
|---|---|
| `count` 0–18 | One low tone, two bells. The 2,732. |
| `map` 18–50 | Drone plus a bell per surveyed name. |
| `reg` 50–86 | Upper voices stripped from ~64s so the zero in the colour column lands bare. |
| `war` 86–112 | Heaviest passage; six slow tolls, decaying. |
| `town` 112–150 | Rising figure D–F–G–A–C–D under the population curve. |
| `work` 150–184 | A plain working pulse, 11 short notes. |
| `line` 184–218 | Thinned to one repeated D per decade. The quietest scored passage. |
| `leave` 218–260 | The same figure descending. |
| `eras` 260–290 | Drone only, no struck tones. The law, static. |
| `lives` 290–322 | Bells return, one per person. |
| `close` 322–340 | Resolve, 7s fade. |

Because the score cannot be auditioned here, it is verified numerically
instead — per-scene RMS, DC offset, clipped samples and the partial spectrum.
The check that matters: `line` reads −28.1 dBFS RMS against a −24 dBFS
average, so the row of zeros does land in relative silence rather than
merely being described as doing so. Master is soft-kneed with `tanh` and
normalised to −12 dBFS peak — quiet enough to sit under the visuals, loud
enough to survive laptop speakers. The drone root is D2 (73.4 Hz), not D1;
a 36.7 Hz fundamental is inaudible on most playback and only eats headroom.

    python3 score.py
    ffmpeg -y -i hamilton_infographic.mp4 -i score.wav \
      -c:v copy -c:a aac -b:a 192k -shortest hamilton_infographic_scored.mp4

`hamilton_infographic_scored.mp4` — 14 MB, 340.000s, 1280×720, 24 fps, AAC 192k.

## The epidemics film

`video/infographic/hamilton_epidemics.mp4` — 2 min 57 s, 1280×720, 24 fps, scored.
Source page `epidemics.html`, frames via `capture_epi.js`, score `score_epi.py`.
Every data constant in the page is emitted by `scripts/epi_emit.py` from
`data/loudoun_deaths.csv`, `data/family_losses.csv` and
`data/timeline_people.csv` — the page is not hand-edited for numbers.

### The methodological problem, and what was done about it

The obvious film — epidemic deaths per year across the 19th century — cannot
honestly be made from this register. Entries per year:

    1818-1821      58    fragmentary
    1853-1859   1,102    Virginia registration law in force
    1860-1863       0    no entries at all
    1864-1866     301    thinning
    1867-1900     356    across 34 years

Plotting raw counts would chart **compliance, not disease**. So the film opens
on that distribution rather than hiding it, and everything that follows is a
*proportion* within the 1853–1866 window (1,403 deaths, 1,123 with a cause),
where registration volume cancels out.

### What the register shows

61% of causes written down were infectious. Grouped under 19th-century
nomenclature (croup, quinsy and "putrid sore throat" fold into the diphtheria
complex; "summer complaint" and cholera infantum into the bowel group):

| Cause group | n | Median age | Under ten |
|---|---:|---:|---:|
| Dysentery & bowel | 195 | 4.8 | 62% |
| Consumption (TB) | 167 | 33.2 | 12% |
| Diphtheria & throat | 85 | 3.9 | 84% |
| Typhoid | 84 | 27.0 | 10% |
| Pneumonia & lung | 77 | 31.4 | 27% |
| Whooping cough | 24 | 1.8 | 96% |
| Scarlet fever | 18 | 4.4 | 83% |

The split is the finding: dysentery, diphtheria, whooping cough and scarlet
fever took the children; consumption and typhoid took their parents. 34% of
every recorded death was a child under ten.

Seasonality gives the mechanism. 144 of 187 dated dysentery deaths fall in
July, August and September — 64 in August alone — against near-zero in
midwinter. It was water-borne and it arrived every summer. Consumption, by
contrast, keeps no season at all: 13 or 14 a month, every month.

### The stones as an independent check

The register is the county's. The 2,732 people in the three cemeteries are a
different population, independently recorded, so the child-burial share by
decade is a separate line of evidence rather than the same data restated:

    1850s 52%   1860s 36%   1870s 27%   1880s 22%   1890s 22%
    1900s 15%   1910s 15%   1920s 14%   1930s  4%   1940s  4%
    1950s  3%   1960s  2%   1970s  0%   1980s  3%   1990s  3%

The cliff falls between the 1920s and the 1930s — one burial in seven becomes
one in twenty-five — immediately after the Loudoun County Health Unit begins
work in April 1923 with Schick testing in the schools (`hamilton_health_news.csv`).
The early decades rest on small n (1850s n=29, 1860s n=14), which is printed
under each column in the film rather than left for the viewer to assume.

### Every household, not just two

An earlier cut told the Dulin and Carter stories and left the other forty-two
implied. The film now shows all of them first: 44 households, 93 children,
one dot per child, coloured by the dominant cause the register gives.

    1853  12 households      1858   5      1864   7
    1854   4                 1859   3      1865   8
    1855   1                 1857   1      1866   2
    1821   1 (Cooksey, three sons, bilious fever, two days)

Thirteen of the forty-four lost every child they lost inside a single week.
Eighteen were emptied by the bowel-disease group alone — the summer water.

### A claim that was removed

An earlier cut carried the line *"The register is the county's book, not the
town's — Hamilton kept no separate one."* Nothing in this dataset establishes
that Hamilton kept no register of its own; it was an inference stated as fact,
and it has been cut. The scene now says only what is verifiable: these are the
county's records, and the people in the three cemeteries came from the farms
and villages around them.

Worth recording how it survived three edits: it was patched by matching an
exact source string, the match silently failed on a character-escape
mismatch, and no assertion checked the result — so the "fix" was reported as
applied while the original line kept shipping. Later edits to the same file
now replace whole lines located by a unique substring, and assert on each.

### Legibility and pacing

The first cut was too fast and too dim to read at 90 s. Secondary ink was
lifted from `#c3c2b7` to `#dad9cf` and tertiary from `#8a8984` to `#a3a29b`;
every small label went up two or three points (body 17→20, source 12→14, the
per-column `n=` from 11 px `#6b6a66` to 13 px `#96958e`). Scene lengths roughly
doubled, so each closing line now holds nine to sixteen seconds rather than
one or two, and the gaps between successive lines were widened to three or
four seconds so one is read before the next arrives. A second pass added a
further three seconds to every scene, so each closing line now holds between
seven and sixteen seconds after it lands.

Foot-of-scene narration was also separated from chart ink: it is set in a warm
parchment (`#ecdfc2`, secondary `#cdc2a6`) rather than the neutral white used
for labels, with the load-bearing phrase of each line in bold — *"**It was in
the water.**"*, *"**Sixty-four in August alone.**"*, *"**one in twenty-five.**"*
Bold runs are wider than the plain text they replace, so `rich()` measures the
assembled line and shrinks it a point or two rather than letting it run off
the frame.

### Score

Same synthesis as `score.py`, 177 s, seeded 1866. Cues match the scene table.
The `families` passage is literal: four struck tones for the four Dulin
children, timed to the instant each dot appears, then three for the Carters.
Unlike the first film this one resolves — the D drone is faded out from 84s so
the close sits on F, the relative major, which is verified by measurement
rather than by ear (closing partials F2/C3/F3 at 87.3, 130.9, 174.5 Hz with D2
absent; spectral centroid rises to 448 Hz from the 258 Hz of the Dulin scene).

    python3 scripts/epi_emit.py        # regenerate the data constants
    python3 video/infographic/score_epi.py
    node video/infographic/capture_epi.js
    ffmpeg -y -framerate 24 -i frames_epi/f%05d.jpg -i score_epi.wav \
      -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 192k -shortest \
      hamilton_epidemics.mp4

---

## THE APP — `app/`, 28 Oct 2026

Built to `APP_SPEC.md` as corrected by `CLAUDE.md`. Plain HTML, CSS and ES
modules; one Node script turns `data/*.csv` into `app/data/*.json`; no
dependencies. `npm run data`, `npm test`, `npm start`, then
http://localhost:8787/. `app/README.md` documents the code layout, the rules
as implemented (alive-on, disputed dates, events, eras, the absence band) and
the design decisions.

Tests: `test/acceptance.test.mjs` asserts every §9 value and checks that the
app's `aliveCount` reproduces `timeline_population.csv` for all 273 years;
`test/derive.test.mjs` covers the precision and alive-on rules. All passing
against the current data.

29 Oct 2026: the app was restyled to the visual language of the two
infographic films (`STYLE.md`): the dark surface, the kicker, Georgia for
titles and big numbers only, narration in parchment, a `SOURCE` line on every
view, and the films' blue / green / orange for Lakeview / Harmony / Pleasant
Valley. The timeline also opens compact (one event row, the documentation
stratum and the absence band) with a *Detail* toggle for the full stack.

Two data facts noticed while building, not changed: `context_events.csv`
now has **one** row with an empty date, not two (§6.2 says two); and the
`precision` column disagrees with the date string on a few rows
(`1870-01-01,year`), where the app follows `precision`, as the spec says to.

---

## THE APP, 29 Oct 2026: what the data science found, and what changed

A day of analysis on the finished dataset. Each finding below was tested
before it went on the site; several did not go on the site, and are recorded
here so they are not re-run as if new.

### Published

**Four founding-era events** were added to `context_events.csv` at the
owner's request (the Revolutionary War's start and the Treaty of Paris, the
Declaration, the Constitution): 137 rows.

**Years lived** (`APP_SPEC.md` §11). Median age at death of adults who
reached 20, Lakeview against Pleasant Valley. The first era was moved from
1900–1949 to **1920–1949**: Pleasant Valley opened in 1922, and before 1920 it
holds 2 dated adult deaths against Lakeview's 246, so the earlier era compared
twenty years of one ground with almost nothing. The gap is **13.0 years**
(1920–1949), **8.0** (1950–1999), and **not established** for 2000–2026
(p = 0.081). The page says the 1920–1949 result depends on Pleasant Valley
adults whose birth is known only to the year: with both dates to the day,
the interval for that era crosses zero. Those year-only birth years are not
rounded guesses (23 of 151 end in 0 or 5, under the one in five that chance
gives), so the finding stands, on them. `scripts/longevity_gap.py` is the
independent reference; the build stops if the two disagree. numpy and scipy
are pinned in `scripts/requirements.txt`.

**The 1948 survey's limits.** None of the 744 transcriptions carries a verse,
a religious phrase or a word like "Mother": the DAR typists recorded names,
dates, ages and relationships. All 744 are Lakeview. Every stone reading in
the app now says so; it is never presented as the full inscription.

**How the stones name people** (§12). "Wife of" on 103 adult stones; "husband
of" on one. Children named through their parents on 76% of children's stones
before 1900, 27% by 1925–1948 (compared child with child, so falling child
mortality does not explain it). No sex is inferred from names. 26 stones show
an open death date: 16 names cut before a death after 1950, 4 with no death
anywhere in the record, 5 whose date was not yet cut.

**The one who lived on.** 113 couples with both deaths dated; a median of
14 years between the two deaths; 36 at twenty years or more, 16 at thirty or
more.

**Duplicate records** (§13). The longevity work surfaced the Trammell /
Thompson couple at Pleasant Valley, entered twice with the spouse links
crossing between the copies. A scan for same cemetery, agreeing dates and a
shared name word found **62 candidate pairs**, 11 of them already named in
the existing duplicate files. The owner reviewed every pair: **51 same person, 4
different, 7 not sure**, recorded in `curation/duplicates.csv` with the
record kept for each. `data/` is unchanged; the build folds the confirmed
records, so the app counts **2,681 people in 2,732 records**. The curve's
peak stays 1927, now 1,429 people (1,455 records); the Years lived medians
did not move. Record-level values in `CLAUDE.md` are still tested.

**Deaths together** (§14). A blind scan of every one-to-three-month window,
1870–2020, finds no cluster across households that beats chance. One window
was tested because the overlay names it in advance: October–December 1918,
**8 deaths against 3.33 usual** (p = 0.042 allowing for two tests; 3.25 and 0.037 before 44 death days were added from certificates on 30 Oct 2026), 5 of them
aged 17 to 30 against 8 of 45 aged 15–44 in the other autumns (p = 0.016) —
the 1918 influenza's known shape. The date panel marks it, names the eight,
and names no cause. In a month that usually sees one death, about eight are
needed to stand out, so a quiet month is never evidence of no outbreak.

### Tested, not published

**Age heaping.** No heaping at Lakeview or Pleasant Valley. Harmony's
year-only births where the death is exact end in 0 or 5 a third of the time
(p = 0.004), most likely worked back from an age on the stone; Harmony is not
in the longevity comparison.

**Seasonality.** From 1900 on, deaths show the ordinary temperate winter peak,
driven by people over 65. This checks the dates more than it discovers
anything.

**Summer complaint.** The epidemics film's claim stands, and strongly: in the
county register, 153 of 187 dysentery and bowel deaths fell June–September
(p ≈ 10⁻⁵⁸), and 211 of 437 children under five (p ≈ 10⁻¹³). Children with
stones in these three grounds, 69 of 83 of them from 1870–1919, show a weaker
summer lean (33 of 83 against about 28). A sample of 83 would show the
register's pattern 85 times in 100, so the difference is probably real; the
record cannot say whether the season eased after the 1860s or whether
families who could buy a stone lost fewer children to it. It does not
contradict the film. The film's "it was in the water" is the historical
explanation; the register records the season and the cause, not the water.

**Autumn 1890.** The *Weekly Enterprise*'s "mild cases of scarlet fever" in
Hamilton leave no excess in these grounds (2 deaths against 1.5).

**Not tested: migration.** In 1900–1950 young Black adults left Loudoun, and
some were brought home to be buried. That changes who lies at Pleasant Valley
in ways no test here can measure; the Years lived page calls the two grounds
two burial populations, not two samples of the town, for this reason.

### Notes for later work

- The 7 pairs the owner marked "not sure" are a decision, not a gap: they
  stay two people, each card naming the other. Only new evidence (a death
  certificate, an obituary) would change one, in `curation/duplicates.csv`.
- The kept record for each merged person was chosen by completeness (stone
  reading, exact dates, family links, sources), which sometimes keeps the
  shorter name; the `keep` column can be changed.

## THE ORIGINAL LOUDOUN DEATH REGISTER — FIRST LOOK, 30 OCT 2026

Opened on FamilySearch under Curtis's account, the day the no-sign-ups rule
was lifted for FamilySearch. A town reader had said the 1853 register lists
African-American deaths. **It does.** The DAR typescript is what left them out.

**Where it is.** Catalog 780106, *Death registers, 1853-1906 (Virginia)*,
film **2048576** = image group (DGS) **004225400**, 656 images, holding Lee,
Loudoun and Lunenburg. Image 180 is the target card for **Item 2**; Loudoun
1853 begins just after it (image 182 is 1853, 184 is 1854, 250 is 1866). The
images are browsable and **indexed** (collection *Virginia, Deaths and
Burials, 1853-1912*): names, ages, birthplace, parents, spouse, death date
and place.

**What the page shows.** The register has a colour/condition column beside
each name and a column for the owner's name. On image 182 (1853) a run of
entries is marked **S** with an owner named beside each, and on image 184
(1854) entries 171 ("Mary") and 172 ("Martena", d. 1 Sep 1854, mother Milly)
are S with an owner named. **The owners' names are deliberately not written
here.** They were read off a low-resolution screen, and the county held more
than one man of at least one of the names (two George Smiths, b. c.1777 and
c.1803, were both alive in 1854: `loudoun_deaths.csv` rows 666 and 1654).
The page gives Loudoun, not a town, so nothing on it ties an owner to
Hamilton. A name goes into this file only once it is read with confidence
and checked against the 1850 slave schedule, with image and line. Enslaved people are entered by first
name, a mother named by first name only where at all.

**Do not use FamilySearch's index for race.** Its Race field disagrees with
the page: on image 184 it labels Richard S. Killen (38, born England,
minister) "colored", and the page marks him W. It also loses the S/owner
pair altogether. The index is fine for finding a page; the page is the
record. Owner names are not in the index and have to be read off the image.

**A route into Hamilton.** The index carries the place of death, and Harmony
(Hamilton's old name) appears in it: image 250, Sarah Morgan, d. 15 May 1866,
"Harmony, Loudoun". A place search on the index would find Harmony/Hamilton
deaths across 1853-1896 without reading every county page, then each is
checked on the image. Not yet done; human-paced, one lookup at a time.

Nothing from this film is in `data/` yet.

### The Harmony/Hamilton place search, 30 Oct 2026

One search of the index (collection 1708697, death place exactly "Harmony,
Loudoun, Virginia"; FamilySearch files it as Hamilton) returned **96 deaths,
1854-1896**, on one page. They are in
`research/fs_hamilton_deaths_1853_1896.csv`, written by
`research/build_fs_hamilton.py`, each with its record link. `research/` is
working material, not `data/`: nothing in it reaches the app.

- **28 of the 96** match a person already in the timeline by surname and
  death year (a loose match, to be checked one by one). Lydia A. Cox, d. 21
  Oct 1885 aged 77, is the dataset's earliest birth.
- **21 are marked "colored" by the index**, 1866-1894. Only the page counts,
  and the index has now been wrong twice: John J. Hough (d. 8 Aug 1890) is in
  the white column on the page.
- **Leuisa Levenberry, d. 4 Jul 1890 aged 53, is marked colored on the
  page** (item 4, image 134, line 33), as is Helen Levenberry, 22, d. 21 Feb
  1890. Leuisa's date of death is the date on HM0104, "L J Levenberry", born
  14 Apr 1837, at **Harmony**. If they are one woman, Harmony holds a
  stone for a Black Hamiltonian who died in 1890, in the years the app says
  the record is all but silent. The column header was not legible; first =
  white, second = colored is read from rows whose race is known.
- George W. White, "colored" in the index, d. May 1891 aged 52, is not
  obviously HM0199 George Washington White (CSA Loudoun Artillery, d. 15 Jun
  1891). Unchecked on the page.
- Most of the 21 are in no cemetery in this project.

Not yet decided, and Curtis's to decide: whether and how any of this enters
the app. The search does not cover deaths entered under "Loudoun" alone, so
96 is not the town's total.

#### The 21 checked on the page, 30 Oct 2026

Every one of the 21 the index calls "colored" was opened on the image
(details per row in `verified_on_image`):

- **17 are colored on the page.** Leuisa and Helen Levenberry, Catharine
  Champ, Charles Clark, an unnamed Volentine infant (listed under a written
  "Colored" heading), Cato Cooper, Mary J. Hill, Amanda Lee, Ada Allen, Jane
  Humphrey, Mary A. Mitchell, a Jackson infant, Parker Mussey, Henry Clarke,
  Helen Collins, Julia May Lee and Soloman Lucas: deaths at Hamilton from
  1873 to 1894. On four pages the header (White | Colored | Male | Female)
  is legible; on the rest the column is read from neighbouring rows of
  known race. The 1873 page is faded.
- **1 is white on the page:** John J. Hough, 1890. The index is wrong.
- **3 are not confirmed:** Hailey Wood (crowded foot of the 1894 page),
  George W. White (ditto marks too close to read) and James A. Bentley (the
  1866 record gives no line; not found on the page).

One of the 17 may have a stone: Leuisa Levenberry's death date is the date
on HM0104 at Harmony (not established as the same woman). Helen Levenberry
has none, and neither do the other 15, in any of the three grounds. They are Black Hamiltonians the register records
and the burial record does not.

#### The 1850 slave schedule and the owners' names

The 1850 slave schedule for Loudoun (film 004206479, item 9, image 46) has
**two George Smith entries on one page**, lines 13 and 17, holding 10 and 3
people; an A. G. Smith appears elsewhere. That is two men or one man entered
twice; the schedule does not say which, and nothing ties either to the
"Geo. ? Smith" of the 1854 register or to Hamilton. The owners' names stay
out of this file.

## VIRGINIA DEATH CERTIFICATES, 1912-1987 — 30 OCT 2026

FamilySearch collection 2377565, death place Hamilton, Loudoun: **467
certificates** in the index (`research/fs_va_death_certificates_hamilton_index.psv`,
copied from the page and checked identical against a direct copy). After
FamilySearch's own duplicates and five other Virginia Hamiltons: 458. Matched
to the timeline by surname and exact death date: 95 (Lakeview 80, Harmony 10,
Pleasant Valley 5); by surname and year only: 69; **no match: 294** (213
White, 81 Black, by the index). `research/match_certificates.py` lists them.

**All 81 unmatched Black certificates were opened and read on the image**
(`research/fs_certificates_read.tsv`: burial line as written, cause, and
what else the certificate gives). Where they say the person was buried:

| burial line | 1913-1921 | 1922 on | all |
|---|---|---|---|
| "Hamilton", no cemetery named | 13 | 25 | 38 |
| "Hamilton Cemetery" | 0 | 5 | 5 |
| "Pleasant Valley" by name | 0 | 5 | 5 (Francis Anderson, 1926, among them) |
| "at home" (three infants, no undertaker) | 0 | 3 | 3 |
| elsewhere | 7 | 23 | 30 |

Elsewhere is mostly **Lincoln** (13 "Lincoln"; 5 Mt. Olive Baptist or Lincoln
Baptist; 1 Lincoln Cemetery), then Waterford 3, Lovettsville 2, and one each
Aldie (family plot), near Round Hill, Arlington National Cemetery, removal to
Alexandria, and the State Anatomical Board.

**What this does and does not establish.**

- **Before 1922, 13 Black Hamiltonians are certified as buried "Hamilton"**,
  1913-1921, eight of them children. The certificate names no ground.
  Pleasant Valley had not opened. Where in Hamilton they lie is not
  recorded; the separate ground at Harmony is a possibility, not a finding.
- **After 1922 "Hamilton" and "Hamilton Cemetery" are probably Pleasant
  Valley** for most of these 30 people, since it was the Black community's
  ground in the town, but the certificate does not say so and this file
  does not assume it. Five say Pleasant Valley by name.
- **Lincoln was a second burial place for Hamilton's Black families**, 19
  of the 81. That is outside this project's three cemeteries.
- The certificates add **occupations and causes** for people with no stone:
  a merchant (Charles F. Levenberry, 1919), a trained nurse (Rachel Sanford,
  1920), a midwife (Martha Douglas, 1949), a taxi driver (Lindsay Gaskins,
  1933, who died after a fall from a tree), a retired railroad worker; two
  homicides (Samuel Grooms, 1948; Raymond Tate, 1959); influenza in 1918
  and 1928; tuberculosis repeatedly.
- **One conflict with the data:** PV0142 Walter H. Levenberry is dated
  1887-1952 (years only); his certificate gives death 2 Mar 1962, age 74,
  burial "Hamilton Cemetery". **Decided 30 Oct 2026: 1962.** The 1952
  came from a temporary marker whose third digit is illegible. Recorded in
  `curation/date_corrections.csv`; `data/` still says 1952, the app shows
  1962 and the card says what it replaced.

Nothing here is in `data/` or the app. The 213 unmatched White certificates
are not read.

**On the app (30 Oct 2026):** the 81 are listed on *Who is not here*, grouped
by the burial line, as documented individuals who are not people in the
record. By the owner's decision sensitive details are withheld from the page:
six causes are cut to their plain kind (Allen 1918, Boyd 1927, Grooms 1948,
Tate 1959, Jackson 1971, Wright 1982), and informants and kin are not shown.
The certificates are public and each entry links its own. The git history is
left as it is, by the same decision: the owners' names once written into this
file, and everything in `research/`, are readings of public records.

**Four of the 81 were already in the record (30 Oct 2026).** Matching by
exact death day, whatever the surname, found them: HM0250 "Bertha M Saesar"
at **Harmony** is the certificate's Bertha Lillie May Ceasar (12, d. 12 Jan
1913, buried "Hamilton"): a Black child buried at Harmony in 1913. PV0029
"John D. Chinn" is John Douglas Gaskins (same birth and death days). PV0097
"Fannie J. Harvey" is Fannie Jackson Harvie. PV0142 Walter H. Levenberry is
his own certificate once corrected to 1962. By the owner's decision each is
one person, following the certificate: links in
`curation/certificate_links.csv`, dates in `curation/date_corrections.csv`
(Bertha born 1900, not 1901, which makes the 1900 people count 1,232; Fannie's
death to the day). The page now lists 77. The surname-and-year matcher
missed them; the 213 white certificates get the same death-day check.

**Eight white certificates were people already in the record (30 Oct 2026).**
Matched on the exact death day and confirmed on the image: Wynkoop (LV2092),
Caroline C. Warner White (LV2031), Mullen (LV0698), Clagett (LV0223), Wiley
(LV0982), Bailey (LV0040), Schaffer (LV1773) and Mock (LV1529). Each is linked
in `curation/certificate_links.csv` and appears once, on the card. Following
the certificates: Joseph E. Clagett, a doctor, was born 19 Dec **1879**, not
1897 (digits swapped); Laura A. Bailey was born 3 Aug 1877, not 1876; Mullen
died at 75 and Mock at 67, not 76 and 68, as their own dates show. Schaffer's
certificate gives an age (66) its own dates contradict, so the record's 65
stands. Wiley's cause is withheld on the page as sensitive.

**All 213 white certificates read (30 Oct 2026).** `research/fs_certificates_read_white.tsv`
holds 204 readings (8 were people already here, linked above; one more,
Willard H. Brown, found while reading; FamilySearch indexed one certificate
twice). Where they say the person was buried:

| burial line | count |
|---|---|
| elsewhere | 174 (Union Cemetery, Leesburg 33; Hillsboro 23; Lincoln 19; Leesburg 13; Lovettsville 8; then Middleburg, Upperville, Ebenezer, Falls Church, Waterford, North Fork and others) |
| "Hamilton", no cemetery named | 15, all 1912-1949 |
| cremation | 10 |
| **Lakeview** | 5 |

**Four Lakeview burials the cemetery records do not hold:** Elizabeth Emily
Rhodes (1, d. 1924), Laura Ellen Cox (84, d. 1934; possibly LV0269 "Laura L.
Cox", dated May 1930, not linked), Sarah Virginia Orrison (96, d. 1949) and
Walter William Ballinger (74, d. 1957). The fifth is **LV0170 Willard H.
Brown**: his certificate gives death 26 Jul **1955**, aged 40, buried
Lakeview, not 1976; Find a Grave had said 1955 (`data/conflicts.csv`).
Linked and corrected by the owner's standing decision to follow the
certificate.

So the white Hamiltonians who died in town and have no record here were
mostly buried outside it; the Black Hamiltonians mostly "at Hamilton". Ten
white certificates carry causes marked SENSITIVE in the research file
(suicide, homicide, alcoholism); none is on the app. Nothing from the 204 is
on the app yet.

**The 1966 Soviet crash in the papers (30 Oct 2026).** *Northern Virginia
Sun*, 31 Oct 1966, p. 1, "Car Wrecks Kill Three On Route 7" (Virginia
Chronicle): Vassily Orechov and Anatoly Rechkin, employees of the Soviet
Embassy, were killed Saturday 29 Oct when their car, on diplomatic plates,
"crashed out of control into a tree near Hamilton" on Route 7. The embassy
said both were non-diplomatic employees; Orechov had been in the U.S. seven
months, Rechkin a year and was a part-time chauffeur; they were alone in the
car. The article gives no destination or direction of travel. The *Greene
County Record*, 2 Feb 1967, p. 2, lists both among the year's Virginia
highway deaths. The owner's suggestion that they were bound for Mount
Weather is neither supported nor contradicted by either source. The
*Loudoun Times-Mirror* for 1966 is not on Virginia Chronicle (its Loudoun
titles end in 1953).

**The 69 surname-and-year matches (30 Oct 2026).** 60 are people already in
the record and are linked (`curation/certificate_links.csv`); 9 were a
relative of the same surname who died the same year, and were read as
unmatched certificates (Black: Walter Ramey, Mable F. Clark, William H.
Johnson; white: William H. Brown, James Cox, Willie J. Trussell, Willy W.
Wine, William L. Payne, Edgar Holmes Tavenner). Edgar Holmes Tavenner (b. 16
Oct 1843, d. 18 Jul 1913, buried Hamilton) is possibly LV0892 "Edgar Hiram
Tavenner" (b. 1843, d. 1919 by the record): not linked, for the owner.

By the owner's decision **the certificate wins** where it and the record
conflict. The 16 linked people whose death dates conflicted were read on the
image, and the image agreed with FamilySearch's index every time; their death
dates, and birth dates where the certificate gives a different day, are now
the certificate's (`curation/date_corrections.csv`). Among them: Rose May
Tavenner d. 15 Apr 1913 (informant James E. Tavenner), Hannah Ann Tavenner
d. 13 Mar 1946 (the record had her birthday), Bethany McFarland d. 19 Jul
1914, James Milton Corbin d. 16 Jan 1930, John F. Laycock b. 1843 d. 9 Jan
1927. 44 more had a death year or month only; the day is taken from the
index, labelled as such on each correction, not yet read on the image.
Laura L. Cox (LV0269) is the certificate's Laura Ellen Cox, by the owner:
d. 22 May 1934, aged 84. The 1918 influenza cluster's baseline moved with
the added days: expected 3.33 (was 3.25), p = 0.042 (was 0.037).

**The 44 read on the image (30 Oct 2026).** Every death day taken from the
index matched the certificate image; the corrections now say "read on the
image". 37 birth dates were also replaced where the certificate gives a
different day, by the owner's rule that the certificate wins. Every linked
card now carries the burial line as written. Two things for the owner:
- **LV1104 Kate Dowell** (Catherine Ruth Dowell, d. 15 Dec 1915): the
  certificate buries her at **Short Hill**. **Owner's decision: she stays at
  Lakeview, where all her family is.**
- **PV0027 Daisy May Chinn** (d. 16 May 1959): the certificate gives her
  race as white, though she is at Pleasant Valley and her mother is
  Emiline Ceaser. **Owner's judgement: the race was likely recorded
  incorrectly on the certificate.** Kept as written; not changed.
Also: Eugene W. Lowe (LV0634) was the caretaker at Lakeview cemetery.
Edgar Holmes Tavenner and LV0892 stay separate: the owner cannot say they
are the same man.

## THE 1870 CENSUS, HAMILTON POST OFFICE — 31 OCT 2026

The 1870 Loudoun schedule is in two divisions, not enumeration districts.
Hamilton is in the Southern Division, Jefferson district, enumerated by John
S. Baker on 8-11 July 1870. The page header names the post office, and the
pages headed **Hamilton** are **film images 360-367** (FamilySearch
collection 1438024, DGS image group of "Virginia, 1870 federal census:
population schedules: Loudoun"). The pages either side are Hughesville (358-
359), Mt. Gilead (355-357) and Lincoln (368 on). Other Hamilton-area households
may sit under those post offices; this file is the town's own pages only.

`research/census_1870_hamilton.csv`: **319 people** on those eight pages,
from FamilySearch's index (name, age, sex, race, birthplace, household), one
record view per household, checked name for name against each page's list.
Twelve more people belong to two households that run onto the neighbouring
pages and are kept with a note. Occupations and property were read off the
image only for the first page (360, lines 1-24); the viewer would not pan
further down the page.

**By the index's race column: 207 White, 76 Black, 36 Mulatto.** 112 of the
town's 319 people in 1870 were Black or of mixed race, many living as
servants and labourers inside white households (the Hoges, Holmeses, Hughes,
Janneys, Hatchers). **Of those 112, one matches a person in the three
cemeteries** (George Henry, 57, HM0078 at Harmony). Of the 207 white
residents, about 40 do (`research/census_1870_hamilton_candidates.txt`, by
name and birth year within two years; candidates only, two ambiguous and a
few plainly wrong). Among them: Lydia A. Garner Cox (62) with her children,
the Wileys, the Hoskinsons, William and Malinda Tavenner, and Rosa M. Thomas,
aged under one, who became Rose May Tavenner (LV0896).

This is the strongest single measure yet of the gap the app describes: a
third of Hamilton in 1870 was Black, and the burial record holds one of them.
Nothing here is in `data/` or the app.

**The candidates checked (31 Oct 2026).** `research/check_1870_candidates.py`
compares each census age with the age the record gives on the census day (1
June 1870), and looks at who else is in the household.
`research/census_1870_hamilton_verdicts.csv` gives a verdict and a reason
for each, 47 rows in all:

- **Strong (30): age agrees and a second tie.** The second tie is a
  household member who is in the same plot, or a named relative. Examples:
  the Wileys (four in Lakeview E-9, one in E-8), the Thompsons (C-39), the
  Hoskinsons, the Merchants, the McFarlands, with Ellener Lanham, 73, in
  Bethany Lanham McFarland's household, and William and Malinda Tavenner.
  Lydia E. Tavenner, 25, shares a house with James B. Pugh, 22, whom she
  later married. Both are in Lakeview C-51, which adds James Braden Peugh
  (LV0765) to the list.
- **Probable (9): age agrees, but nothing else ties them.** George Henry is
  one of them: his age agrees with a birth recorded to the day, but no one in
  his household is in the cemeteries.
- **Rejected (4).** Both Janney candidates for Mary J. Wood Janney (HM0098)
  are rejected: one is the wife of Geo. W. Janney, the other is in Amos
  Janney's house, and her husband Asa M. Janney is on none of these pages.
  Also rejected are Margaret Brown Guard and John Thomas Wiley (LV0984); John
  W. Wiley, 17, is LV0974 to the day.
- **Unresolved (4), read on the image:**
  - John F. Preston: the page reads F, the record E.
  - Mary E. Brown: her record names her mother as Mary Ann; the household's
    mother is Jane V.
  - John H. Wiley, head of the E-9 family: the page says 37, his record 47.
  - James W. Merchant: the page says 30, his record 34.

**Adopted (owner's decision, 31 Oct 2026): the 30 strong and the 9 probable**
are in `curation/census_1870_links.csv` (39 people). Each card gets an 1870
line under *In the census*. It shows the name and age as listed, the others
in the household who are also linked, and whether the match is strong or
probable, with what that means. The four unresolved and four rejected
candidates are not linked. The 1870 links are kept apart from the
1880-1950 census fields, so the acceptance counts of 374 matched and 212 with
an occupation are unchanged.

Two unresolved candidates were then settled with the 1880 census, which
`data/` already holds, and both were linked by the owner:

- John H. Wiley (LV0976) is "J.H. Wiley, 57, Shoe Merchant" in 1880, born
  about 1823 as his record says. The 1870 "37" is the enumerator's slip, so
  he is now **strong**.
- John F. Preston is "J. F. Preston, 36" in 1880. Both censuses write F, and
  only the cemetery record has E. He is linked to HM0146 as **probable**,
  with the record's initial left as it is.

That makes **41 linked: 31 strong, 10 probable**. James W. Merchant and Mary
E. Brown stay unresolved.

The *Who is not here* tab now carries the count, as **1 of 112**: Black and
mixed-race people on the 1870 Hamilton pages who are in these cemeteries.
Beside it, 40 of the 207 white residents are. The page says that the census
gives no burial place, and that the difference is not a count of people
missing from these grounds. The build computes the figures from the research
file and the links, and fails if they move.
