// The four secondary views: People, Families, The record, 1853 map.
// Each is a render function that fills a <section>. Charts are inline SVG
// with one axis each; aggregates are labelled as measured; absences as absent.

import { fmtDate, lifeSpan, interval, n, CEMETERY_NAME, CEMETERY_LONG, dayOf, yearStart } from './derive.js';
import { esc } from './timeline.js';

// Presence filters: "the record has X for this person". They say what the
// sources reach, never what the other people lacked.
const HAS = {
  stone: p => !!p.stone, family: p => p.fam.length > 0, register: p => !!(p.cod || p.regVerbatim), census: p => p.census.length > 0, disputed: p => p.disp, veteran: p => p.vet || !!p.mil,
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export function renderPeople(el, D, ctx, params = {}) {
  const state = { q: params.q || '', cem: '', status: '', has: new Set(), sort: 'surname', limit: 200 };
  el.innerHTML = `
    <h1 data-k="Three cemeteries · 1754 – 2026">People</h1>
    <p class="lede">All ${n(D.people.length)} people in the record, including the ${n(D.people.length - D.spans.length)} who cannot be placed on a span and are listed here with the reason.</p>
    <div class="filters">
      <input type="search" id="pp-q" placeholder="Name, surname, plot or id" value="${esc(state.q)}" aria-label="Search people">
      <select id="pp-cem" aria-label="Cemetery"><option value="">All cemeteries</option><option value="L">Lakeview</option><option value="H">Harmony</option><option value="P">Pleasant Valley</option></select>
      <select id="pp-status" aria-label="Timeline status"><option value="">Any timeline status</option><option value="yes">Placeable (birth and death)</option><option value="birth-only">Birth only</option><option value="death-only">Death only</option><option value="no">Not placeable</option></select>
      <select id="pp-sort" aria-label="Sort"><option value="surname">Sort by surname</option><option value="birth">Sort by birth</option><option value="death">Sort by death</option><option value="age">Sort by age at death</option></select>
      ${['stone', 'family', 'register', 'census', 'disputed', 'veteran'].map(h => `<button class="chip" data-has="${h}" aria-pressed="false">has ${h === 'stone' ? '1948 stone reading' : h === 'register' ? 'register entry' : h === 'census' ? 'census match' : h === 'disputed' ? 'disputed date' : h === 'veteran' ? 'military service' : 'family link'} (${n(D.people.filter(HAS[h]).length)})</button>`).join('')}
    </div>
    <div class="count-line" id="pp-count"></div>
    <div class="rows people-rows" id="pp-rows"></div>
    <button class="btn btn-text btn-more" id="pp-more" hidden>Show more</button>
    <div class="source"><span>SOURCE</span>timeline_people.csv · presence chips count what the sources reach, not what the other people lacked</div>`;
  const has = HAS;
  const sorters = {
    surname: (a, b) => (a.surname || '~').localeCompare(b.surname || '~') || a.name.localeCompare(b.name),
    birth: (a, b) => (a.by ?? 9999) - (b.by ?? 9999), death: (a, b) => (a.dy ?? 9999) - (b.dy ?? 9999), age: (a, b) => (b.age ?? -1) - (a.age ?? -1),
  };
  const draw = () => {
    const q = state.q.toLowerCase();
    let rows = D.people.filter(p => (!q || p.name.toLowerCase().includes(q) || (p.surname || '').toLowerCase().includes(q) || (p.plot || '').toLowerCase() === q || p.id.toLowerCase() === q)
      && (!state.cem || p.cem === state.cem) && (!state.status || p.use === state.status) && [...state.has].every(h => has[h](p)));
    rows.sort(sorters[state.sort]);
    el.querySelector('#pp-count').textContent = `${n(rows.length)} of ${n(D.people.length)}`;
    el.querySelector('#pp-rows').innerHTML = rows.slice(0, state.limit).map(p => `<a class="row" href="#/person/${p.id}" data-person="${p.id}">
      <span class="name"><span class="dot ${p.cem}"></span>${esc(p.name)}${p.disp ? '<span class="pos">disputed date</span>' : ''}</span>
      <span class="dates">${esc(lifeSpan(p).replace(/ – /, ' – '))}${p.use !== 'yes' ? ` <span class="tag">${esc(p.use === 'no' ? 'not placeable' : p.use)}</span>` : ''}</span>
      <span class="flags">${p.plot ? `<span class="plot">${esc(p.plot)}</span>` : ''}${p.stone ? '<span class="has">stone</span>' : ''}${p.fam.length ? '<span class="has">family</span>' : ''}${p.cod || p.regVerbatim ? '<span class="has">register</span>' : ''}${p.census.length ? '<span class="has">census</span>' : ''}${p.vet || p.mil ? '<span class="has">military</span>' : ''}</span></a>`).join('') || '<p class="empty">No one matches. The search looks at name, surname, exact plot and id.</p>';
    el.querySelector('#pp-more').hidden = rows.length <= state.limit;
  };
  el.querySelector('#pp-q').addEventListener('input', e => { state.q = e.target.value.trim(); state.limit = 200; draw(); });
  el.querySelector('#pp-cem').addEventListener('change', e => { state.cem = e.target.value; draw(); });
  el.querySelector('#pp-status').addEventListener('change', e => { state.status = e.target.value; draw(); });
  el.querySelector('#pp-sort').addEventListener('change', e => { state.sort = e.target.value; draw(); });
  el.querySelectorAll('[data-has]').forEach(b => b.addEventListener('click', () => { const h = b.dataset.has; state.has.has(h) ? state.has.delete(h) : state.has.add(h); b.classList.toggle('on'); b.setAttribute('aria-pressed', String(state.has.has(h))); draw(); }));
  el.querySelector('#pp-more').addEventListener('click', () => { state.limit += 400; draw(); });
  el.querySelector('#pp-rows').addEventListener('click', e => { const r = e.target.closest('[data-person]'); if (r) { e.preventDefault(); ctx.openPerson(r.dataset.person); } });
  draw();
}

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------
export function renderFamilies(el, D, ctx) {
  const F = D.family;
  const withLink = D.people.filter(p => p.fam.length).length;
  const spouse = D.people.filter(p => p.fam.some(f => f.rel === 'spouse')).length;
  const parent = D.people.filter(p => p.fam.some(f => f.rel === 'parent')).length;
  const child = D.people.filter(p => p.fam.some(f => f.rel === 'child')).length;
  const genuine = F.lossesCemetery.filter(c => c.assessment === 'apparent genuine loss cluster').sort((a, b) => b.n_lost - a.n_lost || (a.span_days ?? 999) - (b.span_days ?? 999));
  const dups = F.lossesCemetery.filter(c => c.assessment !== 'apparent genuine loss cluster');
  const register = F.losses.slice().sort((a, b) => b.n_lost - a.n_lost || (a.span_days ?? 999) - (b.span_days ?? 999));
  const plink = (x) => x.id ? `<button class="plink" data-person="${x.id}">${esc(x.text)}</button>` : esc(x.text);

  el.innerHTML = `
    <h1 data-k="Links resolved from stones and the register">Families</h1>
    <p class="lede">Family links reach ${n(withLink)} of the ${n(D.people.length)} people. Most stones never stated a relationship, so for about ${Math.round((1 - withLink / D.people.length) * 100)}% of people the record is silent. Silence is not evidence of no family.</p>
    <div class="stat-row">
      <div class="stat"><div class="v">${n(withLink)}</div><div class="k">people with at least one resolved link</div></div>
      <div class="stat"><div class="v">${n(spouse)}</div><div class="k">with a spouse named</div></div>
      <div class="stat"><div class="v">${n(parent)}</div><div class="k">with a parent named</div></div>
      <div class="stat"><div class="v">${n(child)}</div><div class="k">with a child named</div></div>
      <div class="stat absence"><div class="v">0</div><div class="k">marriage dates in any source gathered so far</div></div>
    </div>
    <p class="prose">Every link was resolved by name and surname inside the same cemetery, preferring the same plot, and then tested against both people's dates. Links that failed the date check are kept out of the family views. Each link's basis is shown on the person's record.</p>

    ${widowhoodSection(D.stones.widowhood, spouse)}

    <h2 data-k="${genuine.length} plot clusters · ${register.length} register families">More than one death in one family, inside one window</h2>
    <p class="prose">These are properties of a family in a window of days, not flags on individuals. The first set comes from the stones: people in one plot who share a surname or a recorded family link and died within ninety days of each other. A plot here is often shared by several families, so dying close together in one plot is not shown as one family's loss unless the stones tie the people together. The second comes from the county death register's own parents field, and those families are county-wide: they are not placed on a grave here unless a person was matched.</p>
    <h3>From the stones: ${genuine.length} plot clusters</h3>
    <div class="cards">${genuine.map(c => `<div class="card"><h4>Plot ${esc(c.plot)}, ${esc(c.cemetery)}</h4><div class="meta">${c.n_lost} died ${c.span_days === 0 ? 'on one day' : `within ${c.span_days} days`}, ${fmtDate(c.first_death, 'day', { short: true })}${c.span_days ? ` to ${fmtDate(c.last_death, 'day', { short: true })}` : ''}</div><ul>${c.people.map(x => `<li>${plink(x)}</li>`).join('')}</ul></div>`).join('')}</div>
    <details class="more"><summary>${dups.length} further plot clusters are likely duplicate records, not losses</summary><div class="cards" style="margin-top:10px">${dups.map(c => `<div class="card dup"><h4>Plot ${esc(c.plot)}, ${esc(c.cemetery)}</h4><div class="meta">${esc(c.assessment)}</div><ul>${c.people.map(x => `<li>${plink(x)}</li>`).join('')}</ul></div>`).join('')}</div></details>
    <h3>From the county register: ${register.length} families</h3>
    <div class="cards">${register.map(c => `<div class="card register"><h4>${esc(titleCase(c.family))}</h4><div class="meta">${c.year}: ${c.n_lost} died${c.span_days !== null ? ` within ${c.span_days === 0 ? 'a day' : c.span_days + ' days'}` : ', days not given'}${c.all_children === 'yes' ? ', all children' : ''}</div><ul>${c.people.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${c.causes ? `<div class="cause" style="margin-top:6px">${esc(c.causes.replace(/;/g, ', '))}</div>` : ''}<div class="cause">County register, page ${esc(c.src_pages)}. Not placed on a grave here.</div></div>`).join('')}</div>

    <h2 data-k="1800 – 1930">Births, by family</h2>
    <p class="prose">When children arrived. On the register side the birth date is reconstructed from an age at death given to the day, so a register family is the set of children <em>lost</em>, not the set born: counts are floors and gaps are measured only between children who both died. The cemetery side uses birth dates carved on stones and resolved parent links, and has a milder version of the same bias.</p>
    ${birthsFigure(F.births)}

    <h2 data-k="1840 – 1940 · no marriage record in any source">Remarriage, bounded</h2>
    <p class="prose">The project holds no marriage records. For ${F.marriages.length} people with two resolved spouses a window can be bounded: the first spouse's death gives the earliest the second marriage could begin, and the eldest resolved child of the second marriage, where there is one, gives the latest.</p>
    ${marriagesFigure(F.marriages)}
    <div class="source"><span>SOURCE</span>relationships_v2.csv · family_losses_cemetery.csv · family_losses.csv · family_births.csv · marriage_windows.csv</div>
  `;
  el.addEventListener('click', e => { const b = e.target.closest('[data-person]'); if (b) { e.preventDefault(); ctx.openPerson(b.dataset.person); } });
}
function titleCase(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }
function birthsFigure(births) {
  const rows = births.slice().sort((a, b) => (a.first_birth || '').localeCompare(b.first_birth || ''));
  const y0 = 1800, y1 = 1930;
  const x = (iso) => { const iv = interval(iso, 'day') || interval(iso, 'year'); if (!iv) return null; return ((iv.lo - dayOf(y0)) / (dayOf(y1) - dayOf(y0))) * 100; };
  return `<div class="gantt-axis"><span></span><span class="ax">${[1800, 1830, 1860, 1890, 1920].map(y => `<span>${y}</span>`).join('')}</span><span></span></div>
    ${rows.map(b => {
      const kids = b.children.map(c => { const m = /b\.(\d{4}(?:-\d{2}(?:-\d{2})?)?)/.exec(c); return m ? x(m[1]) : null; }).filter(v => v !== null);
      const a = x(b.first_birth), z = x(b.last_birth);
      return `<div class="gantt-row" title="${esc(b.caveat)}"><span>${esc(b.family)} <span class="muted">${b.source.startsWith('register') ? 'register' : 'stones'}</span></span><span class="track">${a !== null && z !== null ? `<i style="left:${a}%;width:${Math.max(0.4, z - a)}%;background:var(--rule)"></i>` : ''}${kids.map(k => `<i style="left:calc(${k}% - 2px);width:4px;background:var(--ink)"></i>`).join('')}</span><span class="n">${b.n_children_recorded}</span></div>`;
    }).join('')}
    <div class="figure"><div class="cap">Each mark is a child's recorded or reconstructed birth; the grey span runs first to last. Median gap between siblings across both sides is 48 months. <b>Register rows count only children who died.</b></div><div class="source"><span>SOURCE</span>family_births.csv</div></div>`;
}
function marriagesFigure(ms) {
  const y0 = 1840, y1 = 1940, pct = (y) => (y - y0) / (y1 - y0) * 100;
  return `<div class="gantt-axis"><span></span><span class="ax">${[1840, 1860, 1880, 1900, 1920, 1940].map(y => `<span>${y}</span>`).join('')}</span><span></span></div>
    ${ms.map(m => `<div class="gantt-row" title="${esc(m.basis)}"><span><button class="plink" data-person="${m.person_id}">${esc(m.person_name)}</button></span><span class="track">${m.not_after ? `<i class="here" style="left:${pct(m.not_before)}%;width:${Math.max(0.6, pct(m.not_after) - pct(m.not_before))}%"></i>` : `<i style="left:${pct(m.not_before)}%;width:2px;background:var(--ink)"></i><i style="left:${pct(m.not_before)}%;right:0;background:linear-gradient(90deg,var(--ink-3),transparent)"></i>`}</span><span class="n">${m.not_before}${m.not_after ? `–${m.not_after}` : '+'}</span></div>`).join('')}
    <div class="figure"><div class="cap">A solid span is a bounded window; a fading line is a lower bound only, with no upper bound in any source. <b>Lewis Taylor remarried between 1857 and 1860.</b></div><div class="source"><span>SOURCE</span>marriage_windows.csv</div></div>`;
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------
const RECORD_TABS = [
  ['burials', 'Burials by decade'], ['causes', 'Causes of death'], ['work', 'Work'], ['absent', 'Who is not here'], ['longevity', 'Years lived'], ['naming', 'How the stones name people'],
  ['papers', 'Newspapers'], ['leads', 'Leads'], ['check', 'Self-check'],
];
export function renderRecord(el, D, ctx, params = {}) {
  const S = D.summary, C = D.context, R = D.register, L = D.leads;
  const docEras = D.eras.filter(e => e.layer === 'documentation');
  el.innerHTML = `
    <h1 data-k="What the sources contain, and where they stop">The record</h1>
    <p class="lede">What the sources contain, where they fall silent, and what the app is therefore allowed to say. Three kinds of thing appear in this app and they rest on different evidence: a documented person, a measured count, and an absence of record.</p>
    <div class="stat-row">
      <div class="stat"><div class="v">${n(S.people)}</div><div class="k">people, in ${n(S.records.rows)} records each traced to a source</div></div>
      <div class="stat"><div class="v">${n(S.usable.yes)}</div><div class="k">placeable from birth to death</div></div>
      <div class="stat"><div class="v">${n(S.stone)}</div><div class="k">Lakeview stones read in 1948; none recorded for Harmony or Pleasant Valley</div></div>
      <div class="stat"><div class="v">${n(S.censusMatched)}</div><div class="k">matched to at least one census</div></div>
      <div class="stat"><div class="v">${n(S.cod)}</div><div class="k">with a cause of death</div></div>
      <div class="stat"><div class="v">${n(S.disputed)}</div><div class="k">with a disputed date, both readings kept</div></div>
    </div>

    <p class="prose small-prose">${n(S.folded)} records are the same person entered twice, once from each source, under a spelling variant or a maiden and a married name. The project's owner confirmed each pair on 29 October 2026; the app counts ${n(S.mergedPeople)} people once each and keeps every record in the data. ${n(S.maybePairs)} further pairs could not be confirmed and are counted separately, each naming the other. ${n(S.unresolvedPairs)} more are unresolved: a record with only a birth date, where that date is the death date of a record with a closely matching name, as though a death had been entered as a birth. They too are counted separately and name each other. The decisions are in <code>curation/duplicates.csv</code>. ${n(S.unresolvedRecords)} single records are unresolved for a like reason: the 1948 stone reading gives, as a death with an age at death, the date the record gives as a birth (<code>curation/unresolved.csv</code>).</p>
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
      <div class="stat"><div class="v">31%</div><div class="k">of Loudoun was Black in 1860, measured by the census</div></div>
      <div class="stat"><div class="v">4</div><div class="k">Pleasant Valley records before 1922, one of them corrupt</div></div>
      <div class="stat"><div class="v">31%</div><div class="k">of the 1990s' documented burials are at Pleasant Valley</div></div>
    </div>
    <div class="grid-2">
      ${demographyFigure(C.demography)}
      ${documentedFigure(C.documentedVsCounty)}
    </div>
    <div class="callout">The county line is <b>context, not a denominator</b>. Hamilton is one village; its three cemeteries are not a sample of Loudoun, and county proportions do not transfer to them arithmetically. The app never computes or implies a count of missing individuals. Loudoun's Black population fell in every decade from 1900 to 1950 while documented Pleasant Valley burials rose: the burials are the documentation arriving, the population is people leaving, and the decade differences understate the outflow because they ignore natural increase.</div>
    ${registerNamedSection(L.registerNamed, D)}
    ${certificatesSection(L.certificates, L.certificatesLinked)}
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
    <h2 data-k="APP_SPEC.md §9, as corrected by CLAUDE.md">Self-check against the specification</h2>
    <p class="prose small">Known-correct values from APP_SPEC.md §9 as corrected by CLAUDE.md, computed from the data this page is running on.</p>
    ${selfCheck(D)}
    <div class="source"><span>SOURCE</span>summary.json, built from data/ by scripts/build-data.mjs</div>
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
// ---------------------------------------------------------------------------
// How the stones name people: the 1948 survey's relationship phrases, by
// period of death. Shares are of all adult (or child) stones: the record has
// no field for sex and the app does not guess it from names. Every count
// comes with the stones themselves, so the numbers lead back to people.
// ---------------------------------------------------------------------------
const pct = (k, total) => (total ? Math.round(100 * k / total) : 0);
const stoneList = (list) => `<ul class="stone-list">${list.map(s => `<li><button class="plink" data-person="${s.id}">${esc(s.name)}</button> <span class="muted">${s.dy !== null && s.dy !== undefined ? `d. ${s.dy}` : 'no death recorded'}${s.age !== null && s.age !== undefined ? `, aged ${s.age}` : ''}</span><span class="stone-line">${esc(s.text)}</span></li>`).join('')}</ul>`;
export function namingSection(N) {
  const P = N.periods, O = N.openDate, wife = N.wifeOf.length, husband = N.husbandOf.length, kids = N.childOf.length;
  const W = 900, x0 = 250, x1 = 700, dy = 34, T = 34, rows = [];
  P.forEach(p => rows.push({ lab: p.label, k: p.wifeOf, of: p.adults, col: 'var(--s2)' }));
  P.forEach(p => rows.push({ lab: p.label, k: p.childOf, of: p.kids, col: 'var(--s1)' }));
  const gap = 18, H = T + rows.length * dy + gap + 40, X = v => x0 + (x1 - x0) * v / 100;
  const groups = [['Adults', "named as someone's wife"], ['Children under 20', 'named as a son or daughter']];
  const fig = `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of stones naming a person as a wife, or as a son or daughter, by period of death">
    ${[0, 25, 50, 75, 100].map(v => `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 8}" y2="${T + rows.length * dy + gap}" stroke="var(--rule)"/><text x="${X(v)}" y="${H - 12}" font-size="12" text-anchor="middle" fill="var(--ink-3)">${v}%</text>`).join('')}
    ${rows.map((r, i) => {
      const y = T + i * dy + dy / 2 + (i >= P.length ? gap : 0), v = pct(r.k, r.of), g = groups[i < P.length ? 0 : 1];
      return `${i % P.length === 0 ? `<text x="12" y="${y + 4}" font-size="13.5" font-weight="700" fill="var(--ink)">${g[0]}</text><text x="12" y="${y + 21}" font-size="12" fill="var(--ink-3)">${g[1]}</text>` : ''}
        <text x="${x0 - 16}" y="${y + 4}" font-size="13" text-anchor="end" fill="var(--ink-2)">${r.lab}</text>
        <line x1="${X(0)}" x2="${X(v)}" y1="${y}" y2="${y}" stroke="${r.col}" stroke-width="2.5"/><circle cx="${X(v)}" cy="${y}" r="6" fill="${r.col}" stroke="var(--stone)" stroke-width="2"/>
        <text x="${X(v) + 14}" y="${y + 5}" font-size="14" font-weight="700" fill="${r.col}">${v}%</text><text x="${X(v) + 56}" y="${y + 5}" font-size="13" fill="var(--ink-3)">${r.k} of ${n(r.of)} stones</text>`; }).join('')}
  </svg></div>`;
  const first = P[0], last = P[P.length - 1];
  return `
    <h2 data-k="The 1948 survey · Lakeview · ${n(N.read)} stones">How the stones name people</h2>
    <p class="prose">In 1948 the DAR surveyors read Lakeview's standing stones and typed what identified each person: name, dates, age, and sometimes a relationship. The project has the survey for Lakeview only; Harmony and Pleasant Valley have no 1948 readings in this record. None of the ${n(N.read)} transcriptions carries a verse, a religious phrase or a word like "Mother", so whatever else the stones say is not in this record.</p>
    <div class="callout"><p>On <b>${n(wife)} adult stones</b> a woman is named as someone's wife. On <b>${husband === 1 ? 'one' : n(husband)}</b> a man is named as someone's husband.</p><p class="narr-2">Children were named through their parents on ${pct(first.childOf, first.kids)}% of children's stones before 1900 and on ${pct(last.childOf, last.kids)}% by ${last.label}. Both habits faded over the period.</p></div>
    ${fig}
    <p class="prose small-prose">Each share is of all adult stones, or all children's stones, from deaths in that period. The record has no field for sex and the app does not guess it from names, so it cannot say what share of women's stones name a husband. Adults are people who reached 20. ${n(N.read - N.dated)} stones are left out of the shares: their age at death is not recorded, or the death came after the survey.</p>
    <details class="more"><summary>The ${n(wife)} stones that name a wife</summary>${stoneList(N.wifeOf)}</details>
    <details class="more"><summary>The ${husband === 1 ? 'one stone that names' : n(husband) + ' stones that name'} a husband</summary>${stoneList(N.husbandOf)}</details>
    <details class="more"><summary>The ${n(kids)} children named as a son or daughter</summary>${stoneList(N.childOf)}</details>
    <h3>Death dates left open</h3>
    <p class="prose">${n(O.after.length + O.noDeath.length + O.neverCut.length)} stones had a name cut and the death date left open when the survey read them, as in "1874 –" or "1883 – 19--". For <b>${n(O.after.length)}</b> the death came after 1950, when the survey was finished: the name was on the stone while the person was alive, usually beside someone already buried. For <b>${n(O.noDeath.length)}</b> no source in this record gives a death at all. For <b>${n(O.neverCut.length)}</b> the death is recorded by 1950 but the date was not yet on the stone.</p>
    <details class="more"><summary>The ${n(O.after.length)} names cut before the death</summary>${stoneList(O.after)}</details>
    <details class="more"><summary>The ${n(O.noDeath.length)} with no death in this record</summary>${stoneList(O.noDeath)}</details>
    <details class="more"><summary>The ${n(O.neverCut.length)} whose date was not yet cut</summary>${stoneList(O.neverCut)}</details>
    <div class="source"><span>SOURCE</span>timeline_people.csv: stone_1948, death_year, age_at_death · the DAR Genealogical Records Committee survey, 1948, as transcribed for Lakeview</div>`;
}

// ---------------------------------------------------------------------------
// The one who lived on: years between the two deaths of a resolved couple.
// Whole years between death years, since many dates are known only to the
// year. No sex in the record, so no claim about wives against husbands.
// ---------------------------------------------------------------------------
function widowhoodSection(Wd, spouseNamed) {
  const mx = Math.max(...Wd.buckets.map(b => b.n)), W = 900, x0 = 170, x1 = 640, dy = 34, T = 16;
  const H = T + Wd.buckets.length * dy + 10, X = v => x0 + (x1 - x0) * v / mx;
  const fig = `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Couples by years between the two deaths">
    ${Wd.buckets.map((b, i) => { const y = T + i * dy + dy / 2, long = b.lo >= 20, col = long ? 'var(--s2)' : 'var(--s1)';
      return `<text x="${x0 - 16}" y="${y + 4}" font-size="13.5" text-anchor="end" fill="${long ? 'var(--ink)' : 'var(--ink-2)'}">${b.label}</text>
        <line x1="${X(0)}" x2="${X(b.n)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="2.5"/><circle cx="${X(b.n)}" cy="${y}" r="6" fill="${col}" stroke="var(--stone)" stroke-width="2"/>
        <text x="${X(b.n) + 14}" y="${y + 5}" font-size="14" font-weight="700" fill="${col}">${b.n}</text><text x="${X(b.n) + 42}" y="${y + 5}" font-size="13" fill="var(--ink-3)">couples</text>`; }).join('')}
  </svg></div>`;
  return `
    <h2 data-k="${n(Wd.couples)} couples with both deaths dated">The one who lived on</h2>
    <p class="prose">For ${n(Wd.couples)} of the ${n(Wd.linked)} resolved marriages, both deaths have a year. Between the first death and the second lay a median of <b>${f1(Wd.median)} years</b>. In ${n(Wd.atLeast20)} marriages one partner lived on twenty years or more, and in ${n(Wd.atLeast30)}, thirty or more.</p>
    <div class="stat-row">
      <div class="stat"><div class="v">${n(Wd.couples)}</div><div class="k">couples with both deaths dated</div></div>
      <div class="stat"><div class="v">${f1(Wd.median)}</div><div class="k">median years between the two deaths</div></div>
      <div class="stat"><div class="v">${n(Wd.atLeast20)}</div><div class="k">one lived on twenty years or more</div></div>
      <div class="stat"><div class="v">${n(Wd.atLeast30)}</div><div class="k">thirty years or more</div></div>
    </div>
    ${fig}
    <h3>Thirty years or more</h3>
    <ul class="stone-list">${Wd.long.map(c => `<li><button class="plink" data-person="${c.last.id}">${esc(c.last.name)}</button> lived on <b>${c.years} years</b> after <button class="plink" data-person="${c.first.id}">${esc(c.first.name)}</button> <span class="muted">(${c.first.dy} to ${c.last.dy})</span></li>`).join('')}</ul>
    <p class="prose small-prose">Counted in whole years between the two death years, since many dates are known only to the year. ${n(Wd.missingYear)} marriages lack a death year on one side and ${n(Wd.disputedOut)} rest on a disputed date; they are left out.${Wd.sameCouple ? ` ${Wd.sameCouple === 1 ? 'One marriage appears' : n(Wd.sameCouple) + ' marriages appear'} twice, because both partners were entered once from each source with identical dates; ${Wd.sameCouple === 1 ? 'it is' : 'each is'} counted once.` : ''} Only ${n(spouseNamed)} people here have a spouse named at all, so these are the record's marriages, not the town's. "Lived on" says nothing about remarriage, which the record seldom shows. The record has no field for sex, so it cannot say whether wives or husbands more often outlived the other.</p>
    <div class="source"><span>SOURCE</span>timeline_people.csv: spouse_ids, death_year, date_disputed · links as resolved for the family views</div>`;
}

// ---------------------------------------------------------------------------
// Years lived: median age at death of adults, Lakeview and Pleasant Valley.
// Rules (owner's brief for this section): never "life expectancy"; n beside
// every median; the 2000-2026 difference is not established and is not
// printed as a finding; say these are two burial populations, not two samples
// of the town; attribute no cause; no ranking, no claim about any person.
// ---------------------------------------------------------------------------
const f1 = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const fmtCI = ([a, b]) => `${a < 0 ? '−' + f1(-a) : f1(a)} to ${f1(b)}`;
const fmtP = (p) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);
export function longevitySection(L) {
  const first = L.eras[0], last = L.eras[L.eras.length - 1];
  const POP = 'These are two burial populations, not two samples of Hamilton: who chose each ground, and who received a dated stone, differ between them.';
  const eraBlock = (e) => `<div class="era-block">
      <div class="era-when">${e.lo} – ${e.hi}</div>
      <div class="era-meds"><span><i class="mk L" aria-hidden="true"></i>Lakeview <b>${f1(e.lakeview_median)}</b> <span class="n">n=${n(e.lakeview_n)}</span></span><span><i class="mk P" aria-hidden="true"></i>Pleasant Valley <b>${f1(e.pv_median)}</b> <span class="n">n=${n(e.pv_n)}</span></span></div>
      ${e.significant
        ? `<div class="era-big">${f1(e.gap)}</div><div class="era-k">years between the two medians. 95% interval ${fmtCI(e.ci95)}, ${fmtP(e.p)}.</div>`
        : `<div class="era-big not">Not established</div><div class="era-k">The interval for the difference runs from ${fmtCI(e.ci95)} and includes zero, ${fmtP(e.p)}. The gap has narrowed to where this record can no longer detect it.</div>`}
    </div>`;
  return `
    <h2 data-k="${first.lo} – ${last.hi} · Lakeview and Pleasant Valley · adults who reached 20">Years lived, on two grounds</h2>
    <p class="prose">The median age at death of people who reached twenty, on the town's white ground and on Pleasant Valley, which opened in 1922 and is one of Loudoun's largest African American cemeteries. Adults only, so that different child-burial practice on the two grounds cannot drive the result. ${POP}</p>
    <p class="prose small-prose"><b>Why the comparison starts in ${L.before.start}.</b> Before ${L.before.start} the record holds ${n(L.before.lakeview_n)} dated adult deaths at Lakeview and ${n(L.before.pv_n)} at Pleasant Valley, the earliest in ${L.before.pv_earliest_death}, before the ground's 1922 opening. That is too few to carry a median, so both grounds are compared from ${L.before.start} onward and the earlier deaths are left out on both sides.</p>
    <div class="era-row">${L.eras.map(eraBlock).join('')}</div>
    ${yearOnlyNote(L)}
    <div class="callout narr-block"><p class="narr">Between ${first.lo} and ${first.hi} the median adult buried at Pleasant Valley died <b>${f1(first.gap)} years younger</b> than the median adult at Lakeview.</p><p class="narr-2">By ${last.lo} the difference had narrowed to where <b>this record can no longer detect it.</b></p></div>
    <h3>By decade of death</h3>
    ${longevityFigure(L)}
    <div class="prose small-prose">
      <p><b>This is not life expectancy.</b> It is the median age at death of adults buried with a dated stone. Life expectancy at birth is a different measure, and this record cannot produce one.</p>
      <p><b>The record does not say why.</b> It holds no income, almost no occupation at death and nothing about access to care, so it cannot attribute the difference to any of them.</p>
      <p><b>Nobody died at the median.</b> Nothing here describes a person, and it is not a ranking of the two grounds.</p>
    </div>
    <details class="more"><summary>How firm these numbers are</summary>
      <table class="tbl" style="max-width:640px;margin-top:10px"><thead><tr><th>ground</th><th class="n">people</th><th class="n">with a usable age at death</th><th class="n">share</th></tr></thead><tbody>
        ${Object.entries(L.coverage).map(([k, c]) => `<tr><td>${k}</td><td class="n">${n(c.n)}</td><td class="n">${n(c.usable)}</td><td class="n">${c.pct}%</td></tr>`).join('')}
      </tbody></table>
      <p class="prose small-prose">Coverage is close on all three grounds, so the comparison does not rest on one ground being much more completely dated than the other. Harmony appears for coverage only; it is not part of the comparison.</p>
      <table class="tbl" style="max-width:640px;margin-top:10px"><thead><tr><th>era, death dated to the day only</th><th class="n">Lakeview n</th><th class="n">Pleasant Valley n</th><th class="n">difference between medians</th></tr></thead><tbody>
        ${L.dayPrecision.map(r => `<tr><td>${r.era.replace('-', ' – ')}</td><td class="n">${n(r.lakeview_n)}</td><td class="n">${n(r.pv_n)}</td><td class="n">${r.era === last.era && !last.significant ? '<span class="muted">not established</span>' : f1(r.gap)}</td></tr>`).join('')}
      </tbody></table>
      <table class="tbl" style="max-width:640px;margin-top:10px"><thead><tr><th>era, birth and death both dated to the day</th><th class="n">Lakeview n</th><th class="n">Pleasant Valley n</th><th class="n">difference between medians</th><th class="n">95% interval</th></tr></thead><tbody>
        ${L.bothDay.map(r => `<tr><td>${r.lo} – ${r.hi}</td><td class="n">${n(r.lakeview_n)}</td><td class="n">${n(r.pv_n)}</td><td class="n">${r.established ? f1(r.gap) : `<span class="muted">${f1(r.gap)}, not established</span>`}</td><td class="n">${fmtCI(r.ci95)}</td></tr>`).join('')}
      </tbody></table>
      <p class="prose small-prose">Restricting both grounds to deaths dated to the day leaves the first two differences nearly unchanged. Requiring the birth to be dated to the day as well keeps the size of every gap, but leaves too few people at Pleasant Valley in ${L.eras[0].lo} – ${L.eras[0].hi} to establish it. The intervals are a bootstrap of 4,000 resamples. Every median, n and p on this page is computed by the app's build and reproduced independently by the reference script; the build stops if they ever disagree.</p>
    </details>
    <div class="source"><span>SOURCE</span>timeline_people.csv: cemetery, death_year, age_at_death, timeline_usable = yes · computed in scripts/build-data.mjs, checked against scripts/longevity_gap.py and data/longevity_gap.json, which supplies the interval</div>`;
}
// Where an established era stops being established once every date known only
// to the year is left out, say so beside the eras, with the heaping check that
// says whether those year-only birth years can be trusted.
function yearOnlyNote(L) {
  const lost = L.eras.filter(e => e.significant).map(e => [e, L.bothDay.find(r => r.era === e.era)]).filter(([, r]) => r && !r.established);
  if (!lost.length) return '';
  const h = L.pvHeaping, share = h.ending_0_or_5 / h.n;
  return lost.map(([e, r]) => `<p class="prose small-prose"><b>The ${e.lo} – ${e.hi} gap depends on dates known only to the year.</b> ${n(e.pv_n - r.pv_n)} of Pleasant Valley's ${n(e.pv_n)} adults in that era have no birth or death date to the day, most of them a birth year alone. Leave them out and the gap is ${f1(r.gap)} years, close to the same, but with ${n(r.pv_n)} people left its interval runs from ${fmtCI(r.ci95)} and includes zero. ${h.p < 0.05
    ? `Those birth years may hold rounded guesses: ${n(h.ending_0_or_5)} of ${n(h.n)} end in 0 or 5, more than the one in five that chance gives.`
    : `Those birth years do not look like rounded guesses: ${n(h.ending_0_or_5)} of ${n(h.n)} end in 0 or 5, ${share < 0.2 ? 'fewer than' : 'about'} the one in five that chance gives. The finding stands, and it stands on them.`}</p>`).join('');
}
function longevityFigure(L) {
  const rows = L.decades, notEst = L.eras.find(e => !e.significant);
  const W = 900, rowH = 36, T = 30, Lg = 70, R = 290, a0 = 45, a1 = 90;
  const H = T + rows.length * rowH + 34;
  const x = (age) => Lg + (age - a0) / (a1 - a0) * (W - Lg - R);
  const xv = W - R + 24;
  const inNot = (d) => notEst && d >= notEst.lo && d <= notEst.hi;
  const notRows = rows.map((r, i) => [r, i]).filter(([r]) => inNot(r.decade));
  return `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Median age at death of adults by decade, Lakeview and Pleasant Valley">
    ${[50, 60, 70, 80, 90].map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${T - 6}" y2="${T + rows.length * rowH}" stroke="var(--rule)"/><text x="${x(v)}" y="${T - 12}" font-size="11" text-anchor="middle" fill="var(--ink-3)">${v}</text>`).join('')}
    <text x="${xv}" y="${T - 12}" font-size="11" fill="var(--ink-3)">median, and the people it rests on</text>
    ${notRows.length ? `<rect x="${Lg - 64}" y="${T + notRows[0][1] * rowH}" width="${W - Lg + 64}" height="${notRows.length * rowH}" fill="none" stroke="var(--ink-3)" stroke-dasharray="3 3"/>` : ''}
    ${rows.map((r, i) => {
      const y = T + i * rowH + rowH / 2, small = r.pv_n < 20;
      const xl = x(r.lakeview_median), xp = x(r.pv_median);
      return `<g><title>${r.decade}s: Lakeview ${f1(r.lakeview_median)} (n=${r.lakeview_n}), Pleasant Valley ${f1(r.pv_median)} (n=${r.pv_n})${small ? '. Pleasant Valley rests on few people here: directional, not precise.' : ''}</title>
        <text x="${Lg - 14}" y="${y + 4}" font-size="13" font-weight="700" text-anchor="end" fill="var(--ink-2)">${r.decade}s</text>
        <line x1="${Math.min(xl, xp)}" x2="${Math.max(xl, xp)}" y1="${y}" y2="${y}" stroke="var(--mute)" stroke-width="2"/>
        <rect x="${xp - 6}" y="${y - 6}" width="12" height="12" fill="var(--pv)" fill-opacity="${small ? 0.55 : 1}" stroke="var(--stone)" stroke-width="2"/>
        <circle cx="${xl}" cy="${y}" r="7" fill="var(--lv)" stroke="var(--stone)" stroke-width="2"/>
        ${i === 0 ? `<text x="${xl}" y="${y - 12}" font-size="11.5" text-anchor="middle" fill="var(--ink-2)">Lakeview</text><text x="${xp}" y="${y - 12}" font-size="11.5" text-anchor="middle" fill="var(--ink-2)">Pleasant Valley</text>` : ''}
        <text x="${xv}" y="${y + 4}" font-size="12.5" fill="var(--ink-2)"><tspan font-weight="700" fill="var(--ink)">${f1(r.lakeview_median)}</tspan> <tspan fill="var(--ink-3)">n=${r.lakeview_n}</tspan><tspan dx="16" font-weight="700" fill="var(--ink)">${f1(r.pv_median)}</tspan> <tspan fill="var(--ink-3)">n=${r.pv_n}${small ? ', few' : ''}</tspan></text>
      </g>`;
    }).join('')}
    ${notRows.length ? `<text x="${Lg - 60}" y="${T + rows.length * rowH + 22}" font-size="11.5" fill="var(--ink-3)">dashed box: ${notEst.lo} – ${notEst.hi}, where the difference is not established (${fmtP(notEst.p)})</text>` : ''}
  </svg>
  <div class="cap">Each row is a decade of death, on a scale of age in years. The circle is Lakeview's median, the square Pleasant Valley's, and the grey line the years between them. Paler squares and "few" mark decades where Pleasant Valley's median rests on fewer than twenty people: <b>directional, not precise.</b> Two burial populations, not two samples of the town.</div></div>`;
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
    ${laneOf.map(({ e, k, lo, hi }) => { const y = yy(0) + 22 + k * 11; const abs = D.absenceEraIds.has(e.id); return `<rect x="${x(lo)}" y="${y}" width="${x(Math.min(hi, 2030)) - x(lo)}" height="9" fill="${abs ? 'url(#hatch)' : 'var(--mute)'}" stroke="${abs ? 'var(--s2)' : 'none'}"><title>${esc(e.label)}: ${esc(e.basis)}</title></rect>`; }).join('')}
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
// Documented individuals who are not people in this record. The register
// gives a name, a date and a place; it does not say where they were buried,
// so nothing here is placed in a cemetery, on the timeline or in a count.
// Leuisa Levenberry's death date is the date on one Harmony stone; that is
// stated as a coincidence of dates, not as an identification.
const REGISTER_MAYBE_STONE = { 'Leuisa Levenberry|4 Jul 1890': 'HM0104' };
function registerNamedSection(rows, D) {
  if (!rows?.length) return '';
  const who = (r) => r.name.includes(' ') ? esc(r.name)
    : `Unnamed ${r.age === '0' ? 'infant' : 'child'}, ${esc(r.name)}`;
  const age = (r) => r.age === '' ? '' : r.age === '0' ? ', under a year old' : `, aged ${esc(r.age)}`;
  const kin = (r) => [r.parents && `parents ${esc(r.parents)}`, r.spouse && `spouse ${esc(r.spouse)}`].filter(Boolean).join('; ');
  const stone = (r) => {
    const id = REGISTER_MAYBE_STONE[`${r.name}|${r.death_date}`], p = id && D.byId.get(id);
    return p ? ` The same date of death is on a stone at Harmony, <a href="#/person/${p.id}">${esc(p.name)}</a>, born 1837; whether it is the same woman is not established.` : '';
  };
  return `
    <h3>Named in the county register, with no stone here</h3>
    <p class="prose">The original Loudoun County register of deaths for 1865–1896 records these ${rows.length} people as colored and as dying at Hamilton, which it calls Harmony. Each was read on the page, not taken from an index. They are documented individuals, but the register does not say where any of them was buried, so they are not records of these cemeteries: they are not on the timeline and are not counted anywhere in this app. Many were children.</p>
    <ul class="era-list">${rows.map(r => `<li id="${esc(r.anchor)}">${who(r)}${age(r)} <span class="when">died ${esc(r.death_date)}</span><span class="basis">${kin(r) ? `The index gives ${kin(r)}. ` : ''}Register ${esc(r.page.split(':')[0])}.${stone(r)} <a href="${esc(r.record)}" rel="noopener">The record</a>.</span></li>`).join('')}</ul>
    <p class="prose small">The register's own index marks four more Hamilton deaths of these years as colored. On the page, one is entered as white and three could not be read, so they are not listed. A search by place finds only entries that name the town; deaths entered under the county alone are not here, so this is not the town's total.</p>
    <div class="source"><span>SOURCE</span>Register of Deaths 1865–1896, Loudoun County, FamilySearch film 004225400, item 4 · research/fs_hamilton_deaths_1853_1896.csv</div>`;
}

// Death certificates for Black people who died at Hamilton and match no
// record of the three cemeteries. Grouped by what the certificate says about
// burial, in the certificate's words. "Hamilton" is not read as Pleasant
// Valley: most of the later ones probably are, but the certificate does not
// say so, and before 1922 there was no Pleasant Valley to mean.
const CERT_GROUPS = [
  ['town-before', 'Buried “Hamilton”, before Pleasant Valley opened', 'The certificate names the town and no burial ground. Where in Hamilton these people lie is not recorded.'],
  ['pv', 'Buried at Pleasant Valley, by name', 'Each certificate names Pleasant Valley. None of these people is in the cemetery’s surviving records.'],
  ['town', 'Buried “Hamilton” or “Hamilton Cemetery”, 1922 and after', 'Most of these are probably Pleasant Valley, the community’s ground in the town, but the certificate does not say so and the app does not assume it.'],
  ['home', 'Buried at home', 'Three infants, each certified “at home”, with no undertaker.'],
  ['elsewhere', 'Died at Hamilton, buried elsewhere', 'Most at Lincoln: Mt. Olive Baptist, Lincoln Baptist and Lincoln Cemetery, outside this project’s three grounds.'],
];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (iso) => { const [y, m, d] = iso.split('-'); return `${+d} ${MON[+m - 1]} ${y}`; };
function certificatesSection(rows, linked = 0) {
  if (!rows?.length) return '';
  const age = (r) => r.age === '' ? '' : r.age === '0' ? ', under a year old' : `, aged ${esc(r.age)}`;
  const year = (d) => d.slice(0, 4);
  const item = (r) => `<li id="${esc(r.anchor)}">${esc(r.name)}${age(r)} <span class="when">died ${esc(shortDay(r.death))}</span><span class="basis">Burial: ${esc(r.burial)}.${r.cause ? ` Cause, as written: ${esc(r.cause.replace(/[.\s]+$/, ''))}.` : ''} <a href="${esc(r.record)}" rel="noopener">The certificate</a>.</span></li>`;
  return `
    <h3>On a death certificate, with no record in these cemeteries</h3>
    <p class="prose">Virginia death certificates from 1912 record ${n(rows.length)} Black people who died at Hamilton between ${year(rows[0].death)} and ${year(rows[rows.length - 1].death)} and who match no record of the three cemeteries. Each certificate was read on the image. They are documented individuals, but not records of these cemeteries: they are not on the timeline and are not counted anywhere in this app. A certificate records where a person died; what it says about burial is given below as written.${linked ? ` ${n(linked)} more certificates turned out to be people already in these cemeteries' records under another spelling or date; each appears once, on that person's card, with what the certificate documents.` : ''}</p>
    ${CERT_GROUPS.map(([key, title, note]) => {
      const g = rows.filter(r => r.group === key);
      return g.length ? `<h4>${esc(title)} <span class="muted">(${n(g.length)})</span></h4><p class="prose small">${esc(note)}</p><ul class="era-list">${g.map(item).join('')}</ul>` : '';
    }).join('')}
    <p class="prose small">The certificates of white people who died at Hamilton and match no cemetery record have not yet been read, so this list is not a comparison between the two. It covers deaths the certificate places in the town; deaths entered under the county alone are not here.</p>
    <div class="source"><span>SOURCE</span>Virginia, Death Certificates, 1912–1987, FamilySearch collection 2377565 · research/fs_certificates_read.tsv</div>`;
}

function demographyFigure(demo) {
  const early = demo.filter(d => d.black_share_pct !== null), late = demo.filter(d => d.year >= 1870);
  const W = 440, H = 220, L = 40, Rr = 10, T = 18, B = 30;
  const x = (y) => L + (y - 1785) / (1955 - 1785) * (W - L - Rr);
  const yPct = (v) => T + (1 - v / 40) * (H - T - B);
  const maxPop = 7500, yPop = (v) => T + (1 - v / maxPop) * (H - T - B);
  return `<div><div class="fig-title">Loudoun County, measured by the census</div><div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Black share of Loudoun's population 1790–1860">
    ${[0, 10, 20, 30, 40].map(v => `<line x1="${L}" x2="${W - Rr}" y1="${yPct(v)}" y2="${yPct(v)}" stroke="var(--rule)"/><text x="${L - 5}" y="${yPct(v) + 4}" font-size="10" text-anchor="end" fill="var(--ink-2)">${v}%</text>`).join('')}
    ${early.map(d => `<rect x="${x(d.year) - 7}" y="${yPct(d.black_share_pct)}" width="14" height="${yPct(0) - yPct(d.black_share_pct)}" fill="var(--s1)" rx="2"><title>${d.year}: ${d.black_share_pct}% Black (${n(d.enslaved)} enslaved, ${n(d.free_black)} free) of ${n(d.total)}</title></rect>`).join('')}
    ${early.map(d => `<text x="${x(d.year)}" y="${H - 12}" font-size="10" text-anchor="middle" fill="var(--ink-2)">${d.year}</text>`).join('')}
    <text x="${x(1875)}" y="${yPct(38)}" font-size="11" fill="var(--ink-2)">share, 1790–1860</text>
  </svg><div class="cap">Black share of the county's population, 1790–1860, as reported by the Loudoun Museum from the decennial census. <b>31% in 1860.</b></div><div class="source"><span>SOURCE</span>context_demography.csv · county context, never a denominator</div></div>
  <div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Loudoun's Black population 1870–1950">
    ${[0, 2500, 5000, 7500].map(v => `<line x1="${L}" x2="${W - Rr}" y1="${yPop(v)}" y2="${yPop(v)}" stroke="var(--rule)"/><text x="${L - 5}" y="${yPop(v) + 4}" font-size="10" text-anchor="end" fill="var(--ink-2)">${v ? (v / 1000) + 'k' : 0}</text>`).join('')}
    <polyline fill="none" stroke="var(--s1)" stroke-width="2" points="${late.map(d => `${x(d.year)},${yPop(d.black_total)}`).join(' ')}"/>
    ${late.map(d => `<circle cx="${x(d.year)}" cy="${yPop(d.black_total)}" r="4" fill="var(--stone)" stroke="var(--s1)" stroke-width="2"><title>${d.year}: ${n(d.black_total)}. ${esc(d.note)}</title></circle><text x="${x(d.year)}" y="${H - 12}" font-size="10" text-anchor="middle" fill="var(--ink-2)">${d.year}</text>`).join('')}
    <text x="${x(1890)}" y="${yPop(7000)}" font-size="11" fill="var(--ink-2)">Black population, count</text>
  </svg><div class="cap">Black population of Loudoun County, 1870 and 1900–1950, falling in every decade from 1900. No total or share is recorded for these years, so none is drawn. <b>A raw count understates the outflow</b> because it ignores natural increase.</div><div class="source"><span>SOURCE</span>context_demography.csv · county context, never a denominator</div></div></div>`;
}
function documentedFigure(rows) {
  const W = 440, H = 240, L = 40, Rr = 10, T = 18, B = 50;
  const x = (d) => L + (d - 1825) / (2035 - 1825) * (W - L - Rr);
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  return `<div><div class="fig-title">What this project documents, by decade</div><div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pleasant Valley's share of documented burials by decade">
    ${[0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${L - 5}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="var(--ink-2)">${v}%</text>`).join('')}
    ${rows.map(r => `<g><rect x="${x(r.decade) + 1}" y="${y(r.pv_share_pct)}" width="${x(r.decade + 10) - x(r.decade) - 2}" height="${Math.max(0, y(0) - y(r.pv_share_pct))}" fill="var(--pv)" rx="2"/><rect x="${x(r.decade) + 1}" y="${y(100)}" width="${x(r.decade + 10) - x(r.decade) - 2}" height="${y(0) - y(100)}" fill="transparent"><title>${r.decade}s: ${r.documented_total} documented burials, ${r.pleasant_valley} at Pleasant Valley (${r.pv_share_pct}%). ${esc(r.note)}</title></rect></g>`).join('')}
    ${rows.filter(r => r.county_black_share_pct !== null).map(r => `<line x1="${x(r.decade) + 1}" x2="${x(r.decade + 10) - 1}" y1="${y(r.county_black_share_pct)}" y2="${y(r.county_black_share_pct)}" stroke="var(--ink)" stroke-width="2"><title>County Black share, ${r.decade}s: ${r.county_black_share_pct}% (context, not a denominator)</title></line>`).join('')}
    ${[1830, 1870, 1910, 1950, 1990].map(d => `<text x="${x(d) + 1}" y="${H - 32}" font-size="10" fill="var(--ink-3)">${d}</text>`).join('')}
    ${rows.map((r, i) => `<text x="${x(r.decade) + 1 + (x(r.decade + 10) - x(r.decade) - 2) / 2}" y="${H - (i % 2 ? 6 : 17)}" font-size="8.5" text-anchor="middle" fill="var(--ink-3)">n=${r.documented_total}</text>`).join('')}
  </svg><div class="cap">Bars: Pleasant Valley's share of the decade's documented burials. Short black ticks: the county's Black share, in the decades where it is measured. Before 1922 the share is near zero because the record is empty, not because the town was: <b>absence of record</b>. When the community's cemetery had stones to read, its share of the record reaches the county's antebellum share. The <b>n=</b> under each decade is the base of its bar.</div><div class="source"><span>SOURCE</span>context_documented_vs_county.csv · timeline_people.csv</div></div></div>`;
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
    ['alive in 1800', D.popByYear.get(1800), 11], ['alive in 1850', D.popByYear.get(1850), 327], ['alive in 1900', D.popByYear.get(1900), 1231], ['alive in 1927 (peak)', D.popByYear.get(1927), 1429], ['alive in 1950', D.popByYear.get(1950), 1256], ['alive in 2000', D.popByYear.get(2000), 413],
  ];
  return `<table class="tbl"><thead><tr><th>check</th><th class="n">computed</th><th class="n">expected</th><th></th></tr></thead><tbody>${checks.map(([k, v, e]) => v === null ? `<tr><td colspan="4" class="serif" style="padding-top:14px">${k}</td></tr>` : `<tr><td>${k}</td><td class="n">${n(v)}</td><td class="n">${n(e)}</td><td>${v === e ? 'agrees' : 'DISAGREES'}</td></tr>`).join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// The 1853 map
// ---------------------------------------------------------------------------
export function renderMap(el, D, ctx) {
  const layer = D.layers[0], C = D.context;
  const mapEvents = D.datedEvents.filter(e => e.layer === 'local' && /1853 map/.test(e.title));
  el.innerHTML = `
    <h1 data-k="1853 · Yardley Taylor · Library of Congress">The county in 1853</h1>
    <p class="lede">${esc(layer.title)}, surveyed by a Loudoun Quaker surveyor and published about 1854. It names some residents by their houses. It is not a list of everyone who lived in the county: a house without a name is not an empty one. Served as tiles from the Library of Congress; nothing is downloaded or bundled.</p>
    <div class="map-wrap"><div id="osd"></div></div>
    <div class="map-attr">${esc(layer.attribution)}. ${esc(layer.notes.split('.').slice(0, 3).join('.'))}. <b>Not georeferenced</b>: the map is shown as a picture and implies no positional accuracy.</div>
    ${mapEvents.length ? `<h2 data-k="context_events.csv · local layer">What the map says about these people</h2><ul class="era-list">${mapEvents.map(e => `<li>${esc(e.title)}<span class="basis">${esc(e.note)} <span class="muted">(${esc(e.source)})</span></span></li>`).join('')}</ul>` : ''}
    <h2 data-k="Loudoun County GIS">Within five kilometres of Hamilton, today</h2>
    <p class="prose">Loudoun County's GIS records of historic African American communities, churches, schools and lodges near Hamilton, with the three cemeteries. Drawn from the county's coordinates on a plain north-up grid, not on the 1853 map.</p>
    <div class="grid-2">${nearMap(C)}<div>
      <table class="tbl"><thead><tr><th>place</th><th>kind</th><th class="n">km</th><th>bearing</th></tr></thead><tbody>${C.communities.slice().sort((a, b) => a.km - b.km).map(c => `<tr><td class="serif">${esc(c.name)}</td><td>${esc(c.category)}</td><td class="n">${c.km.toFixed(1)}</td><td>${esc(c.bearing)}</td></tr>`).join('')}</tbody></table>
    </div></div>
    <h2 data-k="context_cemetery_official.csv">The county's own cemetery records</h2>
    <table class="tbl"><thead><tr><th>cemetery</th><th>county id</th><th>county: earliest burial</th><th class="n">county grave count</th><th class="n">this project's records</th><th>county note</th></tr></thead><tbody>
      ${C.cemeteryOfficial.map(c => `<tr><td class="serif">${esc(c.name)}</td><td>${esc(c.cm_id)}</td><td>${esc(c.county_earliest_burial)}</td><td class="n">${n(c.county_grave_count)}</td><td class="n">${n(c.project_record_count)}</td><td>${esc(c.county_notes)}</td></tr>`).join('')}
    </tbody></table>
    <p class="prose small">The county's grave count is lower than this project's record count at all three cemeteries. It is not a total and is not used to validate the project's counts.</p>
    <div class="source"><span>SOURCE</span>context_layers.csv · context_communities.csv · context_cemetery_official.csv · tiles from tile.loc.gov</div>`;
  loadOpenSeadragon().then(OSD => {
    OSD({
      id: 'osd', prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
      tileSources: `${layer.endpoint}/info.json`, showNavigator: true, navigatorPosition: 'BOTTOM_RIGHT',
      crossOriginPolicy: 'Anonymous', maxZoomPixelRatio: 2, visibilityRatio: 0.6, minZoomLevel: 0.5, defaultZoomLevel: 0, animationTime: 0.6,
    });
  }).catch(() => { el.querySelector('#osd').innerHTML = '<p class="loading" style="color:#ddd">The map viewer could not be loaded. It needs the OpenSeadragon library from cdnjs and tile access to tile.loc.gov.</p>'; });
}
function nearMap(C) {
  const ham = C.communities.find(c => c.name === 'Hamilton') || { lat: 39.135324, lon: -77.664643 };
  const kmX = (lon) => (lon - ham.lon) * 111.32 * Math.cos(ham.lat * Math.PI / 180), kmY = (lat) => (lat - ham.lat) * 110.57;
  const W = 520, H = 520, s = W / 11, cx = W / 2, cy = H / 2;
  const px = (lon) => cx + kmX(lon) * s, py = (lat) => cy - kmY(lat) * s;
  const shape = (c) => c.category.includes('Church') ? `<rect x="-4" y="-4" width="8" height="8" transform="rotate(45)"/>` : c.category.includes('School') ? `<rect x="-4" y="-4" width="8" height="8"/>` : c.category.includes('Lodge') ? `<polygon points="0,-5 5,4 -5,4"/>` : `<circle r="4.5"/>`;
  const cem = { Lakeview: 'L', 'Harmony United Methodist Church': 'H', 'Pleasant Valley': 'P' };
  return `<div class="figure"><svg class="near-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Communities and cemeteries within five kilometres of Hamilton">
    ${[1, 2, 3, 4, 5].map(r => `<circle cx="${cx}" cy="${cy}" r="${r * s}" fill="none" stroke="var(--rule)"/><text x="${cx + r * s + 2}" y="${cy - 3}" font-size="10" fill="var(--ink-3)">${r} km</text>`).join('')}
    <text x="${cx}" y="14" font-size="11" text-anchor="middle" fill="var(--ink-2)">N</text>
    ${C.communities.filter(c => c.name !== 'Hamilton').map(c => `<g transform="translate(${px(c.lon)},${py(c.lat)})" fill="var(--ink-2)"><g>${shape(c)}<title>${esc(c.name)} (${esc(c.category)}), ${c.km} km ${esc(c.bearing)}. ${esc(c.summary)}</title></g><text x="7" y="4" font-size="10.5" fill="var(--ink)">${esc(c.name)}</text></g>`).join('')}
    ${C.cemeteryOfficial.map(c => `<g transform="translate(${px(c.lon)},${py(c.lat)})"><circle r="7" fill="var(--${{ L: 'lv', H: 'hm', P: 'pv' }[cem[c.name]]})" stroke="var(--stone)" stroke-width="2"/><title>${esc(c.name)} cemetery</title><text x="10" y="-6" font-size="11" font-weight="600" fill="var(--ink)">${esc(c.name.replace(' United Methodist Church', ' UMC'))}</text></g>`).join('')}
    <g transform="translate(${cx},${cy})"><circle r="3" fill="var(--now)"/><title>Hamilton</title></g>
    <g transform="translate(14,${H - 58})" font-size="10.5" fill="var(--ink-2)"><circle cx="5" cy="0" r="4.5" fill="var(--ink-2)"/><text x="14" y="4">community</text><rect x="1" y="12" width="8" height="8" transform="rotate(45 5 16)" fill="var(--ink-2)"/><text x="14" y="20">church</text><rect x="1" y="28" width="8" height="8" fill="var(--ink-2)"/><text x="14" y="36">school</text><polygon points="5,43 10,52 0,52" fill="var(--ink-2)"/><text x="14" y="52">lodge</text></g>
  </svg><div class="cap">Hamilton at the centre, in orange. Coloured discs are the three cemeteries, named; Harmony and Pleasant Valley are the same community's ground before and after 1922.</div></div>`;
}
let osdPromise = null;
function loadOpenSeadragon() {
  if (window.OpenSeadragon) return Promise.resolve(window.OpenSeadragon);
  if (osdPromise) return osdPromise;
  osdPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js';
    s.onload = () => resolve(window.OpenSeadragon); s.onerror = reject; document.head.appendChild(s);
  });
  return osdPromise;
}
