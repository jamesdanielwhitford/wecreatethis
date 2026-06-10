// Tower of Hanoi benchmark UI: live agent sessions + on-device share card rendering.

const BASE = "/towersofhanoi";

const DISK_COLORS = [
  "#5eb1ff", "#4ade80", "#facc15", "#fb923c", "#f87171", "#c084fc",
  "#34d399", "#f472b6", "#a3e635", "#38bdf8", "#fbbf24", "#e879f9",
  "#2dd4bf", "#fca5a5", "#93c5fd", "#bef264", "#fdba74", "#d8b4fe",
  "#86efac", "#fde047",
];

document.getElementById("mcp-url").textContent = `${location.origin}${BASE}/mcp`;
document.getElementById("mcp-add").textContent =
  `claude mcp add --transport http hanoi ${location.origin}${BASE}/mcp`;

// ---------- live sessions ----------

const liveContainer = document.getElementById("live-sessions");
const shareUrls = new Map(); // puzzleId -> share url created this visit

function renderBoard(container, pegs, numDisks) {
  container.innerHTML = "";
  for (const name of ["A", "B", "C"]) {
    const pegEl = document.createElement("div");
    pegEl.className = "peg";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = name;
    pegEl.appendChild(label);
    for (const disk of pegs[name]) {
      const el = document.createElement("div");
      el.className = "disk";
      el.style.width = `${(disk / numDisks) * 95}%`;
      el.style.background = DISK_COLORS[(disk - 1) % DISK_COLORS.length];
      pegEl.appendChild(el);
    }
    container.appendChild(pegEl);
  }
}

function fmtDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function scoreOf(g) {
  const s = g.state;
  if (g.status !== "solved" || s.moveCount === 0) return 0;
  return Math.max(0, Math.round((1000 * s.numDisks * s.optimalMoves) / s.moveCount - 5 * s.invalidAttempts));
}

async function refreshLive() {
  try {
    const games = await fetch(`${BASE}/api/games`).then((r) => r.json());
    if (games.length === 0) return; // keep the placeholder text
    liveContainer.innerHTML = "";
    for (const g of games) {
      const el = document.createElement("div");
      el.className = "session";
      const elapsed = (g.finishedAt ?? Date.now()) - g.startedAt;
      const finished = g.status !== "in_progress";
      el.innerHTML = `
        <div class="meta">
          <span class="who"></span>
          <span class="badge ${g.status}">${g.status.replace("_", " ")}</span>
          <span class="stat">${g.state.numDisks} disks</span>
          <span class="stat">moves: ${g.state.moveCount} / optimal ${g.state.optimalMoves}</span>
          <span class="stat">invalid: ${g.state.invalidAttempts}</span>
          <span class="stat">${fmtDuration(elapsed)}</span>
          ${g.status === "solved" ? `<span class="stat score">score: ${scoreOf(g)}</span>` : ""}
          ${finished ? `<button class="share-btn">Share result</button><span class="share-status"></span>` : ""}
        </div>
        <div class="board"></div>`;
      el.querySelector(".who").textContent = `${g.company} — ${g.model}`;
      renderBoard(el.querySelector(".board"), g.state.pegs, g.state.numDisks);
      const btn = el.querySelector(".share-btn");
      if (btn) btn.addEventListener("click", () => share(g, btn, el.querySelector(".share-status")));
      liveContainer.appendChild(el);
    }
  } catch {
    /* server briefly unreachable; try again on the next tick */
  }
}

refreshLive();
setInterval(refreshLive, 2000);

// ---------- share card (rendered on-device, stored once) ----------

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCard(g) {
  const canvas = document.getElementById("card-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 630;
  const solved = g.status === "solved";
  const s = g.state;

  ctx.fillStyle = "#10141c";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#5eb1ff");
  grad.addColorStop(1, solved ? "#4ade80" : "#f87171");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  ctx.fillStyle = "#8b94a8";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText("TOWER OF HANOI — AGENT BENCHMARK", 60, 80);

  ctx.font = "800 64px system-ui, sans-serif";
  ctx.fillStyle = solved ? "#4ade80" : "#f87171";
  const verdict = solved ? "SOLVED" : "FAILED";
  ctx.fillText(verdict, 60, 170);
  const vw = ctx.measureText(verdict).width;
  ctx.fillStyle = "#e8ecf4";
  ctx.fillText(`  ·  ${s.numDisks} DISKS`, 60 + vw, 170);

  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillStyle = "#e8ecf4";
  ctx.fillText(`${g.company} — ${g.model}`.slice(0, 48), 60, 248);

  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillStyle = "#8b94a8";
  const dur = fmtDuration((g.finishedAt ?? Date.now()) - g.startedAt);
  ctx.fillText(
    `${s.moveCount} moves (optimal ${s.optimalMoves})  ·  ${s.invalidAttempts} invalid  ·  ${dur}`,
    60, 308
  );

  ctx.font = "800 96px system-ui, sans-serif";
  ctx.fillStyle = solved ? "#5eb1ff" : "#f87171";
  ctx.fillText(`SCORE ${scoreOf(g)}`, 60, 430);

  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillStyle = "#8b94a8";
  ctx.fillText("Can your agent beat it?  wecreatethis.com/towersofhanoi", 60, 560);

  // final board, bottom right
  const bx = 740, by = 350, bw = 400, bh = 220;
  roundRect(ctx, bx - 20, by - 20, bw + 40, bh + 50, 16, "#1a2030");
  const pegNames = ["A", "B", "C"];
  const pegSpacing = bw / 3;
  ctx.fillStyle = "#4a5468";
  ctx.fillRect(bx, by + bh, bw, 8);
  for (let i = 0; i < 3; i++) {
    const cx = bx + pegSpacing * i + pegSpacing / 2;
    ctx.fillStyle = "#4a5468";
    ctx.fillRect(cx - 4, by, 8, bh);
    const pegDisks = s.pegs[pegNames[i]];
    const dh = Math.min(20, (bh - 10) / Math.max(s.numDisks, 1));
    pegDisks.forEach((disk, j) => {
      const dw = 30 + (disk / s.numDisks) * (pegSpacing - 40);
      roundRect(ctx, cx - dw / 2, by + bh - (j + 1) * (dh + 2), dw, dh, dh / 2,
        DISK_COLORS[(disk - 1) % DISK_COLORS.length]);
    });
  }
  return canvas;
}

async function share(g, btn, statusEl) {
  try {
    btn.disabled = true;
    let url = shareUrls.get(g.puzzleId);
    if (!url) {
      statusEl.textContent = "creating…";
      const canvas = drawCard(g);
      const image = canvas.toDataURL("image/png");
      const res = await fetch(`${BASE}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: g.puzzleId, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "share failed");
      url = data.url;
      shareUrls.set(g.puzzleId, url);
    }
    if (navigator.share) {
      await navigator.share({ title: "Tower of Hanoi agent benchmark result", url });
      statusEl.textContent = "shared!";
    } else {
      await navigator.clipboard.writeText(url);
      statusEl.innerHTML = "";
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.textContent = "link copied — open";
      statusEl.appendChild(a);
    }
  } catch (err) {
    statusEl.textContent = String(err.message || err);
  } finally {
    btn.disabled = false;
  }
}
