// The record page: its opening figures, its tabs, and the charts that are
// the page's own (burials, causes, newspapers, work, the self-check). The
// longer sections live beside it: record-absent.js, record-longevity.js,
// record-naming.js.
import { fmtDate, n } from './derive.js';
import { esc } from './timeline.js';
import { COUNTING } from './count.js';
import { decidedWords } from './panels.js';
import { pct } from './view-shared.js';
import { namingSection } from './record-naming.js';
import { longevitySection } from './record-longevity.js';
import { slaveScheduleSection, census1870Section, registerNamedSection, certificatesSection, certificatesWhiteSection, demographyFigure, documentedFigure } from './record-absent.js';

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------
const RECORD_TABS = [
  ['burials', 'Burials by decade'], ['causes', 'Causes of death'], ['work', 'Work'], ['absent', 'Who is not here'], ['longevity', 'Years lived'], ['naming', 'Names on the stones'],
  ['papers', 'Newspapers'], ['leads', 'Leads'], ['check', 'Counting and self-check'],
];

export function renderRecord(el, D, ctx, params = {}) {
  const S = D.summary, C = D.context, R = D.register, L = D.leads;
  const docEras = D.eras.filter(e => e.layer === 'documentation');
  el.innerHTML = `
    <h1 data-k="What the sources contain, and where they stop">The record</h1>
    <p class="lede">What the sources contain, where they fall silent, and what the app is therefore allowed to say. Three kinds of thing appear in this app and they rest on different evidence: a documented person, a measured count, and an absence of record.</p>
    <div class="stat-row lead">
      <div class="stat"><div class="v">${n(S.people)}</div><div class="k">people, in ${n(S.records.rows)} records each traced to a source. <a href="#/record?tab=check">Why the two differ</a></div></div>
      <div class="stat"><div class="v">${n(S.usable.yes)}</div><div class="k">placeable from birth to death</div></div>
      <div class="stat"><div class="v">${n(S.stone)}</div><div class="k">Lakeview stones read in 1948; none recorded for Harmony or Pleasant Valley</div></div>
      <div class="stat"><div class="v">${n(S.censusMatched)}</div><div class="k">matched to at least one census</div></div>
      <div class="stat"><div class="v">${n(S.cod)}</div><div class="k">with a cause of death</div></div>
      <div class="stat"><div class="v">${n(S.disputed)}</div><div class="k">with a disputed date, both readings kept</div></div>
    </div>

    <div class="tabs" role="tablist" aria-label="Sections of the record">${RECORD_TABS.map(([k, label]) => `<button class="tab" role="tab" id="rtab-${k}" data-tab="${k}" aria-selected="false" aria-controls="rt-${k}" tabindex="-1">${label}</button>`).join('')}</div>

    <section class="tab-panel" id="rt-burials" role="tabpanel" aria-labelledby="rtab-burials" hidden>
    <h2 data-k="1830 – 2026 · ${n(S.people)} burials">Burials by decade: the record arriving, not the town filling up</h2>
    ${burialsFigure(S.burialsPerDecade, docEras, D)}
    <p class="prose">The climb from the 1830s to the 1890s is the signature of an incomplete record; the plateau from 1900 is the signature of a complete one. Three spans bound what may be claimed about the early stretch: the project's own extraction gap (1822–1852), the thirty-one years with no digitised Loudoun newspaper (1844–1874), and the four years missing from the state register (1860–1863).</p>
    <ul class="era-list">${docEras.map(e => `<li class="${D.absenceEraIds.has(e.id) ? 'absence' : ''}"><span class="lbl">${esc(e.label)}</span> <span class="when">${fmtDate(e.start, e.startP)} – ${e.open ? 'no established end' : fmtDate(e.end, e.endP)}</span><span class="basis">${esc(e.basis)} <span class="muted">(${esc(e.source)})</span></span></li>`).join('')}</ul>

    </section>
    <section class="tab-panel" id="rt-causes" role="tabpanel" aria-labelledby="rtab-causes" hidden>
    <h2 data-k="1853 – 1900 · Loudoun County death register">What killed people, and when it stopped</h2>
    <p class="prose">The county death register names causes for its 1853–1866 pages and the private lists that follow. The medical event layer records when those causes became known, preventable or curable. Consumption is the commonest cause in the register; its bacillus was identified in 1882 and the first cure arrived in 1944.</p>
    ${causesFigure(R, D)}
    <div class="callout">These counts are the <b>Loudoun County register</b>, ${n(R.rows)} entries county-wide: a measured aggregate about the county, not about the people buried here. Only ${S.cod} of the ${n(S.people)} people in the cemeteries carry a cause of death, almost all between 1853 and 1866. Causes are kept in the register's own words.</div>

    </section>
    <section class="tab-panel" id="rt-work" role="tabpanel" aria-labelledby="rtab-work" hidden>
    <h2 data-k="1880 – 1950 · seven census reads">Work, as the censuses record it</h2>
    <p class="prose">Seven censuses of Hamilton's enumeration districts, 1880 to 1950, were transcribed and matched against the stones. ${n(S.censusMatched)} people match at least one; ${n(S.censusOccupation)} have an occupation stated. That reaches ${(S.censusOccupation / S.people * 100).toFixed(1)}% of the people here, so it is shown as a view of the town's work, never as a filter over everyone.</p>
    ${occupationsTable(D)}
    <div class="source"><span>SOURCE</span>timeline_people.csv, census_&lt;year&gt;_occupation columns · census_1880–1950_hamilton.csv · matches by name and birth year, or name only</div>

    </section>
    <section class="tab-panel" id="rt-absent" role="tabpanel" aria-labelledby="rtab-absent" hidden>
    <h2 data-k="Absence of record">Who is not in this record</h2>
    <div class="callout absence"><p>The three cemeteries document essentially no Black burials before 1922. That is a fact about the <b>sources</b>. Pleasant Valley, the Black community's cemetery, opened in 1922; the typed copy of the 1853–1866 state register that this project was built on names no Black decedent, though the original register does; and Harmony's separate ground for its enslaved congregants was partly paved over before 2000. The data supports "not recorded". It does not support "none".</p></div>
    <div class="stat-row">
      <div class="stat absence"><div class="v">0 of 1,403</div><div class="k">entries in the 1950s typed copy of the 1853–66 register that mark a Black decedent. The original register marks them</div></div>
      <div class="stat"><div class="v">${n(L.registerNamed.length)}</div><div class="k">Black Hamiltonians the 1865–96 register records, read on the page</div></div>
      ${L.census1870 ? `<div class="stat"><div class="v">${L.census1870.black.inRecord} of ${L.census1870.black.n}</div><div class="k">Black and mixed-race people on Hamilton's 1870 census pages who are in these cemeteries</div></div>` : ''}
      ${L.slaveSchedules ? `<div class="stat"><div class="v">${new Set([...L.slaveSchedules[1850].owners, ...L.slaveSchedules[1860].owners]).size}</div><div class="k">people in these cemeteries the 1850 or 1860 slave schedule lists as holding people in slavery, found so far. The people listed under them are named nowhere in these records</div></div>` : ''}
      <div class="stat"><div class="v">31%</div><div class="k">of Loudoun was Black in 1860, measured by the census</div></div>
      <div class="stat"><div class="v">4</div><div class="k">Pleasant Valley records before 1922, one of them corrupt</div></div>
      <div class="stat"><div class="v">31%</div><div class="k">of the 1990s' documented burials are at Pleasant Valley</div></div>
    </div>
    <div class="grid-2">
      ${demographyFigure(C.demography)}
      ${documentedFigure(C.documentedVsCounty)}
    </div>
    <div class="callout">The county line is <b>context, not a denominator</b>. Hamilton is one village; its three cemeteries are not a sample of Loudoun, and county proportions do not transfer to them arithmetically. The app never computes or implies a count of missing individuals. Loudoun's Black population fell in every decade from 1900 to 1950 while documented Pleasant Valley burials rose: the burials are the documentation arriving, the population is people leaving, and the decade differences understate the outflow because they ignore natural increase.</div>
    ${slaveScheduleSection(L.slaveSchedules, D)}
    ${census1870Section(L.census1870, D)}
    ${registerNamedSection(L.registerNamed, D)}
    ${certificatesSection(L.certificates, L.certificatesLinked)}
    ${certificatesWhiteSection(L.certificatesWhite, D)}
    <h3>Nearby communities the county records</h3>
    <p class="prose small">Loudoun County GIS lists ${C.communities.length} historic African American communities, churches, schools and lodges within five kilometres of Hamilton. They are listed on the <a href="#/map">map page</a>.</p>

    </section>
    <section class="tab-panel" id="rt-longevity" role="tabpanel" aria-labelledby="rtab-longevity" hidden>
    ${longevitySection(D.longevity)}
    </section>
    <section class="tab-panel" id="rt-naming" role="tabpanel" aria-labelledby="rtab-naming" hidden>
    ${namingSection(D.stones.naming)}
    </section>
    <section class="tab-panel" id="rt-papers" role="tabpanel" aria-labelledby="rtab-papers" hidden>
    <h2 data-k="1815 – 1960 · Virginia Chronicle">Newspapers: the Hamilton paper is two per cent of what survives</h2>
    ${papersFigure(C.papers)}
    <p class="prose">The Hamilton <em>Weekly Enterprise</em> has 113 issues; twelve digitised Loudoun papers hold ${n(C.papers.reduce((s, p) => s + p.issues, 0))} between them, and the Leesburg titles are far denser. Only two spans have nothing at all: 1844–1874 and 1925–1929.</p>
    <h3>Sickness in the town's own paper</h3>
    <ul class="era-list">${D.leads.healthNews.map(h => `<li><span class="when">${fmtDate(h.date, 'day')}, ${esc(h.paper)}</span><br>${esc(h.headline_or_snippet)}<span class="basis">${esc(h.what_it_establishes)}</span></li>`).join('')}</ul>
    <div class="source"><span>SOURCE</span>hamilton_health_news.csv · the Weekly Enterprise, read issue by issue</div>

    </section>
    <section class="tab-panel" id="rt-leads" role="tabpanel" aria-labelledby="rtab-leads" hidden>
    <h2 data-k="Not people in this record">Leads, which are not people in this record</h2>
    <p class="prose">Nothing below appears on the timeline. These are stones read in 1948 and absent now, and people the register or a newspaper places here without a surviving stone. They are research leads, kept separate so that no one is invented.</p>
    <h3>Stones read in 1948, absent now</h3>
    <ul class="era-list">${D.leads.lostStones.map(s => `<li>${esc(s.dar_1948_reading)} <span class="when">entry ${esc(s.dar_entry)}, ${esc(s.status)}</span><span class="basis">${esc(s.assessment)}</span></li>`).join('')}</ul>
    <h3>Likely buried here, no stone</h3>
    <ul class="era-list">${D.leads.candidates.map(c => `<li>${esc(c.name)}${c.death_date ? `, died ${esc(c.death_date)}` : ''}${c.age ? `, ${esc(c.age)}` : ''} <span class="when">${esc(c.record_type)}, ${esc(c.confidence)}${c.plot_suggested ? `, suggested ${esc(c.plot_suggested)}` : ''}</span><span class="basis">${esc(c.note)}</span></li>`).join('')}</ul>
    <h3>Declared research gaps</h3>
    <ul class="era-list">${D.undatedEvents.map(e => `<li>${esc(e.title)} <span class="when">no date established</span><span class="basis">${esc(e.note)}</span></li>`).join('')}</ul>
    <div class="source"><span>SOURCE</span>lost_stones.csv · candidate_missing_burials.csv · context_events.csv, rows with no date</div>
    </section>
    <section class="tab-panel" id="rt-check" role="tabpanel" aria-labelledby="rtab-check" hidden>
    <h2 data-k="${n(S.records.rows)} records · ${n(S.people)} people">Records and people</h2>
    <p class="prose">${n(S.folded)} records are the same person entered twice, once from each source, under a spelling variant or a maiden and a married name. The project's owner confirmed each pair ${decidedWords(S.duplicatesDecided)}; the app counts ${n(S.mergedPeople)} people once each and keeps every record in the data. ${n(S.maybePairs)} further pairs could not be confirmed and are counted separately, each naming the other. ${n(S.unresolvedPairs)} more are unresolved: a record with only a birth date, where that date is the death date of a record with a closely matching name, as though a death had been entered as a birth. They too are counted separately and name each other. The decisions are in <code>curation/duplicates.csv</code>. ${n(S.unresolvedRecords)} single records are unresolved for a like reason: the 1948 stone reading gives, as a death with an age at death, the date the record gives as a birth (<code>curation/unresolved.csv</code>).</p>
    <h2 data-k="APP_SPEC.md §9, as corrected by CLAUDE.md">Self-check against the specification</h2>
    <p class="prose small">Known-correct values from APP_SPEC.md §9 as corrected by CLAUDE.md, computed from the data this page is running on.</p>
    ${selfCheck(D)}
    <div class="source"><span>SOURCE</span>summary.json, built from data/ by scripts/build-data.mjs</div>
    ${COUNTING ? `<h2 data-k="About this site" style="margin-top:48px">Visits are counted</h2>
    <p class="prose small">So the project's owner can tell whether the site is used, it reports each visit to GoatCounter, a counting service: which of the five pages was opened, and which person's card. It sets no cookie and keeps nothing in your browser. What you type in a search box, and the date you stop the timeline on, are never sent.</p>` : ''}
    </section>
  `;
  // One section at a time. The tab is in the URL (#/record?tab=causes) so a
  // section can be linked; arrow keys move between tabs.
  const tabs = [...el.querySelectorAll('.tab')];
  const showTab = (key, push = true) => {
    if (!RECORD_TABS.some(([k]) => k === key)) key = 'burials';
    for (const b of tabs) { const on = b.dataset.tab === key; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    for (const p of el.querySelectorAll('.tab-panel')) p.hidden = p.id !== `rt-${key}`;
    if (push) history.replaceState(null, '', `#/record?tab=${key}`);
  };
  el.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) showTab(b.dataset.tab); });
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = tabs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (j >= 0) { e.preventDefault(); showTab(tabs[j].dataset.tab); tabs[j].focus(); }
  });
  el.addEventListener('click', e => { const b = e.target.closest('[data-person]'); if (b) { e.preventDefault(); ctx.openPerson(b.dataset.person); } });
  // ?at=<id> scrolls to one entry on the tab (from search) and marks it.
  const goTo = (p) => {
    showTab(p.tab || 'burials', false);
    if (!p.at) return;
    const li = el.querySelector(`#${CSS.escape(p.at)}`);
    if (!li) return;
    el.querySelectorAll('.found').forEach(x => x.classList.remove('found'));
    li.classList.add('found');
    requestAnimationFrame(() => li.scrollIntoView({ block: 'center' }));
  };
  el._onParams = goTo;
  goTo(params);
}

function burialsFigure(perDecade, docEras, D) {
  const W = 900, H = 260, L = 44, R = 12, T = 16, B = 70;
  const decades = []; for (let d = 1750; d <= 2020; d += 10) decades.push(d);
  const max = Math.max(...Object.values(perDecade));
  const x = (y) => L + (y - 1750) / (2030 - 1750) * (W - L - R);
  const bw = x(1760) - x(1750) - 2;
  const yy = (v) => T + (1 - v / max) * (H - T - B);
  const lanes = []; const laneOf = [];
  for (const e of docEras.slice().sort((a, b) => a.s.lo - b.s.lo)) {
    const lo = e.s.y, hi = e.open ? 2030 : (e.e ? e.e.y + 1 : lo + 1);
    let k = lanes.findIndex(end => end <= lo); if (k < 0) { k = lanes.length; lanes.push(hi); } else lanes[k] = hi;
    laneOf.push({ e, k, lo, hi });
  }
  return `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Burials per decade with documentation eras beneath">
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--hatch-ink)" stroke-width="1.5"/></pattern></defs>
    ${[0, 100, 200].map(v => `<line x1="${L}" x2="${W - R}" y1="${yy(v)}" y2="${yy(v)}" stroke="var(--rule)"/><text x="${L - 6}" y="${yy(v) + 4}" font-size="11" text-anchor="end" fill="var(--ink-2)">${v}</text>`).join('')}
    ${decades.map(d => { const v = perDecade[d] || 0; return `<rect x="${x(d) + 1}" y="${yy(v)}" width="${bw}" height="${yy(0) - yy(v)}" fill="var(--s1)" rx="2"><title>${d}s: ${v} burials</title></rect>${v ? `<text x="${x(d) + 1 + bw / 2}" y="${yy(v) - 5}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--ink)">${v}</text>` : ''}`; }).join('')}
    ${decades.filter(d => d % 50 === 0).map(d => `<text x="${x(d) + 1}" y="${yy(0) + 14}" font-size="11" fill="var(--ink-2)">${d}</text>`).join('')}
    ${laneOf.map(({ e, k, lo, hi }) => { const y = yy(0) + 22 + k * 11; const abs = D.absenceEraIds.has(e.id); return `<rect x="${x(lo)}" y="${y}" width="${x(Math.min(hi, 2030)) - x(lo)}" height="9" fill="${abs ? 'url(#hatch)' : 'var(--mute)'}" stroke="${abs ? 'var(--absence)' : 'none'}"><title>${esc(e.label)}: ${esc(e.basis)}</title></rect>`; }).join('')}
    <text x="${L}" y="${yy(0) + 22 + lanes.length * 11 + 10}" font-size="11" fill="var(--ink-2)">documentation eras beneath; hatched bands are gaps in the sources</text>
  </svg><div class="cap">Deaths per decade among the ${n(D.people.length)} people, from timeline_people.csv. <b>A measured count of records, not of deaths in the town.</b></div><div class="source"><span>SOURCE</span>timeline_people.csv, death year · context_eras.csv, documentation layer</div></div>`;
}

function causesFigure(R, D) {
  const W = 900, rowH = 34, L = 150, Rr = 20, y0 = 1815, y1 = 1950;
  const medical = D.datedEvents.filter(e => e.layer === 'medical' && e.iv.y >= y0 && e.iv.y <= y1);
  const x = (y) => L + (y - y0) / (y1 - y0) * (W - L - Rr);
  const groups = R.groups.filter(g => g.total > 0);
  const H = 40 + groups.length * rowH + 60;
  const maxY = Math.max(...groups.flatMap(g => Object.values(g.byYear)));
  const related = (g) => medical.filter(e => new RegExp(g.key === 'diphtheria' ? 'diphtheria|dip(h)?theria|antitoxin' : g.key === 'typhoid' ? 'typhoid|chlorinat|water' : g.key === 'dysentery' ? 'dysenter|chlorinat|water' : g.key === 'consumption' ? 'tubercul|consumption|streptomycin' : g.key === 'pneumonia' ? 'pneumonia|sulfonamide|penicillin' : g.key === 'scarlet' ? 'scarlet|streptococc|penicillin|sulfonamide' : g.key === 'whooping' ? 'whooping|pertussis' : g.key === 'croup' ? 'croup|diphtheria' : 'xxxx', 'i').test(e.title + ' ' + e.note));
  return `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Register deaths by cause and year, with the medical events that bear on each cause">
    ${[1820, 1840, 1860, 1880, 1900, 1920, 1940].map(y => `<line x1="${x(y)}" x2="${x(y)}" y1="30" y2="${H - 50}" stroke="var(--rule)"/><text x="${x(y)}" y="22" font-size="11" text-anchor="middle" fill="var(--ink-2)">${y}</text>`).join('')}
    ${medical.map(e => `<g><line x1="${x(e.iv.y)}" x2="${x(e.iv.y)}" y1="30" y2="${H - 50}" stroke="var(--ink-3)" stroke-dasharray="${e.confidence === 'verified' ? '0' : '3 3'}" stroke-opacity="0.5"/><title>${esc(e.title)} (${e.iv.y}${e.confidence !== 'verified' ? ', ' + e.confidence : ''}). ${esc(e.note)} Source: ${esc(e.source)}</title></g>`).join('')}
    ${groups.map((g, i) => {
      const y = 40 + i * rowH, base = y + rowH - 8;
      const bars = Object.entries(g.byYear).map(([yr, v]) => `<rect x="${x(+yr) - 1.5}" y="${base - Math.max(2, v / maxY * (rowH - 12))}" width="3" height="${Math.max(2, v / maxY * (rowH - 12))}" fill="var(--s2)" rx="1"><title>${esc(g.label)}, ${yr}: ${v}</title></rect>`).join('');
      const marks = related(g).map(e => `<g><circle cx="${x(e.iv.y)}" cy="${base - 2}" r="5" fill="${e.confidence === 'verified' ? 'var(--s3)' : 'var(--stone)'}" stroke="var(--s3)" stroke-width="1.5"/><title>${esc(e.title)} (${e.iv.y}): ${esc(e.note)}</title></g>`).join('');
      const first = g.first, last = g.last, cures = related(g).map(e => e.iv.y).filter(yy => yy > last);
      const gap = cures.length ? `<line x1="${x(last)}" x2="${x(Math.min(...cures))}" y1="${base - 2}" y2="${base - 2}" stroke="var(--ink-3)" stroke-dasharray="2 3"/>` : '';
      return `<g><text x="${L - 10}" y="${base - 6}" font-size="13" font-weight="700" text-anchor="end" fill="var(--ink)">${esc(g.label)}</text><text x="${L - 10}" y="${base + 7}" font-size="10.5" text-anchor="end" fill="var(--ink-2)">${g.total} entries, ${first}–${last}</text><line x1="${L}" x2="${W - Rr}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="var(--rule)"/>${gap}${bars}${marks}</g>`;
    }).join('')}
    <text x="${L}" y="${H - 28}" font-size="11" fill="var(--ink-2)">orange bars: register entries per year. green dots: medical events bearing on that cause (hollow where the date is unverified).</text>
    <text x="${L}" y="${H - 12}" font-size="11" fill="var(--ink-2)">dotted: the years between the last register entry and the event.</text>
  </svg><div class="cap">Hover a bar or a dot for the entry count, the event and its source. The register ends in 1900, which is why the bars stop long before the cures: for the later stretch the medical narrative rests on the national event layer alone, not on the burials.</div><div class="source"><span>SOURCE</span>loudoun_deaths.csv, cause as spelled · context_events.csv, medical layer</div>
  <details class="more"><summary>The ${medical.length} medical events on this chart</summary><ul class="era-list">${medical.map(e => `<li>${e.iv.y}: ${esc(e.title)}${e.confidence !== 'verified' ? ` <span class="conf-${e.confidence}">${e.confidence}</span>` : ''}<span class="basis">${esc(e.note)} <span class="muted">(${esc(e.source)})</span></span></li>`).join('')}</ul></details></div>`;
}

function papersFigure(papers) {
  const y0 = 1815, y1 = 1960, pct = (y) => (y - y0) / (y1 - y0) * 100;
  const voids = [[1844, 1874], [1925, 1929]];
  return `<div class="gantt-axis"><span></span><span class="ax">${[1820, 1850, 1880, 1910, 1940].map(y => `<span>${y}</span>`).join('')}</span><span>issues</span></div>
    ${papers.map(p => `<div class="gantt-row"><span>${esc(p.paper)} <span class="muted">${esc(p.place.toLowerCase().replace(/^\w/, c => c.toUpperCase()))}</span></span><span class="track"><i class="${p.code === 'TWEP' ? 'here' : ''}" style="left:${pct(p.first_year)}%;width:${Math.max(0.5, pct(p.last_year + 1) - pct(p.first_year))}%"></i></span><span class="n">${n(p.issues)}</span></div>`).join('')}
    <div class="gantt-row"><span class="muted">no Loudoun paper digitised</span><span class="track">${voids.map(([a, b]) => `<i class="void" style="left:${pct(a)}%;width:${pct(b + 1) - pct(a)}%" title="${a}–${b}"></i>`).join('')}</span><span></span></div>
    <div class="figure"><div class="cap">Twelve digitised Loudoun newspapers on Virginia Chronicle, by years covered. The Hamilton paper is the orange bar. Hatched: the two spans no paper covers.</div><div class="source"><span>SOURCE</span>loudoun_papers.csv · Virginia Chronicle holdings</div></div>`;
}

function occupationsTable(D) {
  const years = [1880, 1900, 1910, 1920, 1930, 1940, 1950];
  const rows = years.map(y => {
    const matched = D.people.filter(p => p.census.some(c => c.y === y));
    const occ = {};
    for (const p of matched) for (const c of p.census) if (c.y === y && c.occ && !/^at school$/i.test(c.occ)) occ[c.occ] = (occ[c.occ] || 0) + 1;
    const top = Object.entries(occ).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { y, matched: matched.length, stated: Object.values(occ).reduce((s, v) => s + v, 0), top };
  });
  return `<table class="tbl"><thead><tr><th>census</th><th class="n">interred matched</th><th class="n">with an occupation</th><th>commonest, among those matched</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.y}</td><td class="n">${r.matched}</td><td class="n">${r.stated}</td><td>${r.top.map(([k, v]) => `${esc(k)} <span class="muted">${v}</span>`).join(', ') || '<span class="muted">none stated</span>'}</td></tr>`).join('')}
  </tbody></table>
  <p class="prose small" style="margin-top:8px">"At school" is left out of the commonest list. A match marked name-only is weaker than one on name and birth year; each person's record says which.</p>`;
}

function selfCheck(D) {
  const S = D.summary, R = S.records;
  const checks = [
    ['Records, as data/timeline_people.csv holds them', null],
    ['timeline_people.csv rows', R.rows, 2732], ['timeline_usable = yes', R.usable.yes, 2572], ['timeline_usable = no', R.usable.no, 63], ['death-only', R.usable.deathOnly, 50], ['birth-only', R.usable.birthOnly, 47],
    ['Lakeview', R.cemeteries.L, 2101], ['Harmony', R.cemeteries.H, 263], ['Pleasant Valley', R.cemeteries.P, 368], ['cause_of_death populated', R.cod, 17], ['stone_1948 populated', R.stone, 744], ['date_disputed = yes', R.disputed, 22],
    ['matched to a census', R.censusMatched, 374], ['with a census occupation', R.censusOccupation, 212], ['context_events.csv rows', S.events, 137], ['context_eras.csv rows', S.eras, 30],
    ['People, after the owner-confirmed duplicates are counted once', null],
    ['people', S.people, 2681], ['records folded into another', S.folded, 51], ['timeline_usable = yes', S.usable.yes, 2521],
    ['Lakeview', S.cemeteries.L, 2065], ['Harmony', S.cemeteries.H, 254], ['Pleasant Valley', S.cemeteries.P, 362], ['with a 1948 stone reading', S.stone, 743],
    ['alive in 1800', D.popByYear.get(1800), 11], ['alive in 1850', D.popByYear.get(1850), 327], ['alive in 1900', D.popByYear.get(1900), 1232], ['alive in 1927 (peak)', D.popByYear.get(1927), 1429], ['alive in 1950', D.popByYear.get(1950), 1256], ['alive in 2000', D.popByYear.get(2000), 413],
  ];
  return `<table class="tbl"><thead><tr><th>check</th><th class="n">computed</th><th class="n">expected</th><th></th></tr></thead><tbody>${checks.map(([k, v, e]) => v === null ? `<tr><td colspan="4" class="serif" style="padding-top:14px">${k}</td></tr>` : `<tr><td>${k}</td><td class="n">${n(v)}</td><td class="n">${n(e)}</td><td>${v === e ? 'agrees' : 'DISAGREES'}</td></tr>`).join('')}</tbody></table>`;
}
