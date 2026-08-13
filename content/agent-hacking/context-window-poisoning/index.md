---
title: Context window poisoning across tool results
author: James Daniel Whitford
date: 2026-08-11
description: Smuggling instructions into a multi-step agent run via a tool result several turns before the payload was meant to matter.
slug: context-window-poisoning
tags: agent-hacking
---

# Context window poisoning across tool results

Test post for navigation - not real content.

Rather than injecting into the very next turn, this test buried an instruction in a tool result early in a long research task, betting that by the time the agent reached a decision point ten turns later, the injected text would just read as established context rather than something to scrutinise.

## Why it's harder to catch

Most defenses look for injected instructions near the point of action. Planting the payload early and letting the agent's own summarisation carry it forward turned out to be a much quieter path - by the time it mattered, the "instruction" looked like something the agent itself had concluded a few turns back.

More to come.
