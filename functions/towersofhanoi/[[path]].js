// Tower of Hanoi agent benchmark — serverless backend.
//
// Routes (relative to /towersofhanoi):
//   POST /mcp           MCP server (Streamable HTTP, stateless JSON-RPC)
//   GET  /api/games     recent sessions for the live view
//   POST /api/share     store a result share (card PNG is rendered in the browser)
//   GET  /r/<id>        share page with Open Graph tags for link previews
//   GET  /r/<id>.png    the share card image
//
// State lives in the HANOI KV namespace:
//   agent:<id>     registered agent
//   game:<id>      one puzzle session (rewritten on every move)
//   recent         ids of the latest sessions (written once per game)
//   share:<id>     share metadata
//   shareimg:<id>  share card PNG bytes

// ---------- game engine ----------

const PEGS = ["A", "B", "C"];

function createPuzzle(numDisks) {
  const pegs = { A: [], B: [], C: [] };
  for (let d = numDisks; d >= 1; d--) pegs.A.push(d); // bottom-to-top
  return {
    numDisks,
    pegs,
    moveCount: 0,
    invalidAttempts: 0,
    optimalMoves: 2 ** numDisks - 1,
    solved: false,
  };
}

function applyMove(puzzle, from, to) {
  const fail = (error) => {
    puzzle.invalidAttempts++;
    return { ok: false, error };
  };
  if (puzzle.solved) return fail("Puzzle is already solved.");
  if (!PEGS.includes(from)) return fail(`Invalid source peg "${from}". Pegs are A, B, C.`);
  if (!PEGS.includes(to)) return fail(`Invalid target peg "${to}". Pegs are A, B, C.`);
  if (from === to) return fail("Source and target pegs must differ.");
  const src = puzzle.pegs[from];
  const dst = puzzle.pegs[to];
  if (src.length === 0) return fail(`Peg ${from} is empty.`);
  const disk = src[src.length - 1];
  const top = dst[dst.length - 1];
  if (top !== undefined && disk > top) {
    return fail(`Cannot place disk ${disk} on smaller disk ${top} (peg ${to}).`);
  }
  src.pop();
  dst.push(disk);
  puzzle.moveCount++;
  puzzle.solved = puzzle.pegs.C.length === puzzle.numDisks;
  return { ok: true };
}

// ---------- KV store helpers ----------

// KV allows ~1 write/second per key; an agent moving faster than that gets a
// 429, so retry with a pause. This also paces agents to a watchable speed.
async function kvPut(env, key, value) {
  for (let attempt = 0; ; attempt++) {
    try {
      await env.HANOI.put(key, JSON.stringify(value));
      return;
    } catch (err) {
      if (attempt >= 4 || !String(err).includes("429")) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

const kvGet = (env, key) => env.HANOI.get(key, "json");
const newId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 16);

function scoreGame(game) {
  const p = game.puzzle;
  const efficiency = p.moveCount > 0 ? p.optimalMoves / p.moveCount : 0;
  return {
    company: game.company,
    model: game.model,
    numDisks: p.numDisks,
    status: game.status,
    moveCount: p.moveCount,
    optimalMoves: p.optimalMoves,
    invalidAttempts: p.invalidAttempts,
    durationMs: (game.finishedAt ?? Date.now()) - game.startedAt,
    score:
      game.status === "solved"
        ? Math.max(0, Math.round(1000 * p.numDisks * efficiency - 5 * p.invalidAttempts))
        : 0,
  };
}

async function finishGame(env, game, status) {
  game.status = status;
  game.finishedAt = Date.now();
  await kvPut(env, `game:${game.puzzleId}`, game);
}

// ---------- MCP tools ----------

const RULES = [
  "Tower of Hanoi rules:",
  "- Three pegs: A, B, C. Disks are numbered by size (1 = smallest).",
  "- All disks start on peg A. You win by moving the entire stack to peg C.",
  "- One move transfers the TOP disk of one peg onto another peg.",
  "- You may never place a disk on top of a smaller disk.",
  "- Peg arrays in the state are listed bottom-to-top, so the last element is the movable top disk.",
  "- The minimum solution for n disks is 2^n - 1 moves. Your score rewards solving with few moves and no invalid attempts.",
].join("\n");

const TOOLS = [
  {
    name: "register_agent",
    description:
      "Register yourself for the Tower of Hanoi benchmark. Provide the company that made you and your model name. Returns an agent_id to use with start_puzzle.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company that built the agent, e.g. 'Anthropic'" },
        model: { type: "string", description: "Model name, e.g. 'Claude Opus 4.8'" },
      },
      required: ["company", "model"],
    },
  },
  {
    name: "start_puzzle",
    description:
      "Start a new Tower of Hanoi puzzle at a chosen complexity (number of disks, 1-20). Returns the rules, the starting state, and a puzzle_id for move_disk.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Your agent_id from register_agent" },
        disks: { type: "integer", minimum: 1, maximum: 20, description: "Number of disks (complexity level)" },
      },
      required: ["agent_id", "disks"],
    },
  },
  {
    name: "move_disk",
    description:
      "Move the top disk from one peg to another. Returns whether the move was valid, the updated puzzle state, and whether the puzzle is solved. Invalid moves are counted and reduce your score but do not change the board.",
    inputSchema: {
      type: "object",
      properties: {
        puzzle_id: { type: "string", description: "The puzzle_id from start_puzzle" },
        from: { type: "string", enum: ["A", "B", "C"], description: "Peg to take the top disk from" },
        to: { type: "string", enum: ["A", "B", "C"], description: "Peg to place the disk on" },
      },
      required: ["puzzle_id", "from", "to"],
    },
  },
  {
    name: "get_puzzle_state",
    description: "Get the current state of a puzzle without making a move.",
    inputSchema: {
      type: "object",
      properties: { puzzle_id: { type: "string", description: "The puzzle_id from start_puzzle" } },
      required: ["puzzle_id"],
    },
  },
  {
    name: "give_up",
    description: "Concede the current puzzle. The attempt is recorded as unsolved.",
    inputSchema: {
      type: "object",
      properties: { puzzle_id: { type: "string", description: "The puzzle_id from start_puzzle" } },
      required: ["puzzle_id"],
    },
  },
];

const gameSummary = (game) => ({
  puzzle_id: game.puzzleId,
  status: game.status,
  state: game.puzzle,
});

const cleanName = (v) =>
  String(v ?? "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 60);

async function callTool(env, name, args) {
  switch (name) {
    case "register_agent": {
      const agent = {
        agentId: newId(),
        company: cleanName(args.company),
        model: cleanName(args.model),
        registeredAt: Date.now(),
      };
      if (!agent.company || !agent.model) throw new Error("company and model are required.");
      await kvPut(env, `agent:${agent.agentId}`, agent);
      return {
        agent_id: agent.agentId,
        message:
          "Registered. Call start_puzzle with this agent_id and your chosen number of disks (3 = easy, 7 = where most models start failing, 8+ = beyond the collapse point reported in Apple's 'Illusion of Thinking' paper).",
      };
    }
    case "start_puzzle": {
      const agent = await kvGet(env, `agent:${args.agent_id}`);
      if (!agent) throw new Error("Unknown agent_id. Call register_agent first.");
      const disks = Number(args.disks);
      if (!Number.isInteger(disks) || disks < 1 || disks > 20) {
        throw new Error("disks must be an integer between 1 and 20.");
      }
      const game = {
        puzzleId: newId(),
        agentId: agent.agentId,
        company: agent.company,
        model: agent.model,
        puzzle: createPuzzle(disks),
        status: "in_progress",
        startedAt: Date.now(),
        finishedAt: null,
        shareId: null,
      };
      await kvPut(env, `game:${game.puzzleId}`, game);
      const recent = (await kvGet(env, "recent")) ?? [];
      recent.unshift(game.puzzleId);
      await kvPut(env, "recent", recent.slice(0, 12));
      return {
        rules: RULES,
        goal: `Move all ${disks} disks from peg A to peg C. Optimal solution: ${game.puzzle.optimalMoves} moves.`,
        ...gameSummary(game),
      };
    }
    case "move_disk": {
      const game = await kvGet(env, `game:${args.puzzle_id}`);
      if (!game) throw new Error("Unknown puzzle_id. Call start_puzzle first.");
      if (game.status !== "in_progress") {
        return { move_valid: false, error: `This puzzle is finished (${game.status}).`, ...gameSummary(game) };
      }
      const { ok, error } = applyMove(game.puzzle, args.from, args.to);
      if (game.puzzle.solved) {
        await finishGame(env, game, "solved");
      } else {
        await kvPut(env, `game:${game.puzzleId}`, game);
      }
      const payload = { move_valid: ok, ...(error ? { error } : {}), ...gameSummary(game) };
      if (game.status === "solved") {
        payload.message = `Solved! ${game.puzzle.moveCount} moves (optimal ${game.puzzle.optimalMoves}), ${game.puzzle.invalidAttempts} invalid attempts. Score: ${scoreGame(game).score}. The human can share this result from the web page.`;
      }
      return payload;
    }
    case "get_puzzle_state": {
      const game = await kvGet(env, `game:${args.puzzle_id}`);
      if (!game) throw new Error("Unknown puzzle_id. Call start_puzzle first.");
      return gameSummary(game);
    }
    case "give_up": {
      const game = await kvGet(env, `game:${args.puzzle_id}`);
      if (!game) throw new Error("Unknown puzzle_id. Call start_puzzle first.");
      if (game.status === "in_progress") await finishGame(env, game, "gave_up");
      return gameSummary(game);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- MCP JSON-RPC over Streamable HTTP (stateless) ----------

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

async function handleMcp(request, env) {
  if (request.method !== "POST") {
    return json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }, 405);
  }
  let msg;
  try {
    msg = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, 400);
  }

  // Notifications (no id) get a 202 with no body.
  if (msg.id === undefined || msg.id === null) {
    return new Response(null, { status: 202, headers: CORS });
  }

  const reply = (result) => json({ jsonrpc: "2.0", id: msg.id, result });
  const rpcError = (code, message) => json({ jsonrpc: "2.0", id: msg.id, error: { code, message } });

  try {
    switch (msg.method) {
      case "initialize": {
        const requested = msg.params?.protocolVersion;
        return reply({
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
            ? requested
            : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "towers-of-hanoi-benchmark", version: "2.0.0" },
        });
      }
      case "ping":
        return reply({});
      case "tools/list":
        return reply({ tools: TOOLS });
      case "tools/call": {
        try {
          const result = await callTool(env, msg.params?.name, msg.params?.arguments ?? {});
          return reply({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
        } catch (err) {
          return reply({ content: [{ type: "text", text: String(err.message ?? err) }], isError: true });
        }
      }
      default:
        return rpcError(-32601, `Method not found: ${msg.method}`);
    }
  } catch (err) {
    return rpcError(-32603, String(err.message ?? err));
  }
}

// ---------- sharing ----------

const MAX_IMAGE_BYTES = 400_000;

// The browser renders the result card to a canvas and posts it here as a PNG
// data URL; we keep the bytes so link-preview scrapers have a real image URL.
async function handleShareCreate(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const game = await kvGet(env, `game:${body.puzzle_id}`);
  if (!game) return json({ error: "Unknown puzzle_id" }, 404);
  if (game.status === "in_progress") return json({ error: "Puzzle is not finished yet" }, 400);

  if (game.shareId) {
    return json({ url: `${origin}/towersofhanoi/r/${game.shareId}` });
  }

  const prefix = "data:image/png;base64,";
  if (typeof body.image !== "string" || !body.image.startsWith(prefix)) {
    return json({ error: "image must be a PNG data URL" }, 400);
  }
  let bytes;
  try {
    bytes = Uint8Array.from(atob(body.image.slice(prefix.length)), (c) => c.charCodeAt(0));
  } catch {
    return json({ error: "Invalid base64 image" }, 400);
  }
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return json({ error: "Image too large" }, 400);
  }

  const shareId = newId();
  // Metadata is taken from the recorded game, not the client, so a share
  // can't claim a different score than the agent actually earned.
  await env.HANOI.put(`shareimg:${shareId}`, bytes.buffer);
  await kvPut(env, `share:${shareId}`, { ...scoreGame(game), createdAt: Date.now() });
  game.shareId = shareId;
  await kvPut(env, `game:${game.puzzleId}`, game);
  return json({ url: `${origin}/towersofhanoi/r/${shareId}` });
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function sharePage(share, shareId, origin) {
  const solved = share.status === "solved";
  const who = `${share.company} — ${share.model}`;
  const title = solved
    ? `${who} solved the ${share.numDisks}-disk Tower of Hanoi`
    : `${who} failed the ${share.numDisks}-disk Tower of Hanoi`;
  const desc = solved
    ? `Score ${share.score}: ${share.moveCount} moves (optimal ${share.optimalMoves}), ${share.invalidAttempts} invalid attempts. Can your agent beat it?`
    : `Gave up after ${share.moveCount} moves (optimal ${share.optimalMoves}). Can your agent do better?`;
  const img = `${origin}/towersofhanoi/r/${shareId}.png`;
  const url = `${origin}/towersofhanoi/r/${shareId}`;
  const t = escapeHtml(title);
  const d = escapeHtml(desc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t}</title>
<meta name="description" content="${d}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />
<meta name="theme-color" content="#10141c" />
<style>
  body { margin:0; background:#10141c; color:#e8ecf4; font-family:system-ui,-apple-system,sans-serif;
         display:flex; flex-direction:column; align-items:center; gap:1.2rem; padding:2rem 1rem; text-align:center; }
  img { max-width:min(680px,100%); border-radius:14px; box-shadow:0 8px 40px rgba(0,0,0,.5); }
  h1 { font-size:1.25rem; margin:0; max-width:680px; }
  a.cta { background:#5eb1ff; color:#10141c; font-weight:700; text-decoration:none;
          padding:.7rem 1.4rem; border-radius:10px; }
  p { color:#8b94a8; margin:0; }
</style>
</head>
<body>
<h1>${t}</h1>
<img src="${img}" alt="Benchmark result card" />
<p>${d}</p>
<a class="cta" href="/towersofhanoi/">Test your own agent →</a>
</body>
</html>`;
}

// ---------- HTTP plumbing ----------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.path ?? []).join("/");
  const origin = new URL(request.url).origin;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (route === "mcp") return handleMcp(request, env);

  if (route === "api/games") {
    const recent = (await kvGet(env, "recent")) ?? [];
    const games = await Promise.all(recent.slice(0, 6).map((id) => kvGet(env, `game:${id}`)));
    return json(
      games
        .filter(Boolean)
        .map((g) => ({
          puzzleId: g.puzzleId,
          company: g.company,
          model: g.model,
          status: g.status,
          startedAt: g.startedAt,
          finishedAt: g.finishedAt,
          shareId: g.shareId ?? null,
          state: g.puzzle,
        }))
    );
  }

  if (route === "api/share" && request.method === "POST") {
    return handleShareCreate(request, env, origin);
  }

  if (route.startsWith("r/")) {
    const rest = route.slice(2);
    if (rest.endsWith(".png")) {
      const img = await env.HANOI.get(`shareimg:${rest.slice(0, -4)}`, "arrayBuffer");
      if (!img) return new Response("Not found", { status: 404 });
      return new Response(img, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }
    const share = await kvGet(env, `share:${rest}`);
    if (!share) return new Response("Share not found", { status: 404 });
    return new Response(sharePage(share, rest, origin), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  // Anything else under /towersofhanoi falls through to the static files.
  return context.next();
}
