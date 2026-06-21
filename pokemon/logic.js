/* ============================================================
   Shared battle-calculator logic (pure functions + data).
   Loaded by both index.html (the app) and tests.html (the suite),
   so the tests exercise the exact code the app runs.
   ============================================================ */

/* Type effectiveness chart (Gen 6+). CHART[attacker][defender] = multiplier.
   Any pair not listed defaults to 1x. */
const TYPES = ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];
const CHART = {
  normal:   { rock:0.5, ghost:0, steel:0.5 },
  fire:     { fire:0.5, water:0.5, grass:2, ice:2, bug:2, rock:0.5, dragon:0.5, steel:2 },
  water:    { fire:2, water:0.5, grass:0.5, ground:2, rock:2, dragon:0.5 },
  electric: { water:2, electric:0.5, grass:0.5, ground:0, flying:2, dragon:0.5 },
  grass:    { fire:0.5, water:2, grass:0.5, poison:0.5, ground:2, flying:0.5, bug:0.5, rock:2, dragon:0.5, steel:0.5 },
  ice:      { fire:0.5, water:0.5, grass:2, ice:0.5, ground:2, flying:2, dragon:2, steel:0.5 },
  fighting: { normal:2, ice:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, rock:2, ghost:0, dark:2, steel:2, fairy:0.5 },
  poison:   { grass:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0, fairy:2 },
  ground:   { fire:2, electric:2, grass:0.5, poison:2, flying:0, bug:0.5, rock:2, steel:2 },
  flying:   { electric:0.5, grass:2, fighting:2, bug:2, rock:0.5, steel:0.5 },
  psychic:  { fighting:2, poison:2, psychic:0.5, dark:0, steel:0.5 },
  bug:      { fire:0.5, grass:2, fighting:0.5, poison:0.5, flying:0.5, psychic:2, ghost:0.5, dark:2, steel:0.5, fairy:0.5 },
  rock:     { fire:2, ice:2, fighting:0.5, ground:0.5, flying:2, bug:2, steel:0.5 },
  ghost:    { normal:0, psychic:2, ghost:2, dark:0.5 },
  dragon:   { dragon:2, steel:0.5, fairy:0 },
  dark:     { fighting:0.5, psychic:2, ghost:2, dark:0.5, fairy:0.5 },
  steel:    { fire:0.5, water:0.5, electric:0.5, ice:2, rock:2, steel:0.5, fairy:2 },
  fairy:    { fire:0.5, fighting:2, poison:0.5, dragon:2, dark:2, steel:0.5 }
};
const TYPE_COLORS = {
  normal:"#9099a1", fire:"#ff6f52", water:"#4d90d5", electric:"#f3d23b", grass:"#63bd5b",
  ice:"#74cec0", fighting:"#ce4069", poison:"#ab6ac8", ground:"#d97746", flying:"#8fa8dd",
  psychic:"#f97176", bug:"#90c12c", rock:"#c7b78b", ghost:"#5269ac", dragon:"#0a6dc4",
  dark:"#5a5366", steel:"#5a8ea1", fairy:"#ec8fe6"
};

/* PokéAPI type ids — used to build the official type-symbol icon URLs. */
const TYPE_ID = {
  normal:1, fighting:2, flying:3, poison:4, ground:5, rock:6, bug:7, ghost:8, steel:9,
  fire:10, water:11, grass:12, electric:13, psychic:14, ice:15, dragon:16, dark:17, fairy:18
};

/* Multiplier of one attacking type onto a defender's (1- or 2-) type array. */
function typeMult(atkType, defTypes){
  let m = 1;
  for(const d of defTypes){
    const row = CHART[atkType];
    if(row && row[d] !== undefined) m *= row[d];
  }
  return m;
}

/* Best multiplier an attacker's STAB types can land on a defender (worst case for the defender). */
function bestStabMult(atkTypes, defTypes){
  let best = 0;
  for(const t of atkTypes){ best = Math.max(best, typeMult(t, defTypes)); }
  return best;
}

function classify(m){
  if(m === 0) return "immune";
  if(m > 1) return "weak";
  if(m < 1) return "resist";
  return "neutral";
}

function fmtMult(m){
  if(m === 0) return "0";
  if(m === 0.25) return "¼×";
  if(m === 0.5) return "½×";
  return m + "×";
}

/* ============================================================
   Counter scoring — "who should I send in against this Pokémon?"
   Blends type offense, type defense, speed and attacking power
   into a single comparable score. Weights are tunable below.
   ============================================================ */
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

/* Turn an effectiveness multiplier into a symmetric score around 0.
   0→-3 (can't touch / takes nothing), ¼→-2, ½→-1, 1→0, 2→+1, 4→+2 */
function multToScore(m){
  if(m === 0) return -3;
  return Math.log2(m);
}

function bestAtkStat(p){ return Math.max(p.stats.attack, p.stats["special-attack"]); }

const COUNTER_WEIGHTS = { type: 3, speed: 1.2, power: 1, bulk: 0.8 };

/* Score how good `mine` is as a switch-in against `opp`. Higher = better. */
function counterScore(mine, opp){
  const off = bestStabMult(mine.types, opp.types);   // I hit them
  const def = bestStabMult(opp.types, mine.types);   // they hit me
  const typeScore = multToScore(off) - multToScore(def);

  const speedDiff = mine.stats.speed - opp.stats.speed;
  const faster = speedDiff > 0, tie = speedDiff === 0;
  const speedScore = faster ? 1 : (tie ? 0 : -0.5);

  const atk = bestAtkStat(mine);
  const offPower = clamp((atk - 90) / 50, -1, 1.5);

  const bulk = clamp((mine.stats.hp + mine.stats.defense + mine.stats["special-defense"] - 180) / 250, -1, 1.5);

  const W = COUNTER_WEIGHTS;
  const score = W.type * typeScore + W.speed * speedScore + W.power * offPower + W.bulk * bulk;

  return { score, off, def, faster, tie, speedDiff, atk,
           parts: { typeScore, speedScore, offPower, bulk } };
}

/* Bucket a counter score into a human label + css class. */
function counterLabel(score){
  if(score >= 7)  return { text: "Excellent", cls: "excellent" };
  if(score >= 4)  return { text: "Strong",    cls: "strong" };
  if(score >= 1)  return { text: "Decent",    cls: "decent" };
  if(score >= -2) return { text: "Even",      cls: "even" };
  return { text: "Avoid", cls: "avoid" };
}

/* ============================================================
   Best-lineup prediction — pick the strongest sub-team of N.
   ============================================================ */

/* Average counter score of `mine` across a set of opponents. */
function avgCounterScore(mine, oppSet){
  if(oppSet.length === 0) return 0;
  let s = 0;
  for(const o of oppSet) s += counterScore(mine, o).score;
  return s / oppSet.length;
}

/* Rank `teamA` by how well each member does against the whole of `teamB`,
   return the top `n` as [{ mon, avg }] (descending). */
function rankAgainst(teamA, teamB, n){
  return teamA
    .map(mon => ({ mon, avg: avgCounterScore(mon, teamB) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, n);
}

/* Predict both lineups of size `n`:
   - opponent picks the n that are best vs your FULL team
   - you pick the n that are best vs the opponent's predicted lineup */
function bestLineups(myTeam, oppTeam, n){
  const oppLikely = rankAgainst(oppTeam, myTeam, n);
  const oppLikelyMons = oppLikely.map(x => x.mon);
  const myBest = rankAgainst(myTeam, oppLikelyMons, n);
  const myBestMons = myBest.map(x => x.mon);

  // overall edge of your chosen lineup vs their predicted lineup
  let edge = 0;
  for(const m of myBestMons) edge += avgCounterScore(m, oppLikelyMons);
  edge = myBestMons.length ? edge / myBestMons.length : 0;

  return { oppLikely, myBest, oppLikelyMons, myBestMons, edge };
}

/* Paired lineups: order the opponent's N picks strongest-first (by threat to your
   full team), then greedily assign your single best remaining counter to each.
   Returns { pairs: [{ opp, mine, detail, score }], edge }. No Pokémon is reused. */
function pairedLineups(myTeam, oppTeam, n){
  const oppOrder = rankAgainst(oppTeam, myTeam, n).map(x => x.mon);
  const available = [...myTeam];
  const pairs = [];
  let total = 0, counted = 0;
  for(const opp of oppOrder){
    let bestIdx = -1, bestScore = -Infinity, bestDetail = null;
    for(let i = 0; i < available.length; i++){
      const d = counterScore(available[i], opp);
      if(d.score > bestScore){ bestScore = d.score; bestIdx = i; bestDetail = d; }
    }
    const mine = bestIdx >= 0 ? available.splice(bestIdx, 1)[0] : null;
    if(mine){ total += bestScore; counted++; }
    pairs.push({ opp, mine, detail: mine ? bestDetail : null, score: mine ? bestScore : null });
  }
  return { pairs, edge: counted ? total / counted : 0 };
}

/* Doubles "perfect matchup": pick the best DISTINCT pair from `myTeam` to send
   against a threat duo (threatA, threatB). For each candidate pair we try both
   assignments (who answers which threat) and keep the better one, so the result
   maximizes combined coverage — which may differ from simply taking the two
   Pokémon that are individually best against each threat.
   Returns { score, assign: [{ mine, opp, detail }, ...] } or null if <2 mons. */
function bestDuoVsPair(myTeam, threatA, threatB){
  if(myTeam.length < 2) return null;
  let best = null;
  for(let i = 0; i < myTeam.length; i++){
    for(let j = i + 1; j < myTeam.length; j++){
      const a = myTeam[i], b = myTeam[j];
      const aA = counterScore(a, threatA), aB = counterScore(a, threatB);
      const bA = counterScore(b, threatA), bB = counterScore(b, threatB);
      const s1 = aA.score + bB.score;   // a vs A, b vs B
      const s2 = aB.score + bA.score;   // a vs B, b vs A
      const score = Math.max(s1, s2);
      const assign = s1 >= s2
        ? [{ mine: a, opp: threatA, detail: aA }, { mine: b, opp: threatB, detail: bB }]
        : [{ mine: a, opp: threatB, detail: aB }, { mine: b, opp: threatA, detail: bA }];
      if(!best || score > best.score) best = { score, assign };
    }
  }
  return best;
}

/* Export for Node-based test runners while staying a plain global script in the browser. */
if(typeof module !== "undefined" && module.exports){
  module.exports = {
    TYPES, CHART, TYPE_COLORS, TYPE_ID, typeMult, bestStabMult, classify, fmtMult,
    clamp, multToScore, bestAtkStat, counterScore, counterLabel, COUNTER_WEIGHTS,
    avgCounterScore, rankAgainst, bestLineups, pairedLineups, bestDuoVsPair
  };
}
