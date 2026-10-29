#!/usr/bin/env python3
"""
Longevity gap between burial grounds — the analysis behind APP_SPEC §11.

Measure: median age at death among people who reached 20, by decade of death,
per cemetery. Adults only, so that differing child-burial practice between the
grounds cannot drive the result.

This is NOT life expectancy at birth. It is the median age at death of adults
buried with a dated stone. Say so wherever the number appears.

Run:  python3 scripts/longevity_gap.py
"""
import csv, collections, json, sys
import numpy as np
from scipy import stats

SRC = 'data/timeline_people.csv'

def I(x):
    try: return int(float(x))
    except: return None

def load():
    P = list(csv.DictReader(open(SRC)))
    return [r for r in P
            if r['timeline_usable'] == 'yes'
            and I(r['death_year']) is not None
            and I(r['age_at_death']) is not None]

def adults(U, cem, lo, hi, day_only=False):
    return np.array([I(r['age_at_death']) for r in U
                     if r['cemetery'] == cem
                     and lo <= I(r['death_year']) <= hi
                     and I(r['age_at_death']) >= 20
                     and (not day_only or r['death_precision'] == 'day')])

def main():
    U = load()
    rng = np.random.default_rng(7)
    out = {'measure': 'median age at death, adults who reached 20',
           'not': 'life expectancy at birth', 'eras': [], 'decades': []}

    for lo, hi in [(1920,1949),(1950,1999),(2000,2026)]:
        a, b = adults(U,'Lakeview',lo,hi), adults(U,'Pleasant Valley',lo,hi)
        if len(b) < 15: continue
        u = stats.mannwhitneyu(a, b, alternative='greater')
        boot = [np.median(rng.choice(a,len(a))) - np.median(rng.choice(b,len(b)))
                for _ in range(4000)]
        ci = np.percentile(boot, [2.5, 97.5])
        out['eras'].append({'era': f'{lo}-{hi}',
            'lakeview_n': int(len(a)), 'lakeview_median': float(np.median(a)),
            'pv_n': int(len(b)), 'pv_median': float(np.median(b)),
            'gap': float(np.median(a)-np.median(b)),
            'ci95': [round(float(ci[0]),1), round(float(ci[1]),1)],
            'p': float(u.pvalue),
            'significant_at_05': bool(u.pvalue < 0.05)})

    for d in range(1920, 2030, 10):
        a, b = adults(U,'Lakeview',d,d+9), adults(U,'Pleasant Valley',d,d+9)
        if len(b) < 8: continue
        out['decades'].append({'decade': f'{d}s',
            'lakeview_n': int(len(a)), 'lakeview_median': float(np.median(a)),
            'pv_n': int(len(b)), 'pv_median': float(np.median(b)),
            'gap': float(np.median(a)-np.median(b))})

    # robustness: same comparison on day-precision records only
    out['robustness_day_precision_only'] = []
    for lo, hi in [(1920,1949),(1950,1999),(2000,2026)]:
        a, b = adults(U,'Lakeview',lo,hi,True), adults(U,'Pleasant Valley',lo,hi,True)
        if len(b) < 12: continue
        out['robustness_day_precision_only'].append(
            {'era': f'{lo}-{hi}', 'lakeview_n': int(len(a)), 'pv_n': int(len(b)),
             'gap': float(np.median(a)-np.median(b))})

    # robustness: usable-age coverage per ground (selection check)
    P = list(csv.DictReader(open(SRC)))
    cov = {}
    for cem in ('Lakeview','Harmony','Pleasant Valley'):
        sub = [r for r in P if r['cemetery'] == cem]
        ok = [r for r in sub if r['timeline_usable']=='yes' and I(r['age_at_death']) is not None]
        cov[cem] = {'n': len(sub), 'usable': len(ok), 'pct': round(100*len(ok)/len(sub),1)}
    out['robustness_coverage'] = cov

    json.dump(out, open('data/longevity_gap.json','w'), indent=1)
    for e in out['eras']:
        print(f"{e['era']}  LV n={e['lakeview_n']:4} med {e['lakeview_median']:.0f} | "
              f"PV n={e['pv_n']:3} med {e['pv_median']:.0f} | gap {e['gap']:4.1f} "
              f"CI{e['ci95']} p={e['p']:.2g}")
    print('\nby decade:')
    for d in out['decades']:
        print(f"  {d['decade']}  gap {d['gap']:4.0f}  (LV n={d['lakeview_n']}, PV n={d['pv_n']})")
    print('\nwrote data/longevity_gap.json')

if __name__ == '__main__':
    main()
