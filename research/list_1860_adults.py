"""People in these cemeteries old enough to hold property on census day 1860.

Writes research/slave_schedule_1860_todo.tsv: one row per person (owner-
confirmed duplicates once), alive on 1 Jun 1860 by timeline_usable = yes and
aged 18 or more, with the surnames grouped so each surname is looked up once
in the 1860 slave schedule index. Precision is kept: a year-only birth gives
an age range, not an age.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
people = list(csv.DictReader(open(ROOT / 'data/timeline_people.csv', encoding='utf-8')))
drop = {r['b_id'] if r['keep'] == r['a_id'] else r['a_id']
        for r in csv.DictReader(open(ROOT / 'curation/duplicates.csv', encoding='utf-8'))
        if r['verdict'] == 'same person'}
done = {r['person_id'] for r in csv.DictReader(open(ROOT / 'research/slave_schedule_1860_hamilton.csv', encoding='utf-8'))}

def alive(p):
    if p['timeline_usable'] != 'yes':
        return False
    by, dy = int(p['birth_year']), int(p['death_year'])
    if by > 1842 or dy < 1860:
        return False
    if dy == 1860 and p['death_precision'] in ('day', 'month') and p['death_date'][5:7] < '06':
        return False
    return True

rows = []
for p in people:
    if p['person_id'] in drop or not alive(p):
        continue
    by = int(p['birth_year'])
    if p['birth_precision'] in ('day', 'month'):
        m, d = int(p['birth_date'][5:7]), int(p['birth_date'][8:10] or 1)
        age = str(1860 - by - (1 if (m, d) > (6, 1) else 0))
    else:
        age = f'{1859 - by}-{1860 - by}'
    if int(age.split('-')[-1]) < 18:
        continue
    rows.append([p['surname'], p['person_id'], p['name'], age, p['death_year'],
                 p['spouse_names'], 'done' if p['person_id'] in done else ''])
rows.sort()
with open(ROOT / 'research/slave_schedule_1860_todo.tsv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, delimiter='\t')
    w.writerow(['surname', 'person_id', 'name', 'age_1860', 'death_year', 'spouse', 'status'])
    w.writerows(rows)
print(len(rows), 'people,', len({r[0].lower() for r in rows}), 'surnames')
