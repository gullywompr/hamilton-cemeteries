// The 1853 map page.
import { n } from './derive.js';
import { esc } from './timeline.js';

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
