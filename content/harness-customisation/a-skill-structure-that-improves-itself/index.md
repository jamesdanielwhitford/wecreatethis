---
title: A skill structure that improves itself
author: James Daniel Whitford
date: 2026-08-01
description: Five sections, in order: goal, workflow, tools, files, and a closing instruction to keep all four current. The last section is what makes the first four maintainable by the agent that uses them.
---

# A skill structure that improves itself

Five sections, in order: goal, workflow, tools, files, and a closing instruction to keep all four current. The last section is what makes the first four maintainable by the agent that uses them.

## The skeleton

This is an ordinary skill body with one addition at the end. Each section answers a question the agent would otherwise have to guess at, and the order matters: the goal frames the workflow, the workflow names the tools, and the tools write into the folders.

**01. Goal.** One or two sentences on what a successful run produces, written so a run can be judged against it. Everything after is framed as the current means, not the definition of success.

**02. Workflow.** Numbered steps. Each step names the tool it uses, so the mapping from work to tool is explicit and can be revised one step at a time.

**03. Tools.** A flat list of what the skill calls: bundled scripts, MCP tools by fully-qualified name, and CLIs. One line each on what it is for.

**04. Files and folders.** Where the skill's resources live, where output goes, and when to open each one. This is what keeps detail out of the body until a run actually needs it.

**05. Keeping this current.** The instruction to pursue the goal, and to revise sections 01 to 04 when a run shows they are out of date.

## The template

Adapt the bracketed parts. The final section is reusable as written.

```
---
name: your-skill-name
description: [What it does] + [when to use it,
  with the phrases a user would actually type]
---

# Skill Name

## Goal

[One or two sentences: what a successful run
produces.] The workflow below is the current best
way to reach that, not the definition of success.

## Workflow

1. [Step] — use `scripts/fetch.py`
2. [Step] — use ServerName:tool_name
3. [Step] — write results to `output/`

## Tools

- `scripts/fetch.py` — [what it does]
- ServerName:tool_name — [what it is for]
- [CLI] — [what it is for]

These are current choices, not fixed requirements.

## Files

- `scripts/` — run these; do not read them
- `references/[topic].md` — read when [condition]
- `output/<slug>/` — where results go

## Known issues

[Concrete failure modes seen in real runs, with
the check or fix for each. Empty at first.]

## Keeping this current

Pursue the goal above, not merely the steps. If a
step, tool, or file layout stops serving the goal,
that is a defect in this skill.

When it happens:

1. Diagnose the cause. Distinguish a step that
   failed outright from one that returned
   something plausible but wrong.
2. Fix the cause where it lives — the script, the
   workflow step, the tool choice, or the goal
   itself if the goal was wrong.
3. Re-run to confirm, and check that inputs which
   already worked still work.
4. Record it under Known issues: what was seen,
   why it happened, what changed.
5. Tell the user what changed about the skill.

Prefer replacing a tool over adding a second one
beside it. A skill offering several ways to do one
thing hands over a decision instead of an
instruction.

Keep this file to what is true on every run. When
a section is only sometimes relevant, or has grown
into an archive, move it to `references/` and
leave a pointer saying when to read it.
```

## Keep the body thin, put the detail in files

The skill file is read into context every time the skill runs. Bundled files are not — they cost nothing until the agent opens one, and scripts cost nothing at all when executed rather than read. That asymmetry is the whole reason the Files section exists, and it is what lets a skill carry far more knowledge than it could ever fit in its body.

So the body should hold what is true on every run, and files should hold what is true on some runs.

| Belongs in the body | Belongs in a file |
| --- | --- |
| The goal | Long reference material, API details, schemas |
| The workflow steps | A branch of the workflow used only in some cases |
| Which tool each step uses | The implementation behind a tool |
| Where things live | Output, logs, and anything a run produces |
| Issues that affect every run | An accumulated history of past failures |

A pointer only works if it says *when* to follow it. A bare link gets read at the wrong time or not at all, so give each one a condition:

```
## Files

- `scripts/fetch.py` — run this to retrieve a page
- `references/selectors.md` — read when a page
  extracts as empty or truncated
- `references/api.md` — read before writing a
  query, not before every run
- `output/<slug>/` — where results go
```

Two details make the difference between a file that gets used and one that does not:

- **Say whether to run it or read it.** "Run `fetch.py` to retrieve the page" and "see `fetch.py` for the extraction logic" send the agent down different paths. Executing is usually what you want, since only the output enters context.
- **Keep every file one hop from the skill body.** A file that is only reachable through another file tends to get skimmed rather than read, so the detail at the end of the chain never arrives. Link them all directly.

Growth is the normal outcome of a skill that learns, and the body is the one place that cannot absorb it. When a section stops being true on every run — a long list of past failures, a branch that fires occasionally — moving it into a file is itself a fix worth making and recording.

## Why these five

Each section exists because the agent otherwise reconstructs it, differently, on every run.

| Section | What it prevents |
| --- | --- |
| Goal | An unanticipated case becoming undefined behavior. With the outcome stated, a situation the steps do not cover is something the agent can reason about instead of guess at. |
| Workflow | Skipped steps and premature completion. Naming the tool per step also means a tool can be swapped without rewriting the procedure around it. |
| Tools | Silent substitution. A flat list makes the current choices visible, so replacing one is an edit rather than a rediscovery. Give MCP tools their full `Server:tool` name, or they may not be found. |
| Files | Output scattering across runs. One statement of where things live is what lets a later run find what an earlier one produced. |
| Known issues | Rediscovering the same wall. This is where a failure becomes durable knowledge instead of a fact that expires with the session. |

An agent will not revise a skill it was not told it may revise. Without an explicit instruction it does the locally sensible thing when it hits a wall, which is to work around it and finish the task. That is the behavior that keeps the wall standing.

## Where the record goes

Keep accumulated failures in a **Known issues section inside the skill file**, as short concrete entries: the symptom, and the check that catches it. This is the documented home for hard-won edge cases, and one practitioner guide calls it the most valuable content of a mature skill.

```
## Known issues

- Scanned PDFs return `[]` silently. Check the page
  type before trusting an empty result.
- Structured pages (pricing tables, spec grids)
  extract as near-empty. Thin output is not proof
  the page was unreachable.
```

Keep in the body only the issues that affect a typical run. Once the list becomes a history rather than a set of live warnings, move it to `references/known-issues.md` and leave a pointer saying when to read it — the same trade covered above.

Libraries update and APIs change. A stale entry sends the agent chasing a problem that no longer exists, so date them and retire ones that stop reproducing. Growth is not the goal; accuracy is.

## What to watch for

A skill that edits itself can degrade itself. These are the failure modes worth designing against.

| Symptom | Likely cause and fix |
| --- | --- |
| Entries grow, quality does not | Failures are being recorded without fixes. Require each entry to name the change it caused. |
| Fixes that solve one input | The change was fitted to the case that prompted it. Verify against inputs that already worked, and prefer a rule over a special case. |
| Silent partial success | A step returned something plausible but incomplete, so nothing reported failure. Check that output is *most* of what was expected, not merely non-empty. |
| Body outgrows its budget | Accumulated notes are crowding the instructions. Move detail to `references/` and keep the body pointing at it. |
| Instructions drift from scripts | A script changed and the workflow did not. Update both, and state the rule where it affects the procedure. |

Confirm an improvement is one. Run the same task against the previous version and compare, keeping a small fixed set of inputs the skill is expected to handle. A change that passes only the case that prompted it has not been shown to help.

## Adding it to an existing skill

1. Give the body the five headings, moving existing content under Workflow.
2. Write the goal sentence. If it is hard to write, the skill may be doing two jobs.
3. List the tools the workflow already names, and mark them as current choices.
4. State where output goes, if the skill produces any.
5. Paste the closing section as written, and leave Known issues empty.
6. Run the skill on a task you know it handles, and confirm nothing changed.

That last step matters. The structure should be inert on a run where nothing goes wrong. If adding it changes a working run, the goal sentence is likely describing something narrower or broader than what the skill actually does.

---

Structure and section order follow Anthropic's skill authoring guidance: the [best practices guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), the [Claude Code skills reference](https://code.claude.com/docs/en/skills), the [Agent Skills engineering post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), and Anthropic's own [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md).

Sections 01 to 04 and the Known issues pattern are documented practice. The closing section is not: those sources describe iteration driven by a person between sessions, and treat skills revising themselves during a run as a stated direction rather than an established practice.
