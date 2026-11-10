// The record page, "Who is not here": people other records name who are not
// in these cemeteries, and the measures of who the sources leave out.
import { n } from './derive.js';
import { esc } from './timeline.js';
import { pct } from './view-shared.js';

// Documented individuals who are not people in this record. The register
// gives a name, a date and a place; it does not say where they were buried,
// so nothing here is placed in a cemetery, on the timeline or in a count.
// Leuisa Levenberry's death date is the date on one Harmony stone; that is
// stated as a coincidence of dates, not as an identification.
const REGISTER_MAYBE_STONE = { 'Leuisa Levenberry|4 Jul 1890': 'HM0104' };

// The 1850 and 1860 slave schedules (curation/slave_schedule_<year>_links.csv).
// Holders are named and linked to their cards, by the owner's decision; the
// people they held are given only as the schedule gives them, and are the
// subject. The two years' counts are never added: some of the people listed
// are probably the same people, ten years older.
export function slaveScheduleSection(S, D) {
  if (!S) return '';
  const link = (id) => { const q = D.byId.get(id); return q ? `<a href="#/person/${q.id}" data-person="${q.id}">${esc(q.name)}</a>` : esc(id); };
  const list = (ids) => ids.map(link).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const w = (k) => words[k] ?? String(k);
  const W = (k) => w(k)[0].toUpperCase() + w(k).slice(1);
  const a = S[1860], b = S[1850];
  const both = b.owners.filter(id => a.owners.includes(id));
  const newIn1850 = b.owners.filter(id => !a.owners.includes(id));
  return `
    <h3>Hamilton in 1850 and 1860, on the slave schedules</h3>
    <p class="prose">The 1850 and 1860 censuses each had a second schedule, "Slave Inhabitants". It named each holder and gave each enslaved person only an age, a sex and a colour. The project searched FamilySearch's index of Loudoun's schedules for the surname of every adult in these cemeteries alive on each census day (${a.searched} people and ${a.surnames} surnames in 1860; ${b.searched} and ${b.surnames} in 1850) and read each match on the page.</p>
    <p class="prose"><b>1860.</b> ${W(a.owners.length)} are listed as holding people in slavery: ${list(a.owners)}, with ${w(a.held)} people between them. ${W(a.hirers.length)} more are listed as employers who hired an enslaved person from another owner: ${list(a.hirers)}.</p>
    <p class="prose"><b>1850.</b> ${W(b.owners.length)} are listed as holding people in slavery, with ${w(b.held)} people between them: ${list(newIn1850)}, and ${list(both)}, who is listed in both years. His holding in 1850, a woman of 40 and five boys, agrees with his holding in 1860 ten years on, so they are probably the same people; without names the schedule cannot show it. The 1850 pages record no hiring.</p>
    <p class="prose"><b>The enslaved people on these lines are named nowhere in these records</b>, and none can be traced to a grave here. This is the number found, not the number. A schedule lists the head of a holding, so a wife or child in that household does not appear; only these two years have been read. A name missing from the index is not evidence that someone held no one. Some readings are left open, and are not counted: in 1860 a James H. Jones listed as a hirer, whose identity with the man buried here is not settled, and an "H. McVeigh" and a "Mary Gulick"; in 1850 a James Muse; none of them shown to be the person buried here.</p>
    <div class="source"><span>SOURCE</span>research/slave_schedule_1860_loudoun_read.csv, slave_schedule_1860_hamilton.csv and slave_schedule_1850_loudoun_read.csv, read on the images of FamilySearch films 005171762 (1860) and 004206479 (1850) · identities matched on the free schedules · adopted by the project's owner in curation/slave_schedule_1860_links.csv and slave_schedule_1850_links.csv</div>`;
}

export function census1870Section(c, D) {
  if (!c) return '';
  const gh = D.byId.get('HM0078');
  return `
    <h3>Hamilton in 1870, as the census lists it</h3>
    <p class="prose">The 1870 census pages headed Hamilton post office list ${c.all.n} people. The enumerator recorded ${c.black.n} of them as Black or mixed race, about a third of the town, many living as servants and labourers in white households. <b>One of the ${c.black.n} is in these cemeteries</b>: ${gh ? `<a href="#/person/${gh.id}" data-person="${gh.id}">${esc(gh.name)}</a>, 57, at Harmony, matched by name and age only` : 'George Henry, 57, at Harmony'}. Of the ${c.white.n} white residents, ${c.white.inRecord} are. The census does not say where anyone was later buried, and many of the ${c.all.n} will have died or been buried elsewhere, so the difference is not a count of people missing from these grounds. It shows how unevenly the burial record reaches the town that was living there.</p>
    <div class="source"><span>SOURCE</span>research/census_1870_hamilton.csv, from FamilySearch's index of the 1870 census, Loudoun, film images 360–367 · race as the index gives it · matches in curation/census_1870_links.csv, adopted by the project's owner</div>`;
}

export function registerNamedSection(rows, D) {
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

export function certificatesSection(rows, linked = 0) {
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
    <p class="prose small">The certificates of white people who died at Hamilton were read the same way; most were buried outside the town, and those placed in its ground are listed below. The two lists are not a comparison: they were found by where a person died, not where the town's people were buried. Deaths entered under the county alone are not here.</p>
    <div class="source"><span>SOURCE</span>Virginia, Death Certificates, 1912–1987, FamilySearch collection 2377565 · research/fs_certificates_read.tsv</div>`;
}

// White people's certificates that place a burial in this town's ground but
// match no record of the three cemeteries. Same rules as above.
export function certificatesWhiteSection(rows, D) {
  if (!rows?.length) return '';
  const age = (r) => r.age === '' ? '' : r.age === '0' ? ', under a year old' : `, aged ${esc(r.age)}`;
  const item = (r) => {
    const p = r.possible && D.byId.get(r.possible);
    return `<li id="${esc(r.anchor)}">${esc(r.name)}${age(r)} <span class="when">died ${esc(shortDay(r.death))}</span><span class="basis">Burial: ${esc(r.burial)}.${r.cause ? ` Cause, as written: ${esc(r.cause.replace(/[.\s]+$/, ''))}.` : ''}${p ? ` Possibly the same woman as <a href="#/person/${p.id}">${esc(p.name)}</a>, whose record gives a different date; not established.` : ''} <a href="${esc(r.record)}" rel="noopener">The certificate</a>.</span></li>`;
  };
  const lv = rows.filter(r => r.group === 'lakeview'), town = rows.filter(r => r.group === 'town');
  return `
    <h3>Buried in Hamilton by a death certificate, with no record here: white residents</h3>
    <p class="prose">Of the white people whose certificates place a death at Hamilton and who match no record of the three cemeteries, most were buried elsewhere, at Leesburg, Hillsboro, Lincoln and beyond. These ${n(rows.length)} were not: the certificate names Lakeview, or Hamilton with no ground. They are documented individuals, not records of these cemeteries, and are not counted anywhere in this app.</p>
    ${lv.length ? `<h4>Buried at Lakeview, by name <span class="muted">(${n(lv.length)})</span></h4><p class="prose small">Each certificate names Lakeview. None of these people is in the cemetery's surviving records.</p><ul class="era-list">${lv.map(item).join('')}</ul>` : ''}
    ${town.length ? `<h4>Buried “Hamilton”, no ground named <span class="muted">(${n(town.length)})</span></h4><p class="prose small">The certificate names the town and no burial ground; which ground is not recorded, and the app does not guess.</p><ul class="era-list">${town.map(item).join('')}</ul>` : ''}
    <div class="source"><span>SOURCE</span>Virginia, Death Certificates, 1912–1987, FamilySearch collection 2377565 · research/fs_certificates_read_white.tsv</div>`;
}

export function demographyFigure(demo) {
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

export function documentedFigure(rows) {
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
