"""People in these cemeteries old enough to hold property on a census day.

    python research/list_1860_adults.py          # 1860 (the default)
    python research/list_1860_adults.py 1850

Writes research/slave_schedule_<year>_todo.tsv: one row per person (owner-
confirmed duplicates once), alive on 1 Jun of that year by timeline_usable =
yes and aged 18 or more, with the surnames grouped so each surname is looked
up once in that year's slave schedule index. Precision is kept: a year-only
birth gives an age range, not an age. For 1860, those already read on the
Hamilton pages are marked done; for other years, the 1860 finding (if any) is
noted, for reference only.
"""
import csv
import sys
from pathlib import Path

YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else 1860
ROOT = Path(__file__).resolve().parent.parent
people = list(csv.DictReader(open(ROOT / 'data/timeline_people.csv', encoding='utf-8')))
drop = {r['b_id'] if r['keep'] == r['a_id'] else r['a_id']
        for r in csv.DictReader(open(ROOT / 'curation/duplicates.csv', encoding='utf-8'))
        if r['verdict'] == 'same person'}
if YEAR == 1860:
    status = {r['person_id']: 'done' for r in csv.DictReader(open(ROOT / 'research/slave_schedule_1860_hamilton.csv', encoding='utf-8'))}
else:
    status = {r['person_id']: f"1860 {r['role']}" for r in csv.DictReader(open(ROOT / 'curation/slave_schedule_1860_links.csv', encoding='utf-8'))}

def alive(p):
    if p['timeline_usable'] != 'yes':
        return False
    by, dy = int(p['birth_year']), int(p['death_year'])
    if by > YEAR - 18 or dy < YEAR:
        return False
    if dy == YEAR and p['death_precision'] in ('day', 'month') and p['death_date'][5:7] < '06':
        return False
    return True

rows = []
for p in people:
    if p['person_id'] in drop or not alive(p):
        continue
    by = int(p['birth_year'])
    if p['birth_precision'] in ('day', 'month'):
        m, d = int(p['birth_date'][5:7]), int(p['birth_date'][8:10] or 1)
        age = str(YEAR - by - (1 if (m, d) > (6, 1) else 0))
    else:
        age = f'{YEAR - 1 - by}-{YEAR - by}'
    if int(age.split('-')[-1]) < 18:
        continue
    rows.append([p['surname'], p['person_id'], p['name'], age, p['death_year'],
                 p['spouse_names'], status.get(p['person_id'], '')])
rows.sort()
with open(ROOT / f'research/slave_schedule_{YEAR}_todo.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t')
    w.writerow(['surname', 'person_id', 'name', f'age_{YEAR}', 'death_year', 'spouse', 'status'])
    w.writerows(rows)
print(len(rows), 'people,', len({r[0].lower() for r in rows}), 'surnames')
