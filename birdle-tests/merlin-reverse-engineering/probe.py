#!/usr/bin/env python3
"""
Reverse-engineer Merlin's "Likely Birds" ordering using only the public eBird API.

Scores several candidate strategies against the hand-captured Merlin list in
merlin-expected.json. The key question: which combination of endpoint, radius,
and ranking metric reproduces Merlin's order?

Usage: python3 probe.py
"""
import json
import os
import time
import urllib.parse
import urllib.request
from collections import defaultdict

API_KEY = "rut6699v8fce"
BASE = "https://api.ebird.org/v2"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, ".cache")

with open(os.path.join(HERE, "merlin-expected.json")) as f:
    EXPECTED_DOC = json.load(f)

LAT = EXPECTED_DOC["location"]["lat"]
LNG = EXPECTED_DOC["location"]["lng"]
EXPECTED = EXPECTED_DOC["expectedOrder"]


def norm(name):
    """Normalize a common name for comparison across eBird/Merlin spelling drift."""
    n = name.lower().strip()
    for a, b in [("-", " "), ("'", ""), ("grey", "gray"), (".", "")]:
        n = n.replace(a, b)
    return " ".join(n.split())


EXPECTED_NORM = [norm(n) for n in EXPECTED]


def get(path, params=None, ttl=3600):
    """GET with on-disk caching so repeated runs don't hammer the API."""
    url = f"{BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = urllib.parse.quote(url, safe="")[:200] + ".json"
    cache_path = os.path.join(CACHE_DIR, key)
    if os.path.exists(cache_path) and time.time() - os.path.getmtime(cache_path) < ttl:
        with open(cache_path) as f:
            return json.load(f)
    req = urllib.request.Request(url, headers={"x-ebirdapitoken": API_KEY})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())
    with open(cache_path, "w") as f:
        json.dump(data, f)
    return data


# ---------- Ranking strategies ----------

def rank_by_observation_count(obs):
    """Current bird-bingo method: count raw observation records per species."""
    counts = defaultdict(int)
    names = {}
    for o in obs:
        counts[o["speciesCode"]] += 1
        names[o["speciesCode"]] = o["comName"]
    return [(names[c], n) for c, n in sorted(counts.items(), key=lambda kv: -kv[1])]


def rank_by_checklist_frequency(obs):
    """Count DISTINCT checklists (subId) per species - closer to eBird 'frequency'.

    This is the important distinction: one birder logging a species 5 times in a
    day should not outrank a species seen once each by 5 different birders.
    """
    subs = defaultdict(set)
    names = {}
    for o in obs:
        subs[o["speciesCode"]].add(o.get("subId"))
        names[o["speciesCode"]] = o["comName"]
    return [(names[c], len(s)) for c, s in sorted(subs.items(), key=lambda kv: -len(kv[1]))]


def rank_by_locality_spread(obs):
    """Count distinct locations reporting the species - favours widespread birds."""
    locs = defaultdict(set)
    names = {}
    for o in obs:
        locs[o["speciesCode"]].add(o.get("locId"))
        names[o["speciesCode"]] = o["comName"]
    return [(names[c], len(s)) for c, s in sorted(locs.items(), key=lambda kv: -len(kv[1]))]


# ---------- Scoring ----------

def score(ranked, label, top_n=24):
    """Compare a ranked list against the Merlin ground truth."""
    got = [norm(n) for n, _ in ranked[:top_n]]
    got_set = set(got)
    overlap = [n for n in EXPECTED_NORM if n in got_set]
    recall = len(overlap) / len(EXPECTED_NORM)

    # Rank correlation over the species both lists contain.
    pairs = []
    for i, n in enumerate(EXPECTED_NORM):
        if n in got:
            pairs.append((i, got.index(n)))
    if len(pairs) > 1:
        concordant = discordant = 0
        for i in range(len(pairs)):
            for j in range(i + 1, len(pairs)):
                a = (pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1])
                if a > 0:
                    concordant += 1
                elif a < 0:
                    discordant += 1
        tau = (concordant - discordant) / (concordant + discordant) if (concordant + discordant) else 0.0
    else:
        tau = 0.0

    top10_hits = len([n for n in EXPECTED_NORM[:10] if n in set(got[:10])])

    print(f"\n{'=' * 78}\n{label}\n{'=' * 78}")
    print(f"  recall@{top_n}: {len(overlap)}/{len(EXPECTED_NORM)} = {recall:.0%}"
          f"   |   top-10 overlap: {top10_hits}/10   |   Kendall tau: {tau:+.3f}")
    print(f"  {'#':>3}  {'MERLIN EXPECTED':<32} {'THIS STRATEGY':<32} {'metric'}")
    for i in range(top_n):
        exp = EXPECTED[i] if i < len(EXPECTED) else ""
        if i < len(ranked):
            got_name, metric = ranked[i]
        else:
            got_name, metric = "", ""
        mark = "OK " if i < len(EXPECTED) and i < len(ranked) and norm(exp) == norm(got_name) else "   "
        print(f"  {i + 1:>3}. {exp:<32} {got_name:<32} {metric}  {mark}")

    missing = [EXPECTED[i] for i, n in enumerate(EXPECTED_NORM) if n not in got_set]
    if missing:
        print(f"  MISSING from this strategy's top {top_n}: {', '.join(missing)}")
    return {"label": label, "recall": recall, "tau": tau, "top10": top10_hits}


def main():
    results = []

    # Strategy family A: nearby observations at varying radii, three ranking metrics.
    for dist in [8, 15, 25, 50]:
        obs = get("data/obs/geo/recent", {"lat": LAT, "lng": LNG, "dist": dist, "back": 30})
        print(f"\n\n### radius {dist}km: {len(obs)} observation records")
        results.append(score(rank_by_observation_count(obs),
                             f"A1. geo/recent dist={dist}km back=30 - ranked by RAW OBS COUNT (current bird-bingo method)"))
        results.append(score(rank_by_checklist_frequency(obs),
                             f"A2. geo/recent dist={dist}km back=30 - ranked by DISTINCT CHECKLISTS"))
        results.append(score(rank_by_locality_spread(obs),
                             f"A3. geo/recent dist={dist}km back=30 - ranked by DISTINCT LOCATIONS"))

    # Strategy family B: same but a full year of data, to approximate "time of year"
    # behaviour rather than just the last 30 days.
    obs_year = get("data/obs/geo/recent", {"lat": LAT, "lng": LNG, "dist": 25, "back": 30})
    results.append(score(rank_by_checklist_frequency(obs_year),
                         "B1. geo/recent dist=25km back=30 - DISTINCT CHECKLISTS (max back allowed)"))

    # Strategy family C: region-level recent observations for City of Tshwane.
    obs_region = get("data/obs/ZA-GT-08/recent", {"back": 30})
    print(f"\n\n### region ZA-GT-08 (City of Tshwane): {len(obs_region)} records")
    results.append(score(rank_by_checklist_frequency(obs_region),
                         "C1. region ZA-GT-08 recent - DISTINCT CHECKLISTS"))
    results.append(score(rank_by_observation_count(obs_region),
                         "C2. region ZA-GT-08 recent - RAW OBS COUNT"))

    print(f"\n\n{'#' * 78}\n# LEADERBOARD (higher is better on all three)\n{'#' * 78}")
    print(f"  {'recall':>7} {'top10':>6} {'tau':>7}   strategy")
    for r in sorted(results, key=lambda r: (-r["recall"], -r["top10"], -r["tau"])):
        print(f"  {r['recall']:>6.0%} {r['top10']:>5}/10 {r['tau']:>+7.3f}   {r['label']}")


if __name__ == "__main__":
    main()
