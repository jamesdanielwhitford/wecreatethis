// Tower of Hanoi UI: manual play (client-side engine), live agent view, leaderboard.

const DISK_COLORS = [
  "#5eb1ff", "#4ade80", "#facc15", "#fb923c", "#f87171", "#c084fc",
  "#34d399", "#f472b6", "#a3e635", "#38bdf8", "#fbbf24", "#e879f9",
  "#2dd4bf", "#fca5a5", "#93c5fd", "#bef264", "#fdba74", "#d8b4fe",
  "#86efac", "#fde047",
];

document.getElementById("mcp-url").textContent = `${location.origin}/towersofhanoi/mcp`;
document.getElementById("mcp-add").textContent = `claude mcp add --transport http hanoi ${location.origin}/towersofhanoi/mcp`;

// ---------- shared board rendering ----------

// pegs: { A: [...], B: [...], C: [...] } bottom-to-top disk sizes.
function renderBoard(container, pegs, numDisks, opts = {}) {
  container.innerHTML = "";
  const maxWidthPct = 95;
  for (const name of ["A", "B", "C"]) {
    const pegEl = document.createElement("div");
    pegEl.className = "peg";
    if (opts.selectedPeg === name) pegEl.classList.add("selected");
    pegEl.dataset.peg = name;
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = name;
    pegEl.appendChild(label);
    pegs[name].forEach((disk, i) => {
      const el = document.createElement("div");
      el.className = "disk";
      const isTop = i === pegs[name].length - 1;
      if (opts.selectedPeg === name && isTop) el.classList.add("lifted");
      el.style.width = `${(disk / numDisks) * maxWidthPct}%`;
      el.style.background = DISK_COLORS[(disk - 1) % DISK_COLORS.length];
      pegEl.appendChild(el);
    });
    if (opts.onPegClick) pegEl.addEventListener("click", () => opts.onPegClick(name));
    container.appendChild(pegEl);
  }
}

// ---------- manual play ----------

const diskSelect = document.getElementById("disk-count");
const manualBoard = document.getElementById("manual-board");
const manualStatus = document.getElementById("manual-status");

for (let n = 3; n <= 12; n++) {
  const opt = document.createElement("option");
  opt.value = n;
  opt.textContent = `${n} (optimal: ${2 ** n - 1} moves)`;
  diskSelect.appendChild(opt);
}

let manual = null;
let selectedPeg = null;

function newManualGame() {
  const n = Number(diskSelect.value);
  manual = { numDisks: n, pegs: { A: [], B: [], C: [] }, moves: 0, solved: false };
  for (let d = n; d >= 1; d--) manual.pegs.A.push(d);
  selectedPeg = null;
  drawManual();
}

function drawManual() {
  renderBoard(manualBoard, manual.pegs, manual.numDisks, {
    selectedPeg,
    onPegClick: handlePegClick,
  });
  manualStatus.classList.toggle("win", manual.solved);
  manualStatus.textContent = manual.solved
    ? `Solved in ${manual.moves} moves! (optimal: ${2 ** manual.numDisks - 1})`
    : `Moves: ${manual.moves}`;
}

function handlePegClick(peg) {
  if (manual.solved) return;
  if (selectedPeg === null) {
    if (manual.pegs[peg].length > 0) selectedPeg = peg;
  } else if (selectedPeg === peg) {
    selectedPeg = null;
  } else {
    const src = manual.pegs[selectedPeg];
    const dst = manual.pegs[peg];
    const disk = src[src.length - 1];
    const top = dst[dst.length - 1];
    if (top === undefined || disk < top) {
      dst.push(src.pop());
      manual.moves++;
      manual.solved = manual.pegs.C.length === manual.numDisks;
      selectedPeg = null;
    } else {
      selectedPeg = null; // illegal drop: just put it back
    }
  }
  drawManual();
}

document.getElementById("reset").addEventListener("click", newManualGame);
diskSelect.addEventListener("change", newManualGame);
newManualGame();

// ---------- live agent sessions ----------

const liveContainer = document.getElementById("live-sessions");

function fmtDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

async function refreshLive() {
  try {
    const games = await fetch("/towersofhanoi/api/games").then((r) => r.json());
    if (games.length === 0) return; // keep the placeholder text
    liveContainer.innerHTML = "";
    for (const g of games) {
      const el = document.createElement("div");
      el.className = "session";
      const elapsed = (g.finishedAt ?? Date.now()) - g.startedAt;
      el.innerHTML = `
        <div class="meta">
          <span class="who"></span>
          <span class="badge ${g.status}">${g.status.replace("_", " ")}</span>
          <span class="stat">${g.state.numDisks} disks</span>
          <span class="stat">moves: ${g.state.moveCount} / optimal ${g.state.optimalMoves}</span>
          <span class="stat">invalid: ${g.state.invalidAttempts}</span>
          <span class="stat">${fmtDuration(elapsed)}</span>
        </div>
        <div class="board"></div>`;
      el.querySelector(".who").textContent = `${g.company} — ${g.model}`;
      renderBoard(el.querySelector(".board"), g.state.pegs, g.state.numDisks);
      liveContainer.appendChild(el);
    }
  } catch {
    /* server briefly unreachable; try again on the next tick */
  }
}

// ---------- leaderboard ----------

const lbBody = document.querySelector("#leaderboard tbody");
const lbEmpty = document.getElementById("leaderboard-empty");

async function refreshLeaderboard() {
  try {
    const rows = await fetch("/towersofhanoi/api/leaderboard").then((r) => r.json());
    lbEmpty.style.display = rows.length ? "none" : "";
    lbBody.innerHTML = "";
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      const solved = r.status === "solved";
      tr.innerHTML = `
        <td>${i + 1}</td><td></td><td></td><td>${r.numDisks}</td>
        <td class="${solved ? "result-solved" : "result-failed"}">${solved ? "solved" : r.status.replace("_", " ")}</td>
        <td>${r.moveCount}</td><td>${r.optimalMoves}</td><td>${r.invalidAttempts}</td>
        <td>${fmtDuration(r.durationMs)}</td><td>${r.score}</td>`;
      tr.children[1].textContent = r.company;
      tr.children[2].textContent = r.model;
      lbBody.appendChild(tr);
    });
  } catch {
    /* retry on next tick */
  }
}

refreshLive();
refreshLeaderboard();
setInterval(refreshLive, 2000);
setInterval(refreshLeaderboard, 15000);
