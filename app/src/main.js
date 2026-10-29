// Entry point: loads the data, wires the timeline, panels, drawer, search and
// the hash router. URL carries the view and the chosen date, so a date can
// be shared: #/timeline/1865-05-14
import { loadAll } from './data.js';
import { Timeline, esc } from './timeline.js';
import { CursorPanel, LivingList, Drawer, computeLiving } from './panels.js';
import { renderPeople, renderFamilies, renderRecord, renderMap } from './views.js';
import { dayOf, isoOf, fromIso, fmtDay, yearStart, lifeSpan, CEMETERY_NAME } from './derive.js';

const $ = (s) => document.querySelector(s);

async function main() {
  let D;
  try { D = await loadAll(); }
  catch (e) { $('#loading').textContent = `The data could not be loaded: ${e.message}. Run "npm run data" and serve the app folder (npm start).`; return; }
  $('#loading').hidden = true;

  const tl = new Timeline($('#tl-canvas'), $('#tl-tip'), D);
  const openPerson = (id) => { drawer.open(id); };
  const cursorPanel = new CursorPanel($('#cursor-panel'), D, tl, openPerson);
  const livingList = new LivingList($('#living'), D, openPerson);
  const drawer = new Drawer($('#drawer'), $('#drawer-body'), $('#scrim'), $('#drawer-close'), D, tl, () => {
    if (location.hash.startsWith('#/person/')) history.replaceState(null, '', `#/${currentView}${currentView === 'timeline' ? '/' + isoOf(tl.day) : ''}`);
  });

  // ---- timeline → panels ----
  let living = computeLiving(D, tl.day);
  const dateInput = $('#date-input');
  const refreshPanels = () => {
    living = computeLiving(D, tl.day);
    cursorPanel.render(living);
    livingList.render(living);
    drawer.refresh(tl.day);
  };
  let pending = null;
  tl.on('change', (day) => {
    dateInput.value = isoOf(day);
    if (currentView === 'timeline' && !location.hash.startsWith('#/person/')) history.replaceState(null, '', `#/timeline/${isoOf(day)}`);
    clearTimeout(pending); pending = setTimeout(refreshPanels, 140);
  });
  tl.on('play', (on) => { $('#btn-play').setAttribute('aria-pressed', String(on)); $('#btn-play').textContent = on ? 'Pause' : 'Play'; });
  tl.on('pick', (hit) => {
    if (hit.kind === 'person') openPerson(hit.span.p.id);
    else if (hit.kind === 'one') openPerson(hit.it.p.id);
    else if (hit.kind === 'event') { tl.selectEvent(hit.e); tl.setDate(hit.e.iv.lo, true); }
    else if (hit.kind === 'era') { tl.setDate(hit.era.s.lo, true); }
    else if (hit.kind === 'absence') { location.hash = '#/record?tab=absent'; }
  });

  // ---- controls ----
  dateInput.addEventListener('change', () => { const d = fromIso(dateInput.value); if (d !== null) tl.setDate(d, true); });
  const stepBy = (dir) => (e) => tl.step(dir * (e.altKey ? 1 : e.shiftKey ? 3652.4 : 365.24));
  $('#btn-back').addEventListener('click', stepBy(-1));
  $('#btn-fwd').addEventListener('click', stepBy(1));
  $('#btn-play').addEventListener('click', () => tl.play());
  $('#btn-zoom-in').addEventListener('click', () => tl.zoomBy(1.6));
  $('#btn-zoom-out').addEventListener('click', () => tl.zoomBy(1 / 1.6));
  $('#btn-zoom-all').addEventListener('click', () => tl.fitAll());

  // Jumps: notable dates, every one taken from the data.
  const jumps = [];
  const peak = D.population.reduce((a, b) => (b[1] > a[1] ? b : a));
  jumps.push({ label: `${peak[0]}, the peak`, day: dayOf(peak[0], 7, 1) });
  const raid = D.datedEvents.find(e => /Burning Raid begins/.test(e.title)); if (raid) jumps.push({ label: 'The Burning Raid', day: raid.iv.lo });
  jumps.push({ label: '1 January 1866', day: dayOf(1866, 1, 1) });
  const koch = D.datedEvents.find(e => /tubercle|Koch/.test(e.title)); if (koch) jumps.push({ label: 'Koch, 1882', day: koch.iv.lo });
  const flu = D.datedEvents.find(e => /Influenza pandemic peaks/.test(e.title)); if (flu) jumps.push({ label: 'Influenza, 1918', day: flu.iv.lo });
  const pv = D.datedEvents.find(e => /Pleasant Valley Cemetery established/.test(e.title)); if (pv) jumps.push({ label: 'Pleasant Valley opens', day: pv.iv.lo });
  const loves = D.family.lossesCemetery.find(c => c.plot === 'N-23'); if (loves) jumps.push({ label: 'The Loves, 1943', day: fromIso(loves.first_death) });
  $('#jumps').innerHTML = jumps.map((j, i) => `<button class="chip" data-jump="${i}">${esc(j.label)}</button>`).join('');
  $('#jumps').addEventListener('click', (e) => { const b = e.target.closest('[data-jump]'); if (b) tl.setDate(jumps[Number(b.dataset.jump)].day, true); });

  // Layer toggles
  const layersEl = $('#tl-layers');
  layersEl.innerHTML = `
    <div class="group"><span>Events</span>${D.eventLayers.map(l => `<button class="chip on" data-event-layer="${l}" aria-pressed="true"><i></i>${l}</button>`).join('')}</div>
    <div class="group"><span>Strata</span>${D.eraLayers.map(l => `<button class="chip${tl.eraLayers.has(l) ? ' on' : ''}" data-era-layer="${l}" aria-pressed="${tl.eraLayers.has(l)}"><i></i>${l}</button>`).join('')}<button class="chip on" data-absence aria-pressed="true"><i></i>not recorded</button></div>
    <label><input type="checkbox" id="opt-color" checked> colour by cemetery <span class="dot L" title="Lakeview"></span><span class="dot H" title="Harmony"></span><span class="dot P" title="Pleasant Valley"></span></label>`;
  layersEl.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip'); if (!b) return;
    const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    if (b.dataset.eventLayer) tl.setEventLayer(b.dataset.eventLayer, on);
    else if (b.dataset.eraLayer) tl.setEraLayer(b.dataset.eraLayer, on);
    else if ('absence' in b.dataset) tl.setShowAbsence(on);
    cursorPanel.render(living);
  });
  $('#opt-color').addEventListener('change', (e) => tl.setColorByCem(e.target.checked));
  // Detail: every event layer in its own row, every stratum drawn. Compact
  // (the default) merges events into one row and keeps the documentation
  // stratum and the absence band, so the field has the height.
  const detailBtn = $('#btn-detail');
  const setDetail = (on) => {
    detailBtn.setAttribute('aria-pressed', String(on));
    tl.setMergeEvents(!on);
    for (const b of layersEl.querySelectorAll('[data-era-layer]')) {
      const want = on || b.dataset.eraLayer === 'documentation';
      b.classList.toggle('on', want); b.setAttribute('aria-pressed', String(want));
      tl.setEraLayer(b.dataset.eraLayer, want);
    }
    cursorPanel.render(living);
  };
  detailBtn.addEventListener('click', () => setDetail(detailBtn.getAttribute('aria-pressed') !== 'true'));
  const layersBtn = $('#btn-layers');
  layersBtn.addEventListener('click', () => {
    const open = layersEl.hidden; layersEl.hidden = !open; layersBtn.setAttribute('aria-expanded', String(open));
  });

  // ---- search ----
  const q = $('#q'), qr = $('#q-results');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const index = D.people.map(p => ({ p, t: norm(`${p.name} ${p.surname || ''} ${p.plot || ''} ${p.id}`) }));
  let sel = -1, results = [];
  const showResults = () => {
    const v = norm(q.value.trim());
    if (v.length < 2) { qr.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
    results = index.filter(x => x.t.includes(v)).slice(0, 40);
    qr.innerHTML = results.map((x, i) => `<a class="q-row" href="#/person/${x.p.id}" role="option" aria-selected="${i === sel}" data-person="${x.p.id}"><span class="q-name">${esc(x.p.name)}</span><span class="q-meta">${esc(lifeSpan(x.p))}<br>${CEMETERY_NAME[x.p.cem]}${x.p.plot ? ', ' + esc(x.p.plot) : ''}</span></a>`).join('') + (results.length === 40 ? '<div class="q-more">Showing the first 40. Keep typing.</div>' : results.length ? '' : '<div class="q-more">No one by that name, surname, plot or id.</div>');
    qr.hidden = false; q.setAttribute('aria-expanded', 'true');
  };
  q.addEventListener('input', () => { sel = -1; showResults(); });
  q.addEventListener('focus', showResults);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); showResults(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); showResults(); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[Math.max(0, sel)]; if (r) { openPerson(r.p.id); qr.hidden = true; q.blur(); } }
    else if (e.key === 'Escape') { qr.hidden = true; q.blur(); }
  });
  qr.addEventListener('click', (e) => { const a = e.target.closest('[data-person]'); if (a) { e.preventDefault(); openPerson(a.dataset.person); qr.hidden = true; q.value = ''; } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) qr.hidden = true; });
  q.closest('form').addEventListener('submit', (e) => e.preventDefault());

  // ---- router ----
  const views = { timeline: $('#view-timeline'), people: $('#view-people'), families: $('#view-families'), record: $('#view-record'), map: $('#view-map') };
  const rendered = new Set();
  let currentView = 'timeline';
  const ctx = { openPerson, tl };
  function show(view, params) {
    if (!views[view]) view = 'timeline';
    currentView = view;
    for (const [k, el] of Object.entries(views)) el.hidden = k !== view;
    document.querySelectorAll('.nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.view === view) || (a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    if (view !== 'timeline' && !rendered.has(view)) {
      rendered.add(view);
      ({ people: renderPeople, families: renderFamilies, record: renderRecord, map: renderMap })[view](views[view], D, ctx, params);
    } else if (views[view]._onParams) views[view]._onParams(params);
    if (view === 'timeline') { tl.resize(); $('#tl-canvas').focus({ preventScroll: true }); }
    window.scrollTo({ top: 0 });
  }
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'person' && parts[1]) {
      if (!rendered.size && currentView === 'timeline') show('timeline');
      openPerson(parts[1].toUpperCase()); return;
    }
    if (parts[0] === 'timeline' && parts[1]) { const d = fromIso(parts[1]); if (d !== null) tl.setDate(d, false); }
    show(parts[0] || 'timeline', params);
  }
  window.addEventListener('hashchange', route);
  route();
  refreshPanels();
  dateInput.value = isoOf(tl.day);
}

main();
