// The Families page: resolved links, the one who lived on, births and
// remarriages the links make datable.
import { fmtDate, interval, n, dayOf } from './derive.js';
import { esc } from './timeline.js';
import { pct, f1 } from './view-shared.js';

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
// The one who lived on: years between the two deaths of a resolved couple.
// Whole years between death years, since many dates are known only to the
// year. No sex in the record, so no claim about wives against husbands.
// ---------------------------------------------------------------------------
function widowhoodSection(Wd, spouseNamed) {
  const mx = Math.max(...Wd.buckets.map(b => b.n)), W = 900, x0 = 170, x1 = 640, dy = 34, T = 16;
  const H = T + Wd.buckets.length * dy + 10, X = v => x0 + (x1 - x0) * v / mx;
  const fig = `<div class="figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Couples by years between the two deaths">
    ${Wd.buckets.map((b, i) => { const y = T + i * dy + dy / 2, long = b.lo >= 20, col = 'var(--s1)';   // the long spans are marked by the brighter label, not by a second colour
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
