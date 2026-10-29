// The cursor panel (what is true on the chosen date), the living list, and
// the person drawer. All copy here is careful about which of the three kinds
// of thing it is describing: a documented person, a measured count, or an
// absence of record.

import { aliveOn, ageAt, bounds, fmtDay, fmtDate, fmtOffset, lifeSpan, familyOf, precisionWord, interval, yearOf, n, CEMETERY_NAME, CEMETERY_LONG, fullYears, dayOf, ymd } from './derive.js';
import { esc } from './timeline.js';

/** Everyone alive on `day`, split by the alive_on rule. */
export function computeLiving(D, day) {
  const certain = [], possible = [];
  for (const s of D.spans) {
    if (day < s.bLo || day > s.dHi) continue;
    if (day >= s.bHi && day <= s.dLo) certain.push(s.p); else possible.push(s.p);
  }
  return { certain, possible, all: certain.concat(possible), day };
}

// ---------------------------------------------------------------------------
export class CursorPanel {
  constructor(el, D, tl, openPerson) { this.el = el; this.D = D; this.tl = tl; this.openPerson = openPerson; this.open = new Set(); }

  // The panel re-renders on every date change; a fold the reader opened stays open.
  fold(key, title, body) {
    return `<details class="fold" data-fold="${key}"${this.open.has(key) ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
  }

  render(living) {
    for (const d of this.el.querySelectorAll('details[data-fold]')) d.open ? this.open.add(d.dataset.fold) : this.open.delete(d.dataset.fold);
    const D = this.D, day = living.day, year = yearOf(day);
    const total = living.all.length, yearCount = D.popByYear.get(year) || 0;
    const byCem = { L: 0, H: 0, P: 0 };
    const bins = new Array(10).fill(0);
    for (const p of living.all) {
      byCem[p.cem]++;
      const a = ageAt(p, day);
      if (a) bins[Math.min(9, Math.floor(a.min / 10))]++;
    }
    const maxCem = Math.max(1, byCem.L, byCem.H, byCem.P), maxBin = Math.max(1, ...bins);
    const pct = (k) => total ? (k / total * 100) : 0;
    const docEras = D.eras.filter(e => e.layer === 'documentation' && e.s.lo <= day && (e.open || (e.e && day <= e.e.hi)));
    const otherEras = D.eras.filter(e => e.layer !== 'documentation' && e.s.lo <= day && (e.open || (e.e && day <= e.e.hi)));
    const absence = D.absenceBands.filter(b => day >= b.lo && day <= b.hi);
    const clusters = D.clusters.filter(c => day >= c.lo && day <= c.hi);
    const firstBurial = { H: 1836, P: 1922 };

    const cemBar = (k) => {
      const c = byCem[k];
      if (c === 0) {
        const why = k === 'P' && year < 1922 ? 'Pleasant Valley opened in 1922: no record before' : k === 'H' && year < firstBurial.H ? 'no Harmony stone recorded before 1836' : 'none recorded on this date';
        return `<span><span class="dot ${k}"></span>${CEMETERY_NAME[k]}</span><span class="absent"><span class="tag tag-absence">${esc(why)}</span></span>`;
      }
      return `<span><span class="dot ${k}"></span>${CEMETERY_NAME[k]}</span><span class="bar ${k}"><i style="width:${c / maxCem * 100}%"></i></span><span class="n">${n(c)}</span>`;
    };

    this.el.innerHTML = `
      <div class="hero-date"><span class="wd kicker">${fmtDay(day, { weekday: true }).split(' ')[0]}</span>${fmtDay(day)}</div>
      <div class="hero-n"><span class="big">${n(total)}</span><span class="lbl">people in this record alive on this date</span></div>
      <div class="split" role="img" aria-label="${living.certain.length} certainly alive, ${living.possible.length} possibly"><i class="certain" style="width:${pct(living.certain.length)}%"></i><i class="possible" style="width:${pct(living.possible.length)}%"></i></div>
      <div class="split-key"><span>${n(living.certain.length)} certainly</span><span>${n(living.possible.length)} possibly, a date known only to the year</span></div>
      <div class="footing">Measured from the ${n(D.spans.length)} people with both dates recorded. The curve counts <b>${n(yearCount)}</b> for the whole of ${year}. Who the record leaves out is on <a href="#/record?tab=absent">the record</a> page.</div>

      ${clusters.map(c => `<div class="cluster-note">
        <div class="panel-h">Deaths together · a measured count</div>
        <p><b>${n(c.observed)} deaths</b> in these grounds, ${c.from.slice(0, 4) === c.to.slice(0, 4) ? fmtDate(c.from, 'month').replace(/ \d{4}$/, '') : fmtDate(c.from, 'month')} to ${fmtDate(c.to, 'month')}, against about ${Math.round(c.expected)} in an ordinary autumn. <b>${n(c.young)} of them aged ${Math.min(...c.people.filter(x => x.age >= 15 && x.age < 45).map(x => x.age))} to ${Math.max(...c.people.filter(x => x.age >= 15 && x.age < 45).map(x => x.age))}.</b></p>
        <ul class="near-list">${c.people.map(x => `<li><span class="when">${fmtDate(x.dd, 'day', { short: true })}</span><span><span class="ttl" data-person="${x.id}" role="button" tabindex="0">${esc(x.name)}</span><div class="meta">aged ${x.age ?? 'not recorded'}, ${CEMETERY_NAME[x.cem]}${x.plot ? ' ' + esc(x.plot) : ''}</div></span></li>`).join('')}</ul>
        <div class="footing">Tested because the event overlay dates "${esc(c.reason)}" to ${fmtDate(c.reasonDate, 'month')}. Usual: the same months of the surrounding years, ${c.expected} deaths on average; p = ${c.p.toFixed(3)} for this window, ${c.pTested.toFixed(3)} allowing for the ${c.tested} outbreaks tested. Ages 15 to 44: ${c.young} of ${c.youngOf} here, ${c.youngOther} of ${c.otherOf} in the other autumns (p = ${c.pAge.toFixed(3)}), the pandemic's known pattern. The record gives no cause for any of them. A scan of every month from 1870 to 2020 finds no other window that beats chance; a quiet month is not evidence of no outbreak.</div>
      </div>`).join('')}

      <div class="panel-h">By cemetery</div>
      <div class="bars">${cemBar('L')}${cemBar('H')}${cemBar('P')}</div>

      ${this.fold('ages', 'Ages of the living', `
      <div class="hist" role="img" aria-label="Age distribution in ten-year bins">${bins.map((b, i) => `<i style="height:${b / maxBin * 100}%" title="${i === 9 ? '90 and over' : i * 10 + '–' + (i * 10 + 9)}: ${b}"></i>`).join('')}</div>
      <div class="hist-x"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>90+</span></div>
      <div class="footing">A year-only birth is counted at the youngest age it allows.</div>`)}

      ${this.fold('record', `What the record holds on this date${absence.length ? ' <span class="tag tag-absence">a gap</span>' : ''}`, `
      <ul class="strata-list">
        ${absence.map(b => `<li class="absence"><span class="lay">not recorded</span> ${esc(b.label)}<span class="basis">${esc(b.note)}</span></li>`).join('')}
        ${docEras.map(e => `<li class="${D.absenceEraIds.has(e.id) ? 'absence' : ''}"><span class="lay">${D.absenceEraIds.has(e.id) ? 'gap in the sources' : 'source'}</span> ${esc(e.label)}, ${fmtDate(e.start, e.startP)}–${e.open ? '' : fmtDate(e.end, e.endP)}<span class="basis">${esc(e.basis)}</span></li>`).join('')}
        ${docEras.length === 0 && absence.length === 0 ? '<li>No documentation era in context_eras.csv covers this date.</li>' : ''}
      </ul>
      ${otherEras.length ? `<div class="footing">Also in force: ${otherEras.map(e => `<span class="tag" title="${esc(e.basis)}">${esc(e.label)}${e.confidence !== 'verified' ? ' (unverified)' : ''}</span>`).join(' ')}</div>` : ''}`)}

      ${this.fold('events', 'Events around this date', `<ul class="near-list" id="near-events">${this.nearEvents(day)}</ul>`)}

      ${this.fold('deaths', 'Deaths around this date', `<ul class="near-list" id="near-deaths">${this.nearDeaths(day)}</ul>`)}
      <div class="source"><span>SOURCE</span>timeline_people.csv · timeline_population.csv · context_eras.csv · context_events.csv</div>
    `;
    this.el.querySelectorAll('[data-event]').forEach(b => b.addEventListener('click', () => {
      const e = D.events[Number(b.dataset.event)];
      this.tl.selectEvent(e); this.tl.setDate(e.iv.lo, true);
    }));
    this.el.querySelectorAll('[data-person]').forEach(b => b.addEventListener('click', () => this.openPerson(b.dataset.person)));
  }

  nearEvents(day) {
    const D = this.D, year = yearOf(day);
    const cands = D.datedEvents.filter(e => this.tl.eventLayers.has(e.layer)).map(e => ({ e, d: Math.min(Math.abs(e.iv.lo - day), Math.abs(e.iv.hi - day), (day >= e.iv.lo && day <= e.iv.hi) ? 0 : Infinity) }))
      .sort((a, b) => a.d - b.d).slice(0, 6);
    if (!cands.length) return '<li><span class="when"></span><span class="muted">Turn on an event layer to see context here.</span></li>';
    return cands.map(({ e }) => {
      const when = e.iv.p === 'day' ? fmtOffset(day, e.iv.lo) : e.iv.p === 'month' ? (ymd(e.iv.lo).y === year ? 'this year' : offsetYears(year, e.iv.y)) : offsetYears(year, e.iv.y, e.iv.p === 'decade' ? 's' : '');
      const conf = e.confidence !== 'verified' ? ` <span class="conf-${e.confidence}">${e.confidence === 'disputed' ? 'date disputed' : 'date unverified'}</span>` : '';
      return `<li><span class="when">${esc(when)}</span><span><span class="ttl" data-event="${e.i}" role="button" tabindex="0">${esc(e.title)}</span>${conf}<div class="meta">${fmtDate(e.date, e.precision)}, ${e.layer}. Source: ${esc(e.source)}</div></span></li>`;
    }).join('');
  }

  nearDeaths(day) {
    const D = this.D, arr = D.deaths, year = yearOf(day);
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].iv.lo < day) lo = mid + 1; else hi = mid; }
    const picks = [];
    let a = lo - 1, b = lo;
    while (picks.length < 7 && (a >= 0 || b < arr.length)) {
      const da = a >= 0 ? day - arr[a].iv.lo : Infinity, db = b < arr.length ? arr[b].iv.lo - day : Infinity;
      if (da <= db) picks.push(arr[a--]); else picks.push(arr[b++]);
    }
    picks.sort((x, y) => x.iv.lo - y.iv.lo);
    return picks.map(({ p, iv }) => {
      const when = iv.p === 'day' ? fmtOffset(day, iv.lo) : iv.p === 'month' ? (iv.y === year ? 'this year' : offsetYears(year, iv.y)) : offsetYears(year, iv.y);
      const age = p.age !== null ? `, aged ${p.age}` : '';
      return `<li><span class="when">${esc(when)}</span><span><span class="ttl" data-person="${p.id}" role="button" tabindex="0">${esc(p.name)}</span>${age}<div class="meta">${fmtDate(p.dd, p.dp)}${p.dp !== 'day' ? ` (${precisionWord(p.dp)})` : ''}, ${CEMETERY_NAME[p.cem]}${p.cod ? `. Cause: ${esc(p.cod)}` : ''}</div></span></li>`;
    }).join('');
  }
}
function offsetYears(year, y, suffix = '') {
  if (y === year) return suffix ? 'this decade' : 'the same year';
  const k = Math.abs(y - year);
  return `${k} year${k === 1 ? '' : 's'} ${y < year ? 'earlier' : 'later'}`;
}

// ---------------------------------------------------------------------------
export class LivingList {
  constructor(el, D, openPerson) {
    this.el = el; this.D = D; this.openPerson = openPerson; this.sort = 'age-desc'; this.q = '';
    this.el.innerHTML = `
      <div class="living-h"><h2 id="living-title"></h2>
        <div class="ctl">
          <input id="living-q" type="search" placeholder="Filter by name or plot" aria-label="Filter the list">
          <label>Sort <select id="living-sort"><option value="age-desc">eldest first</option><option value="age-asc">youngest first</option><option value="name">by surname</option><option value="cem">by cemetery</option></select></label>
        </div></div>
      <div class="rows" id="living-rows"></div>
      <div class="source"><span>SOURCE</span>timeline_people.csv, timeline_usable = yes · an age is a range where the birth is known only to the year</div>`;
    this.el.querySelector('#living-sort').addEventListener('change', (e) => { this.sort = e.target.value; this.render(this.living); });
    this.el.querySelector('#living-q').addEventListener('input', (e) => { this.q = e.target.value.trim().toLowerCase(); this.render(this.living); });
    this.el.querySelector('#living-rows').addEventListener('click', (e) => { const r = e.target.closest('[data-person]'); if (r) { e.preventDefault(); this.openPerson(r.dataset.person); } });
  }
  render(living) {
    this.living = living;
    const day = living.day, D = this.D;
    const items = living.all.map(p => ({ p, age: ageAt(p, day), possible: living.possible.includes(p) }));
    let rows = this.q ? items.filter(x => x.p.name.toLowerCase().includes(this.q) || (x.p.plot || '').toLowerCase() === this.q) : items;
    const cmp = {
      'age-desc': (a, b) => (b.age?.max ?? -1) - (a.age?.max ?? -1) || a.p.name.localeCompare(b.p.name),
      'age-asc': (a, b) => (a.age?.min ?? 999) - (b.age?.min ?? 999) || a.p.name.localeCompare(b.p.name),
      'name': (a, b) => (a.p.surname || '').localeCompare(b.p.surname || '') || a.p.name.localeCompare(b.p.name),
      'cem': (a, b) => a.p.cem.localeCompare(b.p.cem) || (b.age?.max ?? -1) - (a.age?.max ?? -1),
    }[this.sort];
    rows = rows.slice().sort(cmp);
    this.el.querySelector('#living-title').textContent = `Alive on ${fmtDay(day)}`;
    const out = [];
    let lastGroup = null;
    for (const { p, age, possible } of rows) {
      const group = this.sort === 'cem' ? CEMETERY_NAME[p.cem] : this.sort === 'name' ? (p.surname || '—')[0] : null;
      if (group !== null && group !== lastGroup) { out.push(`<div class="group-h">${esc(group)}</div>`); lastGroup = group; }
      const flags = [p.plot ? `<span class="plot">${esc(p.plot)}</span>` : '', p.stone ? '<span class="has">stone</span>' : '', p.fam.length ? '<span class="has">family</span>' : '', p.cod || p.regVerbatim ? '<span class="has">register</span>' : '', p.census.length ? '<span class="has">census</span>' : '', p.vet || p.mil ? '<span class="has">military</span>' : '', p.disp ? '<span class="has tag-disputed tag">date disputed</span>' : ''].join('');
      out.push(`<a class="row ${possible ? 'possible' : ''}" href="#/person/${p.id}" data-person="${p.id}">
        <span class="age ${age && !age.exact ? 'range' : ''}" title="${age ? (age.exact ? 'age to the day' : 'birth known only to the year: a range') : ''}">${age ? esc(age.text) : '—'}</span>
        <span class="name"><span class="dot ${p.cem}"></span>${esc(p.name)}${possible ? '<span class="pos">possibly</span>' : ''}</span>
        <span class="flags">${flags}</span></a>`);
    }
    this.el.querySelector('#living-rows').innerHTML = out.join('') || `<p class="empty">${this.q ? 'Nobody alive on this date matches that filter.' : 'Nobody in this record can be placed as alive on this date. The record begins with a birth in 1754.'}</p>`;
  }
}

// ---------------------------------------------------------------------------
export class Drawer {
  constructor(el, body, scrim, closeBtn, D, tl, onClose) {
    this.el = el; this.body = body; this.scrim = scrim; this.D = D; this.tl = tl; this.onClose = onClose;
    closeBtn.addEventListener('click', () => this.close());
    scrim.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.el.hidden) this.close(); });
    body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-person]'); if (a) { e.preventDefault(); this.open(a.dataset.person); return; }
      const g = e.target.closest('[data-goto]'); if (g) { this.tl.setDate(Number(g.dataset.goto), true); return; }
    });
  }
  close() { this.el.hidden = true; this.scrim.hidden = true; this.current = null; this.onClose && this.onClose(); }
  open(id, day = this.tl.day) {
    const p = this.D.byId.get(id); if (!p) return;
    this.current = p.id;
    this.body.innerHTML = this.render(p, day);
    this.el.hidden = false; this.scrim.hidden = false; this.el.scrollTop = 0;
    this.el.querySelector('.drawer-close').focus({ preventScroll: true });
  }
  refresh(day) { if (this.current && !this.el.hidden) { const y = this.el.scrollTop; this.body.innerHTML = this.render(this.D.byId.get(this.current), day); this.el.scrollTop = y; } }

  render(p, day) {
    const D = this.D, { b, d } = bounds(p);
    const fam = familyOf(p, D.byId);
    const disputes = (D.disputedByPerson.get(p.id) || []).filter(r => r.status.startsWith('DISPUTED'));
    const famEvents = (D.famEventsByPerson.get(p.id) || []).slice().sort((x, y) => (interval(x.date, x.precision)?.lo ?? 0) - (interval(y.date, y.precision)?.lo ?? 0));
    const marriages = D.marriageByPerson.get(p.id) || [];
    const clusters = D.lossClustersByPerson.get(p.id) || [];
    const findings = D.findings.verified[p.id] || [], news = D.findings.newspaper[p.id] || [];
    const reg = D.registerByPerson.get(p.id) || [];

    const datesLine = (() => {
      const bt = p.bd ? `${fmtDate(p.bd, p.bp)}<span class="prec">${p.bp !== 'day' ? precisionWord(p.bp) : ''}</span>` : `<span class="muted">${p.withheld ? 'birth date not shown' : 'birth not recorded'}</span>`;
      const dt = p.dd ? `${fmtDate(p.dd, p.dp)}<span class="prec">${p.dp !== 'day' ? precisionWord(p.dp) : ''}</span>` : '<span class="muted">death not recorded</span>';
      const age = p.age !== null ? ` <span class="muted">aged ${p.age}</span>` : '';
      return `${bt} – ${dt}${age}`;
    })();

    const atCursor = (() => {
      const st = aliveOn(p, day);
      const when = fmtDay(day);
      if (p.withheld) return `<div class="at-cursor">No death date is recorded. Anyone born within the last 110 years with no death date may still be living, so this record's birth date is not shown${p.stoneHeld ? ', nor the 1948 reading of the stone, which carries it' : ''}, and the person is not placed on the timeline.</div>`;
      if (st === 'unplaceable') return `<div class="at-cursor">Not placeable on the timeline: ${esc(NOTE_WORDS[p.note] || p.note || 'no usable dates')}.${p.use === 'birth-only' ? ' No death year is recorded, so the record does not say whether this person was alive on any later date.' : ''}</div>`;
      const a = ageAt(p, day);
      if (st === 'no' && day < b.lo) return `<div class="at-cursor">On ${when}: <b>not yet born</b>, ${fullYears(day, b.lo)} years before this birth.<button class="btn" data-goto="${b.lo}">Go to birth</button></div>`;
      if (st === 'no') return `<div class="at-cursor">On ${when}: <b>had died</b> ${fmtOffset(day, d.hi).replace('earlier', 'before')}.<button class="btn" data-goto="${d.lo}">Go to death</button></div>`;
      const ageText = a ? (a.exact ? `aged <b>${a.text}</b>` : `aged <b>${a.text}</b> (birth ${a.disputed ? 'disputed' : 'known only to the year'})`) : '';
      return `<div class="at-cursor">On ${when}: <b>${st === 'certain' ? 'alive' : 'possibly alive'}</b>, ${ageText}.${st === 'possible' ? ' The date falls inside the uncertainty of a year-only or disputed date.' : ''}<button class="btn" data-goto="${b.lo}">Go to birth</button><button class="btn" data-goto="${d.lo}">Go to death</button></div>`;
    })();

    const disputedBox = disputes.length ? `<div class="disputed-box"><span class="tag tag-disputed">date disputed</span> Two sources disagree and nothing breaks the tie. The project's standing policy is to record both readings and pick neither; the timeline treats the span as a range.
      ${disputes.map(r => `<div class="rd"><div><span>${esc(r.source_modern)}</span>${esc(r.reading_modern)}</div><div><span>${esc(r.source_dar)}</span>${esc(r.reading_dar)}</div></div><div class="footing">${esc(r.note)}</div>`).join('')}</div>` : '';

    const famRows = (list, rel) => list.map(({ person, conf, basis, src }) => `<div class="fam-row"><span class="rel">${rel}</span><span><a class="who" href="#/person/${person.id}" data-person="${person.id}">${esc(person.name)}</a> <span class="muted">${esc(shortSpan(person))}</span>${conf ? `<span class="conf" title="confidence of the link">${esc(conf)}</span>` : ''}<span class="basis">${esc(basis || 'resolved link')}${src ? `, from ${src === 'dar_text' ? 'the 1948 stone reading' : 'the relationship field'}` : ''}</span></span></div>`).join('');
    const famSection = fam.any
      ? `${famRows(fam.spouses, fam.spouses.length > 1 ? 'spouse' : 'spouse')}${famRows(fam.parents, 'parent')}${famRows(fam.children, 'child')}`
      : `<p class="silence">No relationship is stated on the stone or in the register. That is silence in the sources, not evidence that this person had no family.</p>`;

    const lifeEvents = famEvents.map(e => `<li><span class="d">${fmtDate(e.date, e.precision)}</span><span>${esc(eventWords(e))} <a href="#/person/${e.about_person_id}" data-person="${e.about_person_id}">${esc(e.about_person_name)}</a>${e.note && !/^birth of|^death of/.test(e.note) ? ` <span class="muted">${esc(e.note)}</span>` : ''}</span></li>`).join('');
    const marriageText = marriages.map(m => `<li><span class="d">${m.not_before}${m.not_after ? `–${m.not_after}` : ' or later'}</span><span>remarried, to <a href="#/person/${m.remarried_to_id}" data-person="${m.remarried_to_id}">${esc(m.remarried_to)}</a>: ${m.not_after ? 'a bounded window' : 'a lower bound only'}. <span class="muted">${esc(m.basis)}</span></span></li>`).join('');

    const censusRows = p.census.length ? `<table class="census-table"><thead><tr><th>Census</th><th>Occupation</th><th>Industry</th><th>Class</th><th>Match</th></tr></thead><tbody>
      ${p.census.map(c => `<tr><td class="y">${c.y}</td><td>${esc(c.occ) || '<span class="muted">none stated</span>'}</td><td>${esc(c.ind)}</td><td>${esc(c.cls)}</td><td class="muted">${esc(c.match)}${c.match === 'name-only' ? ' (weaker)' : ''}</td></tr>`).join('')}</tbody></table>
      <div class="stone-note">Hamilton enumeration districts, transcribed by the project. Class codes are the census's own (PW private wage, OA own account, GW government wage).</div>` : '';

    const registerSec = (p.cod || p.regVerbatim || p.regParents || p.birthplace || reg.length) ? `<div class="sec"><h3>Loudoun County death register</h3>
      <dl class="kv">${p.cod ? `<dt>Cause</dt><dd>${esc(p.cod)} <span class="muted small">as the register spells it</span></dd>` : ''}${p.regParents ? `<dt>Parents named</dt><dd>${esc(p.regParents)}</dd>` : ''}${p.birthplace ? `<dt>Birthplace</dt><dd>${esc(p.birthplace)}</dd>` : ''}${p.occ ? `<dt>Occupation</dt><dd>${esc(p.occ)}</dd>` : ''}</dl>
      ${p.regVerbatim ? `<div class="verbatim" style="margin-top:8px">${esc(p.regVerbatim)}</div>` : ''}
      ${reg.map(r => `<div class="src-line" style="margin-top:6px">Register entry, ${esc(r.year)}: ${esc(r.basis)}${r.ark ? `. FamilySearch image ARK ${esc(r.ark)}` : ''}</div>`).join('')}</div>` : '';

    const clustersSec = clusters.length ? `<div class="sec"><h3>A family's loss, in one window</h3>${clusters.map(c => `<p class="small">Plot ${esc(c.plot)}, ${esc(c.cemetery)}: ${c.n_lost} people in this plot died within ${c.span_days === 0 ? 'a single day' : c.span_days + ' days'} (${fmtDate(c.first_death, 'day')} to ${fmtDate(c.last_death, 'day')}). ${c.people.map(x => x.id && x.id !== p.id ? `<a href="#/person/${x.id}" data-person="${x.id}">${esc(x.text)}</a>` : esc(x.text)).join('; ')}. <span class="muted">${esc(c.assessment)}; from the stones, not the register.</span></p>`).join('')}</div>` : '';

    return `
      <h2 data-k="${esc([CEMETERY_NAME[p.cem], p.plot ? `plot ${p.plot}` : 'no plot recorded', p.id].filter(Boolean).join(' · '))}">${esc(p.name)}</h2>
      <div class="dates">${datesLine}</div>
      ${disputedBox}
      ${atCursor}
      ${p.stone ? `<div class="sec"><h3>The stone, as read in 1948</h3><div class="stone">${esc(p.stone)}</div><div class="stone-note">Verbatim from the DAR Genealogical Records Committee survey of standing stones, 1948. The survey typed names, dates, ages and relationships; any verse or other wording on the stone is not in this record.</div>${p.stoneOpen ? `<div class="stone-note cut-before">${p.dy === null ? 'The survey found the death date open on this stone, and no source in this record gives a death.' : p.dy > 1950 ? `Cut before the death. The 1948–50 survey found this name on the stone with the death date still open; the death came in ${p.dy}.` : `The survey found the death date open on this stone, though the death is recorded in ${p.dy}: the date was not yet cut.`}</div>` : ''}</div>` : ''}
      ${p.vet || p.mil ? `<div class="sec"><h3>Military service, as the sources record it</h3><dl class="kv">${p.mil ? `<dt>On the stone</dt><dd>${esc(p.mil)} <span class="muted small">as inscribed, from the Balch cemetery transcription</span></dd>` : ''}${p.vet ? `<dt>Veteran flag</dt><dd>Marked as a veteran on Find a Grave's memorial listing. <span class="muted small">The listing does not say which war or branch.</span></dd>` : ''}</dl></div>` : ''}
      ${registerSec}
      <div class="sec"><h3>Family, as the sources state it</h3>${famSection}</div>
      ${lifeEvents || marriageText ? `<div class="sec"><h3>Life events the links make datable</h3><ul class="life-events">${lifeEvents}${marriageText}</ul></div>` : ''}
      ${clustersSec}
      ${censusRows ? `<div class="sec"><h3>In the census</h3>${censusRows}</div>` : ''}
      ${news.length ? `<div class="sec"><h3>In the newspapers</h3>${news.map(f => `<div class="finding">${esc(f.quoted_snippet)}<div class="ft">${esc(f.source)}; ${esc(f.verdict)}. ${esc(f.new_fact)}</div></div>`).join('')}</div>` : ''}
      ${findings.length ? `<div class="sec"><h3>Corrections and verified findings</h3>${findings.map(f => `<div class="finding">${esc(f.finding_type.replace(/_/g, ' '))}: ${f.was ? `<span class="muted">was</span> ${esc(f.was)} <span class="muted">now</span> ` : ''}${esc(f.now)}<div class="ft">${esc(f.note)}${f.source_ark ? ` (ARK ${esc(f.source_ark)})` : ''}</div></div>`).join('')}</div>` : ''}
      ${p.aka.length ? `<div class="sec"><h3>Also recorded as</h3>${p.aka.map(a => `<p class="small"><b>${esc(a.name)}</b> <span class="muted">${a.id} · ${esc(sourcesWords(a.src))}${a.plot ? ` · plot ${esc(a.plot)}` : ''} · ${esc(a.bd || '?')} to ${esc(a.dd || '?')}</span>${a.stone && a.stone !== p.stone ? `<br><span class="stone-line">${esc(a.stone)}</span>` : ''}</p>`).join('')}<p class="stone-note">The same person entered twice in the sources, confirmed by the project's owner on 29 October 2026 (curation/duplicates.csv). Counted once everywhere in this app; both records are kept in the data.</p></div>` : ''}
      ${p.maybe.length ? `<div class="sec"><h3>Possibly the same person as</h3>${p.maybe.map(m => `<p class="small"><a href="#/person/${m.id}" data-person="${m.id}">${esc(m.name)}</a> <span class="muted">${m.id}</span></p>`).join('')}${[...new Set(p.maybe.map(m => m.why))].map(w => `<p class="stone-note">${MAYBE_WORDS[w]}</p>`).join('')}</div>` : ''}
      ${p.unresolved === 'stone-gives-death' ? `<div class="sec"><h3>Unresolved</h3><p class="stone-note">The 1948 reading of this stone records a death, with an age at death, on the date this record gives as a birth. Which is right is unresolved; the record is kept as written.</p></div>` : ''}
      <div class="source"><span>SOURCE</span>${esc(sourcesWords(p.src))}${p.use !== 'yes' ? `<br>Timeline status: ${esc(p.use)}${p.note ? ` (${esc(p.note)})` : ''}.` : ''}</div>
    `;
  }
}
// Source notes reworded where the bare note would read as the app's own mistake.
const MAYBE_WORDS = {
  'dates-agree': 'The dates agree and part of the name is shared, but the owner could not confirm it. Both are counted as separate people.',
  'birth-is-death': 'One of these records gives as a birth date the very day the other records as a death. It may be one person whose death date was entered as a birth; that is unresolved, and both are counted as separate people.',
};
const NOTE_WORDS = { 'death precedes birth': 'the recorded dates conflict, with the death date before the birth date, and neither is treated as correct' };
function shortSpan(p) {
  const b = p.by ?? '', d = p.dy ?? '';
  return b || d ? `${b}–${d}` : '';
}
function eventWords(e) {
  return { widowed: 'widowed by the death of', child_born: 'birth of', child_died: 'death of', died_in_childbirth: 'died in childbirth; the register records' }[e.event] || e.event;
}
function sourcesWords(src) {
  const map = { 'balch-db': 'Thomas Balch Library cemetery database', 'findagrave': 'Find a Grave (data shipped with the project; no live calls)' };
  return (src || '').split(';').map(s => map[s] || s).join('; ');
}
