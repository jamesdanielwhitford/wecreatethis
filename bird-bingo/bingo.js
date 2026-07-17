// Bird Bingo - card generation and win detection
const Bingo = {
  // djb2 hash, mirrors hardle/words.js hashStringToNumber
  hashStringToNumber(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0;
  },

  // Seeded Fisher-Yates shuffle (LCG), mirrors hardle/words.js createCyclicGenerator.
  // Same seed always produces the same order - used for the personal daily card.
  seededShuffle(array, seed) {
    const result = [...array];
    let m = result.length;
    let currentSeed = seed;

    const rand = (n) => {
      currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
      return currentSeed % n;
    };

    while (m) {
      const i = rand(m);
      m--;
      const t = result[m];
      result[m] = result[i];
      result[i] = t;
    }
    return result;
  },

  todayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  },

  // ---------- Core calculation: tight radius, ranked by observation frequency ----------
  // This is the method chosen from garden-birds.html testing.

  async fetchCandidates(lat, lng, tightRadiusKm) {
    const obs = await EBird.getNearbyObservations(lat, lng, tightRadiusKm);
    const counts = new Map(); // speciesCode -> { count, sample }
    obs.forEach(o => {
      const entry = counts.get(o.speciesCode) || { count: 0, sample: o };
      entry.count++;
      counts.set(o.speciesCode, entry);
    });
    const ranked = Array.from(counts.entries()).map(([code, { count, sample }]) => ({
      speciesCode: code,
      comName: sample.comName,
      sciName: sample.sciName,
      metric: `${count} checklist${count === 1 ? '' : 's'}`,
      count
    }));
    ranked.sort((a, b) => b.count - a.count);
    return ranked;
  },

  // Pick birds for a card of `size*size` cells (minus any FREE space - bird bingo
  // has no free space, every cell is a real bird), applying hard mode if requested.
  // Hard mode excludes species already on the life list, but tops up with the
  // next-best already-seen species if there aren't enough unseen candidates.
  async pickBirds(candidates, cellCount, hardMode, lifeListCodes) {
    if (!hardMode) {
      return candidates.slice(0, cellCount);
    }

    const unseen = candidates.filter(b => !lifeListCodes.has(b.speciesCode));
    const seen = candidates.filter(b => lifeListCodes.has(b.speciesCode));

    const picked = unseen.slice(0, cellCount);
    if (picked.length < cellCount) {
      picked.push(...seen.slice(0, cellCount - picked.length));
    }
    return picked;
  },

  TIGHT_RADIUS_KM: 8,

  async generateCard({ lat, lng, size, hardMode, seed, regionName }) {
    const cellCount = size * size;
    const candidates = await this.fetchCandidates(lat, lng, this.TIGHT_RADIUS_KM);

    let lifeListCodes = new Set();
    if (hardMode && typeof BingoDB !== 'undefined') {
      lifeListCodes = await BingoDB.getLifeListSpeciesCodes();
    }

    // Need a wider pool than just cellCount so hard mode / shuffling has room to work with.
    const poolSize = Math.max(cellCount * 4, 40);
    const pool = candidates.slice(0, poolSize);

    const ordered = seed !== undefined && seed !== null
      ? this.seededShuffle(pool, seed)
      : pool; // practice mode: keep frequency order (most common first) rather than randomizing

    const birds = await this.pickBirds(ordered, cellCount, hardMode, lifeListCodes);

    return {
      size,
      hardMode: !!hardMode,
      lat,
      lng,
      regionName: regionName || null,
      birds
    };
  },

  // ---------- Win detection, generalized to NxN ----------

  checkBingo(grid, size, seenCodes) {
    const isMarked = (index) => {
      const cell = grid[index];
      return cell && seenCodes.has(cell.speciesCode);
    };

    const winningCells = new Set();
    let hasBingo = false;

    for (let row = 0; row < size; row++) {
      const indices = [];
      for (let c = 0; c < size; c++) indices.push(row * size + c);
      if (indices.every(isMarked)) {
        hasBingo = true;
        indices.forEach(i => winningCells.add(i));
      }
    }

    for (let col = 0; col < size; col++) {
      const indices = [];
      for (let r = 0; r < size; r++) indices.push(r * size + col);
      if (indices.every(isMarked)) {
        hasBingo = true;
        indices.forEach(i => winningCells.add(i));
      }
    }

    const diagonal1 = [];
    const diagonal2 = [];
    for (let i = 0; i < size; i++) {
      diagonal1.push(i * size + i);
      diagonal2.push(i * size + (size - 1 - i));
    }
    if (diagonal1.every(isMarked)) {
      hasBingo = true;
      diagonal1.forEach(i => winningCells.add(i));
    }
    if (diagonal2.every(isMarked)) {
      hasBingo = true;
      diagonal2.forEach(i => winningCells.add(i));
    }

    return { hasBingo, winningCells: [...winningCells] };
  }
};
