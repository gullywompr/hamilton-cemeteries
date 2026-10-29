// The scrolling timeline. A canvas, 1754–2026, with the chosen date fixed at
// a vertical line while the record moves under it.
//
// Vertical order (top to bottom):
//   axis · event rows · people alive by year (measured) · the field (every
//   placeable person, one thin line from birth to death, ranked by birth) ·
//   people placeable at one date only · strata (eras, with absence hatched)
//
// Three grammars are kept visually distinct (§3.6): a person is a stroke you
// can hover and open; a count is a ruled area; an absence is hatching.

import { dayOf, ymd, yearOf, yearStart, fmtDay, fmtDate, MONTHS, daysInMonth, lifeSpan, CEMETERY_NAME } from './derive.js';

const YEAR = 365.2425;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Timeline {
  constructor(canvas, tipEl, D) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.tip = tipEl; this.D = D;
    this.center = dayOf(1865, 5, 14);
    this.ppd = 14 / YEAR;                 // pixels per day; 14 px per year
    this.minPpd = 3 / YEAR; this.maxPpd = 40;
    this.eventLayers = new Set(D.eventLayers);
    // Compact by default: events share one row and only the documentation
    // stratum and the absence band are drawn, so the field keeps the height.
    this.mergeEvents = true;
    this.eraLayers = new Set(D.eraLayers.filter(l => l === 'documentation'));
    this.colorByCem = true;
    this.showAbsence = true;
    this.hover = null; this.selectedEvent = null;
    this.listeners = {};
    this.hits = [];
    this.gutter = 98;
    this.tokens = readTokens();
    this.hatch = makeHatch(this.tokens.hatchInk);
    this.eraLanes = this.computeEraLanes();
    this.cursorFrac = 0.4;
    this.bindEvents();
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.retheme());
    this.resize();
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return this; }
  emit(evt, arg) { for (const fn of this.listeners[evt] || []) fn(arg); }

  retheme() { this.tokens = readTokens(); this.hatch = makeHatch(this.tokens.hatchInk); this.requestDraw(); }
  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.W = Math.max(320, Math.round(r.width)); this.H = Math.max(200, Math.round(r.height));
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cursorX = Math.round(this.W < 700 ? this.W * 0.5 : this.gutter + (this.W - this.gutter) * this.cursorFrac);
    this.requestDraw();
  }

  // ---- coordinates ----
  x(day) { return this.cursorX + (day - this.center) * this.ppd; }
  dayAt(x) { return this.center + (x - this.cursorX) / this.ppd; }
  get day() { return Math.round(this.center); }
  clamp(d) { return Math.min(this.D.maxDay, Math.max(this.D.minDay, d)); }

  // ---- public controls ----
  setDate(day, animate = true) {
    day = this.clamp(day);
    if (!animate || reduceMotion() || Math.abs(day - this.center) * this.ppd < 2) { this.center = day; this.changed(); return; }
    const from = this.center, dist = day - from, t0 = performance.now(), dur = 520;
    this.anim = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.center = from + dist * e; this.changed();
      if (t < 1) requestAnimationFrame(this.anim); else this.anim = null;
    };
    requestAnimationFrame(this.anim);
  }
  step(days) { this.stopPlay(); this.setDate(this.center + days, true); }
  zoomBy(f) {
    this.ppd = Math.min(this.maxPpd, Math.max(this.minPpd, this.ppd * f));
    this.requestDraw(); this.emit('zoom', this.ppd);
  }
  fitAll() {
    this.ppd = (this.W - this.gutter - 24) / (this.D.maxDay - this.D.minDay);
    this.center = this.clamp(this.center); this.requestDraw(); this.emit('zoom', this.ppd);
  }
  play() {
    if (this.playing) return this.stopPlay();
    this.playing = true; this.emit('play', true);
    let last = performance.now();
    const tick = (now) => {
      if (!this.playing) return;
      const dt = (now - last) / 1000; last = now;
      // one year per second at the default zoom, slower when zoomed in
      const speed = Math.min(YEAR, Math.max(2, 14 / this.ppd / 1.0)) ;
      this.center += dt * speed;
      if (this.center >= this.D.maxDay) { this.center = this.D.maxDay; this.stopPlay(); }
      this.changed(); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  stopPlay() { if (this.playing) { this.playing = false; this.emit('play', false); } }
  setEventLayer(layer, on) { on ? this.eventLayers.add(layer) : this.eventLayers.delete(layer); this.requestDraw(); }
  setEraLayer(layer, on) { on ? this.eraLayers.add(layer) : this.eraLayers.delete(layer); this.requestDraw(); }
  setMergeEvents(v) { this.mergeEvents = v; this.requestDraw(); }
  setColorByCem(v) { this.colorByCem = v; this.requestDraw(); }
  setShowAbsence(v) { this.showAbsence = v; this.requestDraw(); }
  selectEvent(e) { this.selectedEvent = e; this.requestDraw(); }
  changed() { this.center = this.clamp(this.center); this.requestDraw(); this.emit('change', this.day); }
  requestDraw() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = null; this.draw(); }); }

  // ---- era lanes: greedy packing per layer; eras overlap and nest, this is not a partition ----
  computeEraLanes() {
    const out = {};
    for (const layer of this.D.eraLayers) {
      const items = this.D.eras.filter(e => e.layer === layer).sort((a, b) => a.s.lo - b.s.lo);
      const laneEnd = [];
      const placed = items.map(era => {
        const lo = era.s.lo, hi = era.e ? era.e.hi : Infinity;
        let lane = laneEnd.findIndex(end => end < lo);
        if (lane < 0) { lane = laneEnd.length; laneEnd.push(hi); } else laneEnd[lane] = hi;
        return { era, lane };
      });
      out[layer] = { items: placed, lanes: laneEnd.length };
    }
    return out;
  }

  // ---- layout ----
  layout() {
    const G = this.gutter, W = this.W, H = this.H;
    const axisH = 26, rowH = this.mergeEvents ? 16 : 13, popH = 66, oneH = 24, eraRow = 10, eraGap = 2, groupGap = 8;
    const enabled = [...this.D.eventLayers].filter(l => this.eventLayers.has(l));
    const eventRows = this.mergeEvents ? (enabled.length ? ['events'] : []) : enabled;
    const eventsH = eventRows.length ? eventRows.length * rowH + 6 : 0;
    let erasH = 0;
    const eraGroups = [];
    if (this.showAbsence) { eraGroups.push({ layer: 'absence', lanes: 1 }); erasH += eraRow + groupGap; }
    for (const layer of this.D.eraLayers) if (this.eraLayers.has(layer)) {
      const g = this.eraLanes[layer]; eraGroups.push({ layer, lanes: g.lanes, items: g.items });
      erasH += g.lanes * (eraRow + eraGap) - eraGap + groupGap;
    }
    const fieldTop = axisH + eventsH + popH + 10;
    const fieldH = Math.max(90, H - fieldTop - oneH - erasH - 14);
    return { G, W, H, axisH, rowH, popH, oneH, eraRow, eraGap, groupGap, eventRows, eventsH, eventsTop: axisH + 4, popTop: axisH + eventsH + 4, fieldTop, fieldH, oneTop: fieldTop + fieldH + 6, erasTop: fieldTop + fieldH + oneH + 10, eraGroups };
  }

  // ---- drawing ----
  draw() {
    const ctx = this.ctx, T = this.tokens, L = this.layout();
    this.hits = [];
    ctx.clearRect(0, 0, L.W, L.H);
    ctx.fillStyle = T.stone; ctx.fillRect(0, 0, L.W, L.H);
    this.drawAxis(L);
    ctx.save(); ctx.beginPath(); ctx.rect(L.G, L.axisH, L.W - L.G, L.H - L.axisH); ctx.clip();
    this.drawEvents(L);
    this.drawPopulation(L);
    this.drawField(L);
    this.drawOneDate(L);
    this.drawEras(L);
    ctx.restore();
    this.drawGutter(L);
    this.drawCursor(L);
    this.drawHover(L);
  }

  drawAxis(L) {
    const ctx = this.ctx, T = this.tokens, ppy = this.ppd * YEAR;
    const d0 = this.dayAt(L.G), d1 = this.dayAt(L.W);
    const y0 = yearOf(d0) - 1, y1 = yearOf(d1) + 1;
    ctx.font = `500 12px ${T.sans}`; ctx.textBaseline = 'middle';
    const steps = [1, 2, 5, 10, 20, 25, 50, 100];
    const step = steps.find(s => s * ppy >= 64) || 100;
    const minor = step >= 10 ? step / 5 : step >= 5 ? 1 : 0;
    const mode = this.ppd >= 20 ? 'day' : ppy >= 760 ? 'month' : 'year';
    ctx.strokeStyle = T.rule; ctx.lineWidth = 1;
    if (mode === 'year') {
      for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
        const x = Math.round(this.x(yearStart(y))) + 0.5;
        if (x < L.G) continue;
        ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x, L.axisH - 6); ctx.lineTo(x, L.H); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = T.ink3; ctx.textAlign = 'left';
        if (x + 5 < this.cursorX - 8 || x > this.cursorX + 110) ctx.fillText(String(y), x + 5, 12); // keep clear of the date label
      }
      if (minor) for (let y = Math.floor(y0 / minor) * minor; y <= y1; y += minor) {
        if (y % step === 0) continue;
        const x = Math.round(this.x(yearStart(y))) + 0.5; if (x < L.G) continue;
        ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x, L.axisH - 3); ctx.lineTo(x, L.axisH); ctx.stroke(); ctx.globalAlpha = 1;
      }
    } else {
      for (let y = y0; y <= y1; y++) for (let m = 1; m <= 12; m++) {
        const x = Math.round(this.x(dayOf(y, m, 1))) + 0.5; if (x < L.G || x > L.W) continue;
        ctx.globalAlpha = m === 1 ? 0.9 : 0.5; ctx.beginPath(); ctx.moveTo(x, L.axisH - 6); ctx.lineTo(x, m === 1 ? L.H : L.axisH); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = T.ink2; ctx.textAlign = 'left';
        ctx.fillText(m === 1 ? `${MONTHS[0].slice(0, 3)} ${y}` : MONTHS[m - 1].slice(0, 3), x + 4, 12);
        if (mode === 'day') {
          const dim = daysInMonth(y, m), every = this.ppd >= 40 ? 1 : this.ppd >= 28 ? 2 : 5;
          for (let d = 2; d <= dim; d++) {
            const xd = Math.round(this.x(dayOf(y, m, d))) + 0.5;
            ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(xd, L.axisH - 3); ctx.lineTo(xd, L.axisH); ctx.stroke(); ctx.globalAlpha = 1;
            if ((d - 1) % every === 0) { ctx.fillStyle = T.ink3; ctx.font = `400 10px ${T.sans}`; ctx.fillText(String(d), xd + 3, 12); ctx.font = `500 12px ${T.sans}`; }
          }
        }
      }
    }
    ctx.strokeStyle = T.ink3; ctx.beginPath(); ctx.moveTo(L.G, L.axisH + 0.5); ctx.lineTo(L.W, L.axisH + 0.5); ctx.stroke();
  }

  drawEvents(L) {
    const ctx = this.ctx, T = this.tokens;
    const d0 = this.dayAt(L.G) - 3700, d1 = this.dayAt(L.W);
    ctx.font = `400 11px ${T.sans}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    L.eventRows.forEach((layer, i) => {
      const y = L.eventsTop + i * L.rowH + L.rowH / 2;
      const inRow = layer === 'events' ? (e) => this.eventLayers.has(e.layer) : (e) => e.layer === layer;
      let labelEnd = -Infinity;
      for (const e of this.D.datedEvents) {
        if (!inRow(e) || e.iv.hi < d0 || e.iv.lo > d1) continue;
        const x0 = this.x(e.iv.lo), x1 = this.x(e.iv.hi);
        const point = e.iv.p === 'day';
        const w = point ? 2 : Math.max(3, x1 - x0);
        const h = point ? 9 : 7;
        const verified = e.confidence === 'verified';
        const selected = this.selectedEvent === e;
        ctx.setLineDash(e.confidence === 'disputed' ? [2, 2] : []);
        if (verified) { ctx.fillStyle = selected ? T.now : T.ink3; ctx.fillRect(x0, y - h / 2, w, h); }
        else { ctx.strokeStyle = selected ? T.now : T.ink3; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y - h / 2 + 0.5, Math.max(w, 4) - 1, h - 1); }
        ctx.setLineDash([]);
        this.hits.push({ kind: 'event', e, x0: x0 - 4, x1: x0 + Math.max(w, 4) + 4, y0: y - 7, y1: y + 7 });
        const lx = x0 + Math.max(w, 2) + 4;
        if (lx > labelEnd + 10 && lx < L.W) {
          const text = e.title + (verified ? '' : e.confidence === 'disputed' ? '  (date disputed)' : '  (unverified)');
          const tw = ctx.measureText(text).width;
          const nextStart = this.nextEventX(inRow, e);
          const room = Math.min(L.W, nextStart) - lx - 4;
          // Label only when the whole title fits, or at least a readable
          // two-thirds of it; otherwise the hover and the panel carry it.
          const shown = tw <= room ? text : (room >= Math.min(tw * 0.66, 160) ? truncate(ctx, text, room) : '');
          if (shown) {
            ctx.fillStyle = verified ? T.ink2 : T.ink3; ctx.fillText(shown, lx, y);
            labelEnd = lx + ctx.measureText(shown).width;
            this.hits.push({ kind: 'event', e, x0: lx, x1: labelEnd, y0: y - 7, y1: y + 7 });
          }
        }
      }
    });
  }
  nextEventX(inRow, e) {
    const arr = this.D.datedEvents; const i = arr.indexOf(e);
    for (let k = i + 1; k < arr.length; k++) if (inRow(arr[k])) return this.x(arr[k].iv.lo);
    return Infinity;
  }

  drawPopulation(L) {
    const ctx = this.ctx, T = this.tokens, D = this.D;
    const top = L.popTop + 10, h = L.popH - 14, max = D.popMax;
    const y0 = yearOf(this.dayAt(L.G)) - 1, y1 = yearOf(this.dayAt(L.W)) + 1;
    ctx.beginPath();
    let first = true;
    for (let y = Math.max(1754, y0); y <= Math.min(2026, y1); y++) {
      const v = D.popByYear.get(y) || 0, yy = top + h - (v / max) * h;
      const xa = this.x(yearStart(y)), xb = this.x(yearStart(y + 1));
      if (first) { ctx.moveTo(xa, top + h); ctx.lineTo(xa, yy); first = false; } else ctx.lineTo(xa, yy);
      ctx.lineTo(xb, yy);
    }
    const xEnd = this.x(yearStart(Math.min(2027, y1 + 1)));
    ctx.lineTo(xEnd, top + h); ctx.closePath();
    ctx.fillStyle = T.s1; ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = T.s1; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); first = true;
    for (let y = Math.max(1754, y0); y <= Math.min(2026, y1); y++) {
      const v = D.popByYear.get(y) || 0, yy = top + h - (v / max) * h;
      const xa = this.x(yearStart(y)), xb = this.x(yearStart(y + 1));
      if (first) { ctx.moveTo(xa, yy); first = false; } else ctx.lineTo(xa, yy);
      ctx.lineTo(xb, yy);
    }
    ctx.stroke();
    // baseline
    ctx.strokeStyle = T.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.G, top + h + 0.5); ctx.lineTo(L.W, top + h + 0.5); ctx.stroke();
    // the value at the cursor year
    const cy = yearOf(this.center), cv = D.popByYear.get(cy) || 0, cyy = top + h - (cv / max) * h;
    ctx.fillStyle = T.stone; ctx.beginPath(); ctx.arc(this.cursorX, cyy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(this.cursorX, cyy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.font = `600 11px ${T.sans}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = T.ink;
    ctx.fillText(`${cv.toLocaleString()} in ${cy}`, this.cursorX + 8, cyy - 3);
    L.popBase = top + h; L.popPlotTop = top;
  }

  drawField(L) {
    const ctx = this.ctx, T = this.tokens, D = this.D, spans = D.spans;
    const N = spans.length, top = L.fieldTop, H = L.fieldH;
    const laneH = H / N;
    // One lane per person, so a pixel's coverage is the share of its lanes
    // occupied by a life on that day: the field's density is the data.
    const lw = laneH >= 2.5 ? Math.min(3, laneH * 0.7) : Math.max(0.3, laneH);
    const d0 = this.dayAt(L.G), d1 = this.dayAt(L.W), c = this.center;
    const hues = this.colorByCem ? { L: T.lv, H: T.hm, P: T.pv } : { L: T.ink, H: T.ink, P: T.ink };
    // batches: [cem][status][segment]
    const batches = new Map();
    const key = (cem, status, seg) => `${cem}|${status}|${seg}`;
    const add = (k, xa, ya, xb) => { let b = batches.get(k); if (!b) { b = []; batches.set(k, b); } b.push(xa, ya, xb); };
    for (let i = 0; i < N; i++) {
      const s = spans[i];
      if (s.dHi < d0 || s.bLo > d1) continue;
      const y = top + (i + 0.5) * laneH;
      const status = (c < s.bLo || c > s.dHi) ? 'dead' : (c >= s.bHi && c <= s.dLo) ? 'certain' : 'possible';
      const cem = s.p.cem;
      if (s.bHi <= s.dLo) {
        add(key(cem, status, 'main'), this.x(s.bHi), y, this.x(s.dLo));
        if (s.bHi > s.bLo) add(key(cem, status, 'soft'), this.x(s.bLo), y, this.x(s.bHi));
        if (s.dHi > s.dLo) add(key(cem, status, 'soft'), this.x(s.dLo), y, this.x(s.dHi));
      } else {
        add(key(cem, status, 'soft'), this.x(s.bLo), y, this.x(s.dHi));
      }
    }
    const alpha = { dead: 0.3, possible: 0.68, certain: 1 };
    ctx.lineCap = 'butt';
    for (const [k, arr] of batches) {
      const [cem, status, seg] = k.split('|');
      ctx.strokeStyle = hues[cem];
      ctx.globalAlpha = alpha[status] * (seg === 'soft' ? 0.42 : 1);
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let j = 0; j < arr.length; j += 3) {
        const xa = Math.max(L.G - 2, arr[j]), xb = Math.min(L.W + 2, arr[j + 2]);
        ctx.moveTo(xa, arr[j + 1]); ctx.lineTo(Math.max(xb, xa + 0.8), arr[j + 1]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    L.laneH = laneH;
  }

  drawOneDate(L) {
    const ctx = this.ctx, T = this.tokens, items = this.D.oneDate, M = items.length;
    const top = L.oneTop, h = L.oneH - 8, d0 = this.dayAt(L.G), d1 = this.dayAt(L.W);
    ctx.lineWidth = 1;
    for (const it of items) {
      if (it.hi < d0 || it.lo > d1) continue;
      const x = this.x(it.lo), y = top + 4 + (it.rank / Math.max(1, M - 1)) * h;
      const col = this.colorByCem ? { L: T.lv, H: T.hm, P: T.pv }[it.p.cem] : T.ink2;
      if (it.hi > it.lo) { ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(this.x(it.hi), y + 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
      if (it.kind === 'birth-only') { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.fillRect(x - 2.5, y - 2.5, 5, 5); }
      this.hits.push({ kind: 'one', it, x0: x - 5, x1: Math.max(x + 5, this.x(it.hi)), y0: y - 5, y1: y + 5 });
    }
  }

  drawEras(L) {
    const ctx = this.ctx, T = this.tokens;
    let y = L.erasTop;
    ctx.font = `400 11px ${T.sans}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const g of L.eraGroups) {
      if (g.layer === 'absence') {
        for (const band of this.D.absenceBands) {
          const x0 = Math.max(L.G, this.x(band.lo)), x1 = Math.min(L.W, this.x(band.hi));
          if (x1 > L.G && x0 < L.W) {
            ctx.fillStyle = this.hatch; ctx.fillRect(x0, y, x1 - x0, L.eraRow);
            ctx.strokeStyle = T.s2; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y + 0.5, x1 - x0 - 1, L.eraRow - 1);
            this.label(band.label, x0, x1, y + L.eraRow / 2, T.ink);
            this.hits.push({ kind: 'absence', band, x0, x1, y0: y, y1: y + L.eraRow });
          }
        }
        y += L.eraRow + L.groupGap;
        continue;
      }
      g.top = y;
      for (const { era, lane } of g.items) {
        const yy = y + lane * (L.eraRow + L.eraGap);
        const rawX0 = this.x(era.s.lo), rawX1 = era.e ? this.x(era.e.hi) : Infinity;
        const x0 = Math.max(L.G, rawX0), x1 = Math.min(L.W + 2, rawX1);
        if (x1 <= L.G || x0 >= L.W) continue;
        const absence = this.D.absenceEraIds.has(era.id);
        if (era.confidence !== 'verified') {
          ctx.setLineDash([3, 3]); ctx.strokeStyle = T.ink2; ctx.lineWidth = 1;
          ctx.strokeRect(x0 + 0.5, yy + 0.5, x1 - x0 - 1, L.eraRow - 1); ctx.setLineDash([]);
        } else if (absence) {
          ctx.fillStyle = this.hatch; ctx.fillRect(x0, yy, x1 - x0, L.eraRow);
          ctx.strokeStyle = T.s2; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, yy + 0.5, x1 - x0 - 1, L.eraRow - 1);
        } else {
          // MUTE: present but not the subject, as the films draw an era
          ctx.fillStyle = T.mute; ctx.fillRect(x0, yy, x1 - x0, L.eraRow);
          if (era.open) { // no established end: fade out, never a hard edge at the present
            const fx = Math.max(x0, L.W - 120);
            const grad = ctx.createLinearGradient(fx, 0, L.W, 0);
            grad.addColorStop(0, hexA(T.stone, 0)); grad.addColorStop(1, hexA(T.stone, 1));
            ctx.fillStyle = grad; ctx.fillRect(fx, yy - 1, L.W - fx, L.eraRow + 2);
          }
        }
        const text = era.label + (era.open ? '  (no established end)' : '') + (era.confidence !== 'verified' ? '  (boundary unverified)' : '');
        this.label(text, x0, era.open ? L.W - 120 : x1, yy + L.eraRow / 2, T.ink);
        this.hits.push({ kind: 'era', era, x0, x1, y0: yy, y1: yy + L.eraRow });
      }
      y += g.lanes * (L.eraRow + L.eraGap) - L.eraGap + L.groupGap;
    }
  }
  label(text, x0, x1, y, color) {
    const ctx = this.ctx, room = x1 - x0 - 8;
    if (room < 30) return;
    const shown = ctx.measureText(text).width <= room ? text : truncate(ctx, text, room);
    if (!shown) return;
    const w = ctx.measureText(shown).width;
    ctx.fillStyle = this.tokens.stone; ctx.globalAlpha = 0.78; ctx.fillRect(x0 + 3, y - 6, w + 4, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.fillText(shown, x0 + 5, y);
  }

  drawGutter(L) {
    const ctx = this.ctx, T = this.tokens;
    ctx.fillStyle = T.stone; ctx.fillRect(0, 0, L.G, L.H);
    ctx.strokeStyle = T.rule; ctx.beginPath(); ctx.moveTo(L.G + 0.5, L.axisH); ctx.lineTo(L.G + 0.5, L.H); ctx.stroke();
    ctx.font = `400 11px ${T.sans}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = T.ink2;
    L.eventRows.forEach((layer, i) => ctx.fillText(layer, L.G - 8, L.eventsTop + i * L.rowH + L.rowH / 2));
    ctx.fillText('alive, by year', L.G - 8, L.popTop + 16);
    ctx.fillStyle = T.ink3; ctx.font = `400 10px ${T.sans}`;
    ctx.fillText(`${this.D.popMax.toLocaleString()} at peak`, L.G - 8, L.popTop + 28);
    ctx.fillStyle = T.ink2; ctx.font = `400 11px ${T.sans}`;
    ctx.fillText(`${this.D.spans.length.toLocaleString()} lives`, L.G - 8, L.fieldTop + 8);
    ctx.fillStyle = T.ink3; ctx.font = `400 10px ${T.sans}`;
    ctx.fillText('eldest born', L.G - 8, L.fieldTop + 20);
    ctx.fillText('latest born', L.G - 8, L.fieldTop + L.fieldH - 6);
    ctx.fillStyle = T.ink2; ctx.font = `400 11px ${T.sans}`;
    ctx.fillText('one date only', L.G - 8, L.oneTop + L.oneH / 2 - 2);
    for (const g of L.eraGroups) {
      if (g.layer === 'absence') { ctx.fillText('not recorded', L.G - 8, L.erasTop + L.eraRow / 2); continue; }
      ctx.fillText(g.layer, L.G - 8, g.top + L.eraRow / 2);
    }
  }

  drawCursor(L) {
    const ctx = this.ctx, T = this.tokens, x = this.cursorX + 0.5;
    ctx.strokeStyle = T.now; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, L.axisH - 8); ctx.lineTo(x, L.H); ctx.stroke();
    ctx.fillStyle = T.now;
    ctx.beginPath(); ctx.moveTo(x - 5, L.axisH - 14); ctx.lineTo(x + 5, L.axisH - 14); ctx.lineTo(x, L.axisH - 7); ctx.closePath(); ctx.fill();
    ctx.font = `600 12px ${T.sans}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const t = fmtDay(this.day, { short: true });
    const w = ctx.measureText(t).width;
    ctx.fillStyle = T.stone; ctx.fillRect(x + 8, 4, w + 8, 16);
    ctx.fillStyle = T.now; ctx.fillText(t, x + 12, 12);
  }

  drawHover(L) {
    const h = this.hover; if (!h) return;
    const ctx = this.ctx, T = this.tokens;
    if (h.kind === 'person') {
      const s = h.span, y = L.fieldTop + (s.rank + 0.5) * L.laneH;
      const xa = Math.max(L.G, this.x(s.bLo)), xb = Math.min(L.W, this.x(s.dHi));
      ctx.strokeStyle = T.stone; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(Math.max(xb, xa + 2), y); ctx.stroke();
      ctx.strokeStyle = T.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(Math.max(xb, xa + 2), y); ctx.stroke();
      ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(this.x(s.bLo), y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    if (h.kind === 'one') {
      const it = h.it, M = this.D.oneDate.length, y = L.oneTop + 4 + (it.rank / Math.max(1, M - 1)) * (L.oneH - 8);
      ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x(it.lo), y, 5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ---- hit testing ----
  hitTest(x, y) {
    const L = this.layout();
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h;
    }
    if (x > L.G && y >= L.fieldTop && y <= L.fieldTop + L.fieldH) {
      const spans = this.D.spans, laneH = L.fieldH / spans.length;
      const r = (y - L.fieldTop) / laneH, day = this.dayAt(x);
      const tol = Math.max(2, Math.ceil(3 / laneH));
      let best = null, bestD = Infinity;
      for (let i = Math.max(0, Math.floor(r - tol)); i <= Math.min(spans.length - 1, Math.ceil(r + tol)); i++) {
        const s = spans[i];
        if (day < s.bLo - 2 / this.ppd || day > s.dHi + 2 / this.ppd) continue;
        const d = Math.abs(i + 0.5 - r);
        if (d < bestD) { bestD = d; best = s; }
      }
      if (best) return { kind: 'person', span: best };
    }
    return null;
  }

  // ---- interaction ----
  bindEvents() {
    const c = this.c;
    c.tabIndex = 0;
    let drag = null, pointers = new Map(), pinch = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ppd: this.ppd }; drag = null; return;
      }
      this.stopPlay(); this.anim = null;
      drag = { x: e.clientX, center: this.center, t: performance.now(), v: 0, moved: false };
      c.classList.add('dragging'); this.hideTip();
    });
    c.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.ppd = Math.min(this.maxPpd, Math.max(this.minPpd, pinch.ppd * d / pinch.d));
        this.requestDraw(); return;
      }
      if (drag) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 2) drag.moved = true;
        const now = performance.now(), prev = this.center;
        this.center = drag.center - dx / this.ppd;
        const dt = Math.max(1, now - drag.t); drag.v = (this.center - prev) / dt; drag.t = now;
        this.changed(); return;
      }
      const r = c.getBoundingClientRect();
      const hit = this.hitTest(e.clientX - r.left, e.clientY - r.top);
      const same = hit && this.hover && hit.kind === this.hover.kind && (hit.e === this.hover.e && hit.era === this.hover.era && hit.span === this.hover.span && hit.it === this.hover.it && hit.band === this.hover.band);
      if (!same) { this.hover = hit; this.requestDraw(); }
      if (hit) this.showTip(hit, e.clientX - r.left, e.clientY - r.top); else this.hideTip();
      c.style.cursor = hit ? 'pointer' : 'grab';
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!drag) return;
      c.classList.remove('dragging');
      const d = drag; drag = null;
      if (!d.moved) {
        const r = c.getBoundingClientRect();
        const hit = this.hitTest(e.clientX - r.left, e.clientY - r.top);
        if (hit) this.emit('pick', hit);
        else this.setDate(this.dayAt(e.clientX - r.left), true);
        return;
      }
      // inertia
      let v = d.v * 16;
      if (Math.abs(v) * this.ppd < 0.5) return;
      const glide = () => {
        if (drag || this.playing) return;
        v *= 0.92; this.center += v; this.changed();
        if (Math.abs(v) * this.ppd > 0.3) requestAnimationFrame(glide);
      };
      if (!reduceMotion()) requestAnimationFrame(glide);
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { if (!drag) { this.hover = null; this.hideTip(); this.requestDraw(); } });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { this.zoomBy(Math.exp(-e.deltaY * 0.0025)); return; }
      this.stopPlay(); this.anim = null;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const px = e.deltaMode === 1 ? delta * 16 : delta;
      this.center += px / this.ppd; this.changed();
    }, { passive: false });
    c.addEventListener('keydown', (e) => {
      const yr = YEAR, big = e.shiftKey, tiny = e.altKey;
      const amount = tiny ? 1 : big ? 10 * yr : yr;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-amount); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.step(amount); }
      else if (e.key === '+' || e.key === '=') { this.zoomBy(1.5); }
      else if (e.key === '-') { this.zoomBy(1 / 1.5); }
      else if (e.key === 'Home') { this.setDate(this.D.minDay); }
      else if (e.key === 'End') { this.setDate(this.D.maxDay); }
      else if (e.key === ' ') { e.preventDefault(); this.play(); }
    });
    c.addEventListener('dblclick', (e) => { const r = c.getBoundingClientRect(); this.center = this.dayAt(e.clientX - r.left); this.zoomBy(2); this.changed(); });
  }

  showTip(hit, x, y) {
    const t = this.tip, D = this.D;
    let html = '';
    if (hit.kind === 'event') {
      const e = hit.e;
      html = `<b>${esc(e.title)}</b>${fmtDate(e.date, e.precision)} <span class="muted">(${e.precision} precision, ${e.layer})</span>` +
        (e.confidence !== 'verified' ? ` <span class="conf-${e.confidence}">${e.confidence === 'disputed' ? 'date disputed' : 'date unverified'}</span>` : '') +
        (e.note ? `<div>${esc(clip(e.note, 220))}</div>` : '') + `<div class="src">Source: ${esc(e.source)}</div><div class="src">Click to pin</div>`;
    } else if (hit.kind === 'era') {
      const e = hit.era;
      html = `<b>${esc(e.label)}</b>${fmtDate(e.start, e.startP)} – ${e.open ? 'no established end' : fmtDate(e.end, e.endP)} <span class="muted">(${e.layer})</span>` +
        `<div>${esc(clip(e.basis, 240))}</div><div class="src">${D.absenceEraIds.has(e.id) ? 'A gap in the sources, not a gap in deaths. ' : ''}Source: ${esc(clip(e.source, 120))}</div>`;
    } else if (hit.kind === 'absence') {
      html = `<b>${esc(hit.band.label)}</b><div>${esc(hit.band.note)}</div><div class="src">An absence of record, not a count of zero.</div>`;
    } else if (hit.kind === 'person') {
      const p = hit.span.p;
      const st = statusWord(hit.span, this.center);
      html = `<b>${esc(p.name)}</b>${esc(lifeSpan(p))}<div class="src">${CEMETERY_NAME[p.cem]}${p.plot ? ', plot ' + esc(p.plot) : ''}${p.disp ? ' · date disputed' : ''}</div><div class="src">${st} · click to open</div>`;
    } else if (hit.kind === 'one') {
      const p = hit.it.p;
      html = `<b>${esc(p.name)}</b>${esc(lifeSpan(p))}<div class="src">${hit.it.kind === 'birth-only' ? 'No death year recorded: placed at birth only, not assumed living.' : 'No birth year recorded: placed at death only.'}</div><div class="src">${CEMETERY_NAME[p.cem]} · click to open</div>`;
    }
    t.innerHTML = html; t.hidden = false;
    const r = this.c.getBoundingClientRect();
    const tw = t.offsetWidth, th = t.offsetHeight;
    let left = x + 14, top = y + 14;
    if (left + tw > r.width - 8) left = x - tw - 14;
    if (top + th > r.height - 8) top = y - th - 10;
    t.style.left = `${Math.max(4, left)}px`; t.style.top = `${Math.max(4, top)}px`;
  }
  hideTip() { this.tip.hidden = true; }
}

function statusWord(s, c) {
  if (c < s.bLo || c > s.dHi) return c < s.bLo ? 'not yet born on the chosen date' : 'had died before the chosen date';
  if (c >= s.bHi && c <= s.dLo) return 'alive on the chosen date';
  return 'possibly alive on the chosen date (date known only to the year)';
}
function truncate(ctx, text, room) {
  let lo = 0, hi = text.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ctx.measureText(text.slice(0, mid) + '…').width <= room) lo = mid; else hi = mid - 1; }
  return lo > 6 ? text.slice(0, lo) + '…' : '';
}
function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hexA(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}
function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return { stone: v('--stone'), stone2: v('--stone-2'), paper: v('--paper'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), rule: v('--rule'), now: v('--now'), lv: v('--lv'), hm: v('--hm'), pv: v('--pv'), hatchInk: v('--hatch-ink'), s1: v('--s1'), s2: v('--s2'), s3: v('--s3'), mute: v('--mute'), sans: v('--sans') || 'Helvetica, Arial, sans-serif' };
}
function makeHatch(color) {
  const s = 8, cv = document.createElement('canvas'); cv.width = s; cv.height = s;
  const g = cv.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-2, s + 2); g.lineTo(s + 2, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(s - 2, s + 2); g.lineTo(s + 2, s - 2); g.stroke();
  return g.createPattern(cv, 'repeat');
}
