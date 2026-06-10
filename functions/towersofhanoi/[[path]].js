// Tower of Hanoi agent benchmark — serverless backend.
//
// Routes (relative to /towersofhanoi):
//   POST /mcp              MCP server (Streamable HTTP, stateless JSON-RPC)
//   GET  /api/games        live sessions for the web UI
//   GET  /api/leaderboard  ranked results
//
// State lives in the HANOI KV namespace:
//   agent:<id>  registered agent
//   game:<id>   one puzzle session (rewritten on every move)
//   recent      ids of the latest sessions (written once per game)
//   results     finished attempts (written once per finish)

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
  const solved = game.status === "solved";
  return {
    puzzleId: game.puzzleId,
    company: game.company,
    model: game.model,
    numDisks: p.numDisks,
    status: game.status,
    moveCount: p.moveCount,
    optimalMoves: p.optimalMoves,
    invalidAttempts: p.invalidAttempts,
    efficiency: Math.round(efficiency * 1000) / 1000,
    durationMs: (game.finishedAt ?? Date.now()) - game.startedAt,
    score: solved
      ? Math.max(0, Math.round(1000 * p.numDisks * efficiency - 5 * p.invalidAttempts))
      : 0,
    finishedAt: game.finishedAt,
  };
}

async function finishGame(env, game, status) {
  game.status = status;
  game.finishedAt = Date.now();
  await kvPut(env, `game:${game.puzzleId}`, game);
  const results = (await kvGet(env, "results")) ?? [];
  results.push(scoreGame(game));
  await kvPut(env, "results", results);
}

function rankResults(results) {
  return [...results].sort(
    (a, b) =>
      (b.status === "solved") - (a.status === "solved") ||
      b.numDisks - a.numDisks ||
      b.score - a.score ||
      a.durationMs - b.durationMs
  );
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
    description: "Concede the current puzzle. The attempt is recorded on the leaderboard as unsolved.",
    inputSchema: {
      type: "object",
      properties: { puzzle_id: { type: "string", description: "The puzzle_id from start_puzzle" } },
      required: ["puzzle_id"],
    },
  },
  {
    name: "get_leaderboard",
    description: "See all recorded benchmark attempts, ranked.",
    inputSchema: { type: "object", properties: {} },
  },
];

const gameSummary = (game) => ({
  puzzle_id: game.puzzleId,
  status: game.status,
  state: game.puzzle,
});

async function callTool(env, name, args) {
  switch (name) {
    case "register_agent": {
      const agent = {
        agentId: newId(),
        company: String(args.company ?? "").trim(),
        model: String(args.model ?? "").trim(),
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
      };
      await kvPut(env, `game:${game.puzzleId}`, game);
      const recent = (await kvGet(env, "recent")) ?? [];
      recent.unshift(game.puzzleId);
      await kvPut(env, "recent", recent.slice(0, 20));
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
        payload.message = `Solved! ${game.puzzle.moveCount} moves (optimal ${game.puzzle.optimalMoves}), ${game.puzzle.invalidAttempts} invalid attempts. Score: ${scoreGame(game).score}.`;
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
    case "get_leaderboard":
      return rankResults((await kvGet(env, "results")) ?? []);
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
          serverInfo: { name: "towers-of-hanoi-benchmark", version: "1.0.0" },
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

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (route === "mcp") return handleMcp(request, env);

  if (route === "api/leaderboard") {
    return json(rankResults((await kvGet(env, "results")) ?? []));
  }

  if (route === "api/games") {
    const recent = (await kvGet(env, "recent")) ?? [];
    const games = await Promise.all(recent.slice(0, 8).map((id) => kvGet(env, `game:${id}`)));
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
          state: g.puzzle,
        }))
    );
  }

  // Anything else under /towersofhanoi falls through to the static files.
  return context.next();
}
