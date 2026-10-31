"""Check the 1870 Hamilton census candidates against the timeline records.

For each candidate (research/census_1870_hamilton_candidates.txt), compare the
census age with the age the record gives at the census day (1 June 1870), and
look for the record's spouse, parents and children in the same census
household. Writes research/census_1870_hamilton_checked.tsv. Reads data/ only.
"""
import csv, re, sys
from datetime import date

CENSUS_DAY = date(1870, 6, 1)
people = {r["person_id"]: r for r in csv.DictReader(open("data/timeline_people.csv", encoding="utf-8"))}
census = list(csv.DictReader(open("research/census_1870_hamilton.csv", encoding="utf-8")))
img = None
for r in census:
    img = r["image"] or img
    r["img"] = img

def age_at(p):
    bd, prec = p["birth_date"], p["birth_precision"]
    if prec == "day":
        y, m, d = map(int, bd.split("-"))
        b = date(y, m, d)
        return CENSUS_DAY.year - b.year - ((CENSUS_DAY.month, CENSUS_DAY.day) < (b.month, b.day)), "day"
    if p["birth_year"]:
        y = int(float(p["birth_year"]))
        return 1870 - y, "year"   # 1869-1870 years old on the day; the stone year may be one off
    return None, "none"

def tokens(name):
    return [t for t in re.split(r"[^a-z]+", name.lower()) if t]

def first(name):
    t = tokens(name)
    return t[0] if t else ""

ABBR = {"wm": "william", "robt": "robert", "jno": "john", "jas": "james", "thos": "thomas", "geo": "george", "chas": "charles"}

def same_first(a, b):
    a, b = ABBR.get(a, a), ABBR.get(b, b)
    return a == b or (len(a) >= 3 and len(b) >= 3 and (a.startswith(b) or b.startswith(a)))

out = []
for line in open("research/census_1870_hamilton_candidates.txt", encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    left, right = line.split(" => ")
    image, cname, cage, crace = left.split("|")
    ids = re.findall(r"\b(?:LV|HM|PV)\d{4}\b", right)
    row = next(r for r in census if r["img"] == image and r["name"] == cname)
    hh = [r for r in census if r["household_id"] == row["household_id"] and r is not row]
    for pid in ids:
        p = people[pid]
        exp, prec = age_at(p)
        cage_i = int(cage)
        if exp is None:
            agecheck = "no birth date"
        else:
            diff = cage_i - exp
            tol = 0 if prec == "day" else 1
            agecheck = f"record {exp} ({prec}), census {cage_i}, diff {diff:+d}" + ("" if abs(diff) <= tol else " MISMATCH")
        # relatives on the record, by name
        rels = []
        for kind in ("spouse", "parent", "child"):
            for nm in filter(None, (p[f"{kind}_names"] or "").split(";")):
                rels.append((kind, nm.strip()))
        found = []
        for kind, nm in rels:
            ft, st = first(nm), tokens(nm)
            for h in hh:
                ht = tokens(h["name"])
                if ht and same_first(ht[0], ft) and (ht[-1] in st):
                    found.append(f"{kind} {nm} = {h['name']} {h['age']}")
        relnote = "; ".join(found) if found else ("relatives on record not in household" if rels else "no relatives on record")
        out.append([image, row["household_id"], cname, cage, pid, p["name"], p["birth_date"], p["birth_precision"], agecheck, relnote,
                    "; ".join(f"{h['name']} {h['age']} {h['relation']}".strip() for h in hh)])

w = csv.writer(open("research/census_1870_hamilton_checked.tsv", "w", newline="", encoding="utf-8"), delimiter="\t")
w.writerow(["image", "household_id", "census_name", "census_age", "person_id", "record_name", "birth_date", "birth_precision", "age_check", "relatives_in_household", "household"])
w.writerows(out)
for o in out:
    print(" | ".join(o[2:10]))
