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

/* ============================================================
   Type-ranking analysis — "which typings are best on defense /
   offense?" Pure type-chart math, no Pokémon or API needed.
   ============================================================ */

/* Every distinct typing: 18 single + 153 dual = 171 type combinations. */
function allTypings(){
  const out = [];
  for(let i = 0; i < TYPES.length; i++){
    out.push([TYPES[i]]);
    for(let j = i + 1; j < TYPES.length; j++) out.push([TYPES[i], TYPES[j]]);
  }
  return out;
}

/* Defensive profile of a typing across all 18 attacking types.
   score sums -multToScore(mult): immunity +3, ¼× +2, ½× +1, neutral 0,
   2× -1, 4× -2. Higher = tougher to hit. */
function defensiveProfile(defTypes){
  let immune = 0, resist = 0, neutral = 0, weak = 0, score = 0;
  for(const atk of TYPES){
    const m = typeMult(atk, defTypes);
    score += -multToScore(m);
    if(m === 0) immune++;
    else if(m < 1) resist++;
    else if(m > 1) weak++;
    else neutral++;
  }
  return { types: defTypes, immune, resist, neutral, weak, score };
}

/* Offensive profile of a typing: its best STAB hit on each of the 18 types.
   score sums multToScore(bestMult): 4× +2, 2× +1, neutral 0, ½× -1, ¼× -2,
   immune -3. Higher = better super-effective coverage. */
function offensiveProfile(atkTypes){
  let superEff = 0, neutral = 0, notVery = 0, noEffect = 0, score = 0;
  for(const def of TYPES){
    const m = bestStabMult(atkTypes, [def]);
    score += multToScore(m);
    if(m === 0) noEffect++;
    else if(m > 1) superEff++;
    else if(m < 1) notVery++;
    else neutral++;
  }
  return { types: atkTypes, superEff, neutral, notVery, noEffect, score };
}

/* Rank every typing by defense, by offense, and by their raw-sum combined.
   Each list is sorted best-first; entries carry both sub-profiles. */
function rankTypings(){
  const combined = allTypings().map(t => {
    const def = defensiveProfile(t), off = offensiveProfile(t);
    return { types: t, def, off, defScore: def.score, offScore: off.score,
             score: def.score + off.score };
  });
  return {
    defense:  combined.slice().sort((a, b) => b.defScore - a.defScore),
    offense:  combined.slice().sort((a, b) => b.offScore - a.offScore),
    combined: combined.slice().sort((a, b) => b.score - a.score)
  };
}

/* Combined ranking with a selectable weighting, sorted best-first. Defense and
   offense scores live on different scales (def tops out higher than off), so
   "even" and "balanced" min-max normalize each dimension to 0..1 first:
     - "even"     → (defN + offN)·50   : honest 50/50; strength in either helps.
     - "balanced" → √(defN·offN)·100   : rewards typings good at BOTH; a typing
                    weak in one dimension is dragged down (one-trick typings sink).
     - "sum"      → defScore + offScore : the raw, defense-leaning total.
   Each entry gets `combinedScore` (the value sorted on) alongside the raw scores. */
function combineTypings(mode = "even"){
  const list = allTypings().map(t => {
    const def = defensiveProfile(t), off = offensiveProfile(t);
    return { types: t, def, off, defScore: def.score, offScore: off.score };
  });
  const defs = list.map(x => x.defScore), offs = list.map(x => x.offScore);
  const dMin = Math.min(...defs), dMax = Math.max(...defs);
  const oMin = Math.min(...offs), oMax = Math.max(...offs);
  const nd = x => dMax === dMin ? 0 : (x.defScore - dMin) / (dMax - dMin);
  const no = x => oMax === oMin ? 0 : (x.offScore - oMin) / (oMax - oMin);
  for(const x of list){
    const d = nd(x), o = no(x);
    x.combinedScore = mode === "sum"      ? x.defScore + x.offScore
                    : mode === "balanced" ? Math.sqrt(d * o) * 100
                    :                       (d + o) * 50;
  }
  return list.sort((a, b) => b.combinedScore - a.combinedScore);
}

/* ============================================================
   Team building — best team of 6 real Pokémon by typing spread
   AND base stats. Pokémon shape matches the app:
   { name, id, types:[...], stats:{hp,attack,defense,
     'special-attack','special-defense',speed} }
   ============================================================ */

function bst(p){
  const s = p.stats;
  return s.hp + s.attack + s.defense + s["special-attack"] + s["special-defense"] + s.speed;
}
function monId(p){ return p.id != null ? p.id : p.name; }

/* Legendary + mythical species (Gen 1–9), by PokéAPI species slug. Matches the
   `is_legendary || is_mythical` flag without needing the species endpoint, so
   the team builder can drop them with no extra API calls. (Ultra Beasts and
   Paradox Pokémon are intentionally NOT here — PokéAPI doesn't flag them legendary.) */
const LEGENDARY = new Set([
  "articuno","zapdos","moltres","mewtwo","mew",
  "raikou","entei","suicune","lugia","ho-oh","celebi",
  "regirock","regice","registeel","latias","latios","kyogre","groudon","rayquaza","jirachi","deoxys",
  "uxie","mesprit","azelf","dialga","palkia","heatran","regigigas","giratina","cresselia",
  "phione","manaphy","darkrai","shaymin","arceus",
  "victini","cobalion","terrakion","virizion","tornadus","thundurus","reshiram","zekrom",
  "landorus","kyurem","keldeo","meloetta","genesect",
  "xerneas","yveltal","zygarde","diancie","hoopa","volcanion",
  "tapu-koko","tapu-lele","tapu-bulu","tapu-fini","cosmog","cosmoem","solgaleo","lunala",
  "necrozma","magearna","marshadow","zeraora","meltan","melmetal",
  "zacian","zamazenta","eternatus","kubfu","urshifu","regieleki","regidrago","glastrier",
  "spectrier","calyrex","zarude","enamorus",
  "wo-chien","chien-pao","ting-lu","chi-yu","koraidon","miraidon",
  "okidogi","munkidori","fezandipiti","ogerpon","terapagos","pecharunt"
]);

/* True if a Pokémon is a legendary/mythical. Handles alternate-form slugs
   (e.g. "giratina-altered", "kyurem-black") by checking the species prefix;
   hyphenated base names (ho-oh, tapu-koko, wo-chien…) match exactly. */
function isLegendary(p){
  const n = (p.name || "").toLowerCase();
  return LEGENDARY.has(n) || LEGENDARY.has(n.split("-")[0]);
}

/* Defensive coverage of a whole team: for each attacking type, does ANY member
   resist/avoid it, and how many members are weak (shared weakness)?
   score rewards resisted types and penalizes shared weaknesses. */
function teamDefenseProfile(team){
  let resisted = 0, score = 0;
  const uncovered = [];
  for(const atk of TYPES){
    let best = Infinity, weakMembers = 0;
    for(const p of team){
      const m = typeMult(atk, p.types);
      best = Math.min(best, m);
      if(m > 1) weakMembers++;
    }
    if(best < 1){ resisted++; score += 1; }
    else { uncovered.push(atk); score -= 1; }
    score -= 0.25 * weakMembers;
  }
  return { resisted, uncovered, score };
}

/* Offensive coverage: for each type, can any member hit it super-effectively
   with STAB? */
function teamOffenseProfile(team){
  let covered = 0;
  const uncovered = [];
  for(const def of TYPES){
    let best = 0;
    for(const p of team) best = Math.max(best, bestStabMult(p.types, [def]));
    if(best >= 2) covered++;
    else uncovered.push(def);
  }
  return { covered, uncovered, score: covered };
}

/* Tunable blend of defensive coverage, offensive coverage and raw base stats.
   The optimizer maximizes this, so whatever mix (all-out offense, defensive
   wall, or balance) scores highest is what wins. */
const TEAM_WEIGHTS = { defense: 6, offense: 5, stats: 3 };

function teamScore(team){
  const def = teamDefenseProfile(team);
  const off = teamOffenseProfile(team);
  const avgBst = team.reduce((s, p) => s + bst(p), 0) / team.length;
  const defN  = def.score / TYPES.length;          // ~ -1..1
  const offN  = off.covered / TYPES.length;         // 0..1
  const statN = clamp((avgBst - 400) / 200, -1, 1.5);
  const W = TEAM_WEIGHTS;
  const score = W.defense * defN + W.offense * offN + W.stats * statN;
  return { score, def, off, avgBst, parts: { defN, offN, statN } };
}

/* Find a ranked list of strong, DISTINCT teams of `teamSize` from `pool`.
   Brute force over the National Dex is infeasible, so we restrict to the
   strongest candidates by BST, then run many randomized greedy seeds each
   refined by hill-climbing single-member swaps, dedupe, and rank.
   Returns [{ team, score, def, off, avgBst, parts }] best-first. */
function bestTeams(pool, opts = {}){
  const size   = opts.teamSize || 6;
  const restarts = opts.restarts || 60;
  const topN   = opts.topN || 25;
  const candN  = opts.candidatePoolSize || 250;
  const base = opts.excludeLegendaries ? pool.filter(p => !isLegendary(p)) : pool;
  if(base.length < size) return [];

  const cand = base.slice().sort((a, b) => bst(b) - bst(a))
                   .slice(0, Math.min(candN, base.length));

  // deterministic RNG so results are stable across runs
  let s = 0x2545f491;
  const rng = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const has = (team, p, skip) =>
    team.some((m, idx) => idx !== skip && monId(m) === monId(p));

  function greedySeed(){
    const team = [cand[Math.floor(rng() * Math.min(40, cand.length))]];
    while(team.length < size){
      let best = null, bestS = -Infinity;
      for(const p of cand){
        if(has(team, p, -1)) continue;
        const sc = teamScore([...team, p]).score;
        if(sc > bestS){ bestS = sc; best = p; }
      }
      team.push(best);
    }
    return team;
  }

  function improve(team){
    let cur = team.slice(), curScore = teamScore(cur).score, improved = true;
    while(improved){
      improved = false;
      for(let i = 0; i < cur.length; i++){
        let bestP = cur[i], bestS = curScore;
        for(const p of cand){
          if(has(cur, p, i)) continue;
          const trial = cur.slice(); trial[i] = p;
          const sc = teamScore(trial).score;
          if(sc > bestS){ bestS = sc; bestP = p; }
        }
        if(bestP !== cur[i]){ cur[i] = bestP; curScore = bestS; improved = true; }
      }
    }
    return cur;
  }

  const seen = new Map();
  const keyOf = t => t.map(monId).sort().join(",");
  for(let r = 0; r < restarts; r++){
    const team = improve(greedySeed());
    const k = keyOf(team);
    if(!seen.has(k)) seen.set(k, { team: team.slice(), ...teamScore(team) });
  }
  return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, topN);
}

/* Export for Node-based test runners while staying a plain global script in the browser. */
if(typeof module !== "undefined" && module.exports){
  module.exports = {
    TYPES, CHART, TYPE_COLORS, TYPE_ID, typeMult, bestStabMult, classify, fmtMult,
    clamp, multToScore, bestAtkStat, counterScore, counterLabel, COUNTER_WEIGHTS,
    avgCounterScore, rankAgainst, bestLineups, pairedLineups, bestDuoVsPair,
    allTypings, defensiveProfile, offensiveProfile, rankTypings, combineTypings,
    bst, monId, LEGENDARY, isLegendary,
    teamDefenseProfile, teamOffenseProfile, teamScore, TEAM_WEIGHTS, bestTeams
  };
}
