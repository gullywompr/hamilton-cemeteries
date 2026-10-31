"""Match the death-certificate index against the timeline; list the unmatched.

Reads research/fs_va_death_certificates_hamilton_index.psv and
data/timeline_people.csv. A certificate matches when a person has the same
surname and the exact death date; 'near' is same surname and death year.
Prints the unmatched certificates for a given race (default Black), oldest
first, as ark|name|death|age.
"""
import csv, re, sys, collections

race = sys.argv[1] if len(sys.argv) > 1 else 'Black'
rows = [l.rstrip('\n').split('|') for l in open('research/fs_va_death_certificates_hamilton_index.psv', encoding='utf-8') if not l.startswith('#')]
head, rows = rows[0], [dict(zip(rows[0], r)) for r in rows[1:]]
seen, certs = set(), []
for r in rows:
    k = (r['name'].lower(), r['death'])
    if r['other_place'] or k in seen:
        continue
    seen.add(k)
    certs.append(r)
people = list(csv.DictReader(open('data/timeline_people.csv', encoding='utf-8')))
by_date = collections.defaultdict(list)
for p in people:
    by_date[p['death_date']].append(p)
surname = lambda n: re.sub(r',? (Sr|Jr)\.?$', '', n.strip()).split()[-1].upper()
for r in sorted(certs, key=lambda r: r['death']):
    s = surname(r['name'])
    if any(p['surname'].upper() == s or s in p['name'].upper() for p in by_date.get(r['death'], [])):
        continue
    if any(p['death_year'] == r['death'][:4] and p['surname'].upper() == s for p in people):
        continue
    if r['race'] == race:
        print('|'.join([r['ark'], r['name'], r['death'], r['age']]))
