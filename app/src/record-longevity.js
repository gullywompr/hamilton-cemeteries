// The record page, "Years lived" (APP_SPEC §11).
import { n } from './derive.js';
import { esc } from './timeline.js';
import { f1 } from './view-shared.js';

// ---------------------------------------------------------------------------
// Years lived: median age at death of adults, Lakeview and Pleasant Valley.
// Rules (owner's brief for this section): never "life expectancy"; n beside
// every median; the 2000-2026 difference is not established and is not
// printed as a finding; say these are two burial populations, not two samples
// of the town; attribute no cause; no ranking, no claim about any person.
// ---------------------------------------------------------------------------
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
