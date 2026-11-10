// The "Jump to…" menu: notable dates, every one taken from the data. Each
// entry finds its date by a row's title or plot, so a row reworded in data/
// would lose its jump. Such an entry comes back with day = null: the app
// leaves it out of the menu, and test/acceptance.test.mjs fails, so it is
// noticed rather than silently missing.
import { dayOf, fromIso, interval } from './derive.js';

/** @param D needs population ([year, count][]), events (context_events rows) and family.lossesCemetery */
export function buildJumps(D) {
  const eventDay = (re) => {
    const e = D.events.find(x => x.dated && re.test(x.title));
    const iv = e ? interval(e.date, e.precision) : null;
    return iv ? iv.lo : null;
  };
  const peak = D.population.reduce((a, b) => (b[1] > a[1] ? b : a));
  const loves = D.family.lossesCemetery.find(c => c.plot === 'N-23');
  return [
    { label: `${peak[0]}, the peak`, day: dayOf(peak[0], 7, 1) },
    { label: 'The Burning Raid', day: eventDay(/Burning Raid begins/) },
    { label: '1 January 1866', day: dayOf(1866, 1, 1) },
    { label: 'Koch, 1882', day: eventDay(/Koch identifies the tubercle bacillus/) },   // not "Koch": his anthrax (1876) and cholera (1883) rows match that too
    { label: 'Influenza, 1918', day: eventDay(/Influenza pandemic peaks/) },
    { label: 'Pleasant Valley opens', day: eventDay(/Pleasant Valley Cemetery established/) },
    { label: 'The Loves, 1943', day: loves ? fromIso(loves.first_death) : null },
  ];
}
