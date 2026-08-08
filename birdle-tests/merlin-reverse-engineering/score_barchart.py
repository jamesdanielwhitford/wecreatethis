#!/usr/bin/env python3
"""
Score the captured eBird barchart frequency data against the Merlin ground truth.

Confirms that Merlin's "Likely Birds" == eBird bar-chart frequency for the
region, sliced to the current week of the year.
"""
import json
import os
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
FREQ = json.load(open(os.path.join(HERE, "barchart-frequencies.json")))
EXPECTED = json.load(open(os.path.join(HERE, "merlin-expected.json")))["expectedOrder"]

# eBird's regional bar-chart taxonomy vs Merlin's display names. These are the
# same bird under different labels, not misses.
ALIASES = {
    "dark capped bulbul": "common bulbul",
    "hadeda ibis": "hadada ibis",
    "cape turtle ring necked dove": "ring necked dove",
    "cape glossy starling": "cape starling",
    "southern masked weaver": "southern masked weaver",
}


def norm(s):
    n = s.lower()
    for a, b in [("-", " "), ("'", ""), ("(", ""), (")", ""), (".", "")]:
        n = n.replace(a, b)
    n = n.replace("grey", "gray")
    n = " ".join(n.split())
    return ALIASES.get(n, n)


def week_index(d):
    """eBird bar charts use 4 buckets per month -> 48 per year.

    Buckets split the month at days 8, 15, 22 (the 4th bucket is longer).
    """
    if d.day <= 7:
        w = 0
    elif d.day <= 14:
        w = 1
    elif d.day <= 21:
        w = 2
    else:
        w = 3
    return (d.month - 1) * 4 + w


def kendall_tau(expected, got):
    pairs = []
    for i, e in enumerate(expected):
        if e in got:
            pairs.append((i, got.index(e)))
    c = d = 0
    for i in range(len(pairs)):
        for j in range(i + 1, len(pairs)):
            a = (pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1])
            if a > 0:
                c += 1
            elif a < 0:
                d += 1
    return (c - d) / (c + d) if (c + d) else 0.0


def rank(region, idx):
    rows = FREQ[region]["rows"]
    ranked = sorted(rows, key=lambda r: -r["values"][idx])
    return [(r["commonName"], r["values"][idx]) for r in ranked]


def main():
    today = date(2026, 7, 29)
    idx = week_index(today)
    exp_norm = [norm(e) for e in EXPECTED]

    print(f"Target date: {today}  ->  bar-chart bucket index {idx} "
          f"(month {today.month}, week {idx % 4 + 1} of 4)\n")

    for region in FREQ:
        ranked = rank(region, idx)
        got = [norm(n) for n, _ in ranked[:24]]
        hits = [e for e in exp_norm if e in got]
        tau = kendall_tau(exp_norm, got)

        print("=" * 76)
        print(f"{region}   recall {len(hits)}/24 = {len(hits)/24:.0%}   Kendall tau {tau:+.3f}")
        print("=" * 76)
        print(f"  {'#':>3}  {'MERLIN':<30} {'EBIRD FREQUENCY':<32} {'freq':>6}")
        for i in range(24):
            e = EXPECTED[i] if i < len(EXPECTED) else ""
            g, v = ranked[i] if i < len(ranked) else ("", 0)
            mark = " <-" if norm(e) == norm(g) else ""
            print(f"  {i+1:>3}. {e:<30} {g:<32} {v*100:>5.1f}%{mark}")
        miss = [EXPECTED[i] for i, e in enumerate(exp_norm) if e not in got]
        print(f"  genuinely missing: {', '.join(miss) if miss else 'none'}\n")


if __name__ == "__main__":
    main()
