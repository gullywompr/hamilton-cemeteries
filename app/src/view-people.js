// The People page: everyone in the record, filterable, including those who
// cannot be placed on a span.
import { lifeSpan, n } from './derive.js';
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
