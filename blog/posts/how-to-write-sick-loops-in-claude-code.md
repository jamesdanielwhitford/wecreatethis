---
title: How to write (sick) loops in Claude Code
author: James Daniel Whitford
date: 2026-06-19
description: Boris Cherny, creator of Claude Code, says his job is now to write loops that prompt Claude autonomously. Here is how to do it, from simple CI watching to a full multi-model agent loop that clones a website using a browser.
---

# How to write (sick) loops in Claude Code

Boris Cherny, the creator of Claude Code: "I don't prompt Claude anymore. I have loops that are running. They're the ones prompting Claude and figuring out what to do. My job is to write loops."

Instead of typing prompts yourself, you write a loop: a set of instructions that runs on a schedule or condition, calls Claude, and acts on the result. Claude becomes a worker inside your system rather than someone you talk to.

This guide covers four levels of loop:

- [Watch a CI pipeline and fix failures as they appear](#1-watch-with-loop)
- [Run until a goal is met, then stop automatically](#2-run-until-done-with-goal)
- [Fan out to many agents working in parallel](#3-fan-out-with-ultracode)
- [Multi-model loop with browser verification](#4-full-loop-opus-orchestrates-haiku-works-opus-judges-via-browser)

## The demo repo

Fork [jamesdanielwhitford/claude-code-loops-demo](https://github.com/jamesdanielwhitford/claude-code-loops-demo), clone it, and install:

```bash
git clone https://github.com/YOUR_USERNAME/claude-code-loops-demo
cd claude-code-loops-demo
npm install
```

The repo is a broken Express API with three routes, three failing tests, and an unstyled frontend. The `.claude/` folder contains the loop prompts used below. Open it in Claude Code.

## 1. Watch with /loop

**What it is:** `/loop` runs a prompt on a repeating schedule. Claude checks something, reports back, checks again. You stop it when you have seen enough.

**When to use it:** watching CI, monitoring a deploy, summarising Slack mentions overnight, polling a queue.

**How it works:**

| Syntax | Behaviour |
|---|---|
| `/loop 5m <prompt>` | Runs every 5 minutes |
| `/loop <prompt>` | Claude chooses the interval dynamically |
| `/loop` | Uses `.claude/loop.md` if it exists, otherwise the built-in maintenance prompt |

`/loop` never stops itself. That is `/goal`'s job.

Put your standing instructions in `.claude/loop.md`. Bare `/loop` uses that file instead of the built-in prompt. Edits take effect on the next iteration without stopping the loop.

### Try it

Start the CI babysitter (uses `.claude/loop.md` already in the repo):

```
/loop
```

Trigger a CI run:

```bash
git checkout -b my-branch
# add a comment to any file in src/
git add . && git commit -m "trigger CI"
git push origin my-branch
gh pr create --title "Test PR" --body ""
```

CI fails (three test failures and a lint error). The loop reads the logs, fixes `src/`, pushes, and waits for the next CI run. Watch it iterate.

Press Esc when CI goes green.

**Further reading:** [Run a prompt repeatedly with /loop](https://code.claude.com/docs/en/scheduled-tasks#run-a-prompt-repeatedly-with-%2Floop)

## 2. Run until done with /goal

**What it is:** `/goal` sets a completion condition and Claude keeps working until a separate model confirms it is met. The evaluator is a different model instance from the worker, so Claude cannot grade its own homework.

**When to use it:** fix all failing tests until CI passes, migrate a module until the build is clean, work through an issue backlog until the queue is empty.

**The key difference from `/loop`:** `/loop` fires on a time interval, you stop it. `/goal` fires after each completed turn and stops itself.

**How it works:**

```
/goal <condition>
```

Claude starts working immediately. After each turn, the evaluator checks the condition and returns a reason. Run `/goal` with no arguments to see status. Run `/goal clear` to stop early.

Write conditions with one measurable end state and a stated check:

```
/goal all three tests in tests/ pass and npm run lint exits clean
```

### Try it

After the loop has surfaced the failures from step 1, press Esc. Hand off the fixes:

```
/goal all three tests in tests/ pass and npm run lint exits clean
```

Claude edits the broken routes, runs the tests, and checks again. When everything passes, it stops.

**Further reading:** [Keep Claude working toward a goal](https://code.claude.com/docs/en/goal) (how the evaluator works, writing effective conditions, and `/goal clear`)

## 3. Fan out with ultracode

**What it is:** `ultracode` makes Claude write a JavaScript orchestration script that fans out to many subagents running in parallel. Each handles one focused piece of the work. A reviewer agent cross-checks findings before reporting.

**When to use it:** auditing many files, refactoring many call sites, researching many sources. Any task with independent units of work that are slow to run sequentially.

**How it works:** Include `ultracode` anywhere in your prompt. Claude writes the script, shows you the planned phases, and asks you to confirm. Run `/workflows` to watch agents run in parallel (phase counts, token totals, elapsed time). Press `s` to save the script as a reusable slash command.

Requires Claude Code v2.1.154 or later.

### Try it

The three route files have no input validation. Run an audit:

```
ultracode: audit every file in src/routes/ for missing input validation.
For each gap: report the file, the line, and a one-line description of the missing check.
```

One agent per route file runs in parallel. A reviewer agent cross-checks each finding.

The whole audit takes roughly the same time as auditing one file manually.

**Further reading:** [Dynamic workflows](https://code.claude.com/docs/en/workflows) (writing orchestration scripts, `pipeline()` vs `parallel()`, and saving scripts as slash commands)

## 4. Full loop: Opus orchestrates, Haiku works, Opus judges via browser

**What it is:** A self-correcting multi-model loop where each model does what it is best at, and a real browser acts as the verification layer. The whole thing runs in an isolated worktree so the main branch stays clean until you decide to merge.

**The model tiers:**

- **Opus** (orchestrator) — understands the goal, breaks it into scoped subtasks, judges whether results are good enough
- **Haiku** (workers) — each gets one small focused task already defined by Opus; cheap enough to run many in parallel
- **Opus** (judge) — opens a real browser with Playwright, checks the result against the target, decides whether to loop again

Opus only runs twice per iteration: once to plan, once to judge. Haiku runs many times but each call is cheap. The browser verification is what makes the loop reliable: the agent looks at the running app, not its own code.

**When to use it:** any task where the output is visual or interactive and "done" means it looks and works correctly.

> **Bonus tip: worktrees give the session its own isolated branch**
> Starting Claude with `--worktree` creates a fresh git checkout on a new branch. Everything the session does (every file edit, every Haiku worker) stays isolated there. Your main branch is untouched. When you're happy with the result, merge it. If you're not, delete the worktree and nothing is lost.
>
> ```bash
> # creates .claude/worktrees/redesign-frontend/ on a new branch
> claude --worktree redesign-frontend
>
> # Claude generates the name
> claude --worktree
> ```
>
> [Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees)

### Try it

Find a shop website you want to clone the style of. Start a worktree session and give Claude the target URL:

```bash
claude --worktree redesign-frontend
```

Then in Claude:

```
ultracode: Redesign public/index.html to match this site as closely as possible: https://your-target-shop.com

Phase 1 — Analyse (Opus): visit the target URL with Playwright, extract color palette, fonts, layout, navigation, and interactive elements, write a spec to .claude/design-spec.md.

Phase 2 — Implement (Haiku workers, parallel): split public/index.html into sections, one Haiku worker per section, each reads the spec and rewrites its section.

Phase 3 — Judge (Opus + Playwright): start the local server, screenshot localhost and the target side by side, compare layout and behavior, send failing sections back to Haiku with rework instructions.

Repeat phases 2–3 until the page matches or five rounds complete.
```

**Phase 1: Analyse (Opus).** Visits the target URL with Playwright. Extracts color palette, fonts, layout, navigation, interactive elements, and functionality. Writes a spec to `.claude/design-spec.md`.

**Phase 2: Implement (Haiku workers, parallel).** Splits `public/index.html` into sections. One Haiku worker per section, each reading the spec and rewriting its part independently.

**Phase 3: Judge (Opus + Playwright).** Starts the local server. Opens both the local app and the target URL in a browser. Screenshots them side by side. Compares layout, colors, fonts, spacing, and interactive behavior. Sends failing sections back to Haiku with specific rework instructions.

**Phase 4: Loop.** Phases 2–3 repeat until Opus judges the page matches, or five rounds complete.

When done, review the result and merge the worktree branch if you're happy with it. The only prompt you wrote was the target URL.

> **Bonus tip: browser verification is the future of agentic testing**
> Anthropic's own research found that Claude would mark features as complete without actually verifying them end-to-end. Once given browser automation tools and told to test as a human user would, it could identify and fix bugs that weren't obvious from the code alone. The judge phase in this loop is exactly that pattern: an agent that looks at the running app in a real browser, not its own code. Anthropic's engineering team considers this a key direction for agentic software development: specialized testing and QA agents that verify work visually the way a human would.
>
> [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), Anthropic Engineering

## Building your own loops

A loop has three parts:

1. **Trigger:** a time interval, a finished turn, an issue label, an external event
2. **Prompt:** what Claude does or checks each iteration
3. **Stop condition:** you press Esc, a model confirms the condition, or the task completes

The `.claude/loop.md` and `.claude/issue-loop.md` files in the demo repo are starting points. Replace the prompts with your own tasks.

Save ultracode scripts from `/workflows` with `s` and they become slash commands available in any session.

For loops that run when your machine is off, see [routines](https://code.claude.com/docs/en/routines). For agents that communicate with each other in real time, see [agent teams](https://code.claude.com/docs/en/agent-teams).
