// Visit counts, for the project's owner. GitHub Pages keeps none, so each
// view is reported to GoatCounter (goatcounter.com): no cookies, nothing
// stored in the browser, no personal data kept.
//
// What is sent: which of the five pages was opened, and which person's card.
// What is never sent: anything typed in a search or filter box, the date the
// timeline is stopped on, or the entry looked up among the unrecorded.
//
// SITE is the GoatCounter site code, the "hamilton" of
// hamilton.goatcounter.com. While it is empty nothing loads and nothing is
// sent. GoatCounter's own script also sends nothing from localhost, so
// `npm start` never counts.
const SITE = '';

export const COUNTING = /^[a-z0-9-]+$/.test(SITE);

let ready = false;
const waiting = [];
const send = (v) => { try { window.goatcounter.count(v); } catch { /* a blocked counter must never break the page */ } };

if (COUNTING) {
  window.goatcounter = { no_onload: true, no_events: true };   // the app names every view itself
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${SITE}.goatcounter.com/count`;
  s.onload = () => { ready = true; waiting.splice(0).forEach(send); };
  document.head.append(s);
}

/** Count one view. `path` is a name the app chooses, never the address bar. */
export function countView(path, title) {
  if (!COUNTING) return;
  const v = { path, title };
  ready ? send(v) : waiting.push(v);
}
