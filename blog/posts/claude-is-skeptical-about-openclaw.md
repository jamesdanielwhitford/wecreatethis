---
title: Claude is skeptical about Openclaw
author: James Daniel Whitford
date: 2026-04-19
description: I asked Claude Code to research Openclaw. It spawned a subagent, got back detailed results, and then flagged them as unreliable and hallucinated before I could read them.
---

# Claude is skeptical about Openclaw

I asked Claude Code to research Openclaw. It spawned a subagent, got back detailed results, and then flagged them as unreliable and/or hallucinated before I could read them.

**TL;DR:** 

Claude isn't trained on openclaw data due to its [knowledge cutoff](https://www.anthropic.com/transparency), but this is the first time I have been asked to look at research myself to verify it isn't hallucinated or unreliable. 

I am not making any claims about Anthropic training their models to perform worse when dealing with information about competitors...

But I am worried about this behaviour of flagging certain sources as unreliable for what seem like arbitrary reasons.

## Claude has never heard of openclaw

This makes sense: Claude's [training data has a cutoff of early 2025](https://www.anthropic.com/transparency), and openclaw wasn't released until 2026.

![User asks "what about openclaw", Claude replies it is not familiar with the tool and asks for a link or more context](/blog/images/1-not-familiar-with-openclaw.png)

[message 7](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0007)

---

## Claude flags research about openclaw as unreliable and/or hallucinated

When I asked it to research openclaw, Claude Code spawned a subagent to search the web. The agent returned with confident, detailed results, but the orchestrator immediately identified several of them as unreliable and/or hallucinated.

![User says "research it", Claude Code spawns a research agent which returns detailed results about openclaw including 68k GitHub stars and a backstory about a rename from Clawdbot](/blog/images/2-research-it.png)

[message 9](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0009)

The orchestrator immediately flagged the results as unreliable before I had a chance to read them.

```
I want to flag that the research results look unreliable. Several details seem fabricated
(68k GitHub stars, the backstory about "Clawdbot", Peter Steinberger joining OpenAI).
I'd treat those specifics with skepticism.

Could you share where you heard about "openclaw"?
```

[full response — message 12](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0012)

### The agent response did not flag any unreliability

But the agent itself had no such reservations. It returned the results without any warning of unreliable sources or hallucinations.

```
OpenClaw is a free, open-source personal AI assistant and autonomous agent platform created
by Peter Steinberger (PSPDFKit founder). It runs locally on your machine and acts as a
gateway between messaging platforms and AI models.

- Integrates with WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and 15+ others
- Supports 50+ integrations with chat providers, AI models, productivity tools
- Native Ollama integration via /api/chat
- 68,000+ GitHub stars
- Originally called "Clawdbot", renamed to "OpenClaw" in early 2026 following trademark
  concerns from Anthropic. Peter Steinberger has since joined OpenAI.

...
```

[full response — message 11](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0011)

---

## Claude flags the clawdbot research as unreliable too

Next, I asked it to research clawdbot, the earlier name for openclaw. The same pattern repeated.

![Claude Code terminal showing "research clawdbot" prompt, with the agent returning structured results about clawdbot and Claude again expressing skepticism about the reliability of the results](/blog/images/3-human-check-hallucination.png)

[message 13](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0013)

Claude flagged the results again, this time asking me to verify the GitHub URLs directly.

```
I'm skeptical of these results again. The agent is returning very consistent, well-structured
information but I can't verify the GitHub URLs or official sites are real without you
checking them directly.

Can you try visiting github.com/clawdbot/clawdbot yourself and let me know if it exists?
Where did you originally hear about this?
```

[full response — message 16](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0016)

### The clawdbot agent response was equally confident and unflagged

Again, the agent had returned its results without flagging any information as unreliable.

```
Clawdbot is an open-source, self-hosted personal AI assistant that actually executes tasks
on your machine (sometimes called "Claude with hands"). It's not directly related to Claude
Code, but it's designed to work with Claude via the Anthropic API or other LLM backends.
The project has also been rebranded/evolved as OpenClaw and MoltBot.

Key Capabilities:
- Runs locally on macOS, Linux, Windows via Docker
- Connects to WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, and WebChat
- Executes real automation tasks: emails, scheduling, smart home, terminal commands
- 50+ platform integrations, voice capabilities, "Live Canvas" workspace

...
```

[full response — message 15](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0015)

---

## Claude asks me to verify the sources myself before trusting them

I asked Claude to list the sources it was flagging as potentially hallucinated so I could check them myself.

![Claude Code terminal showing the user asking Claude to list the sources so they can verify them, and Claude listing all the URLs from the agent results](/blog/images/5-list-sources-to-verify.png)

[message 17](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-002.html#msg-0017)

---

## Telling Claude the sources are trustworthy is enough to drop the skepticism

I told Claude explicitly that the sources were trustworthy, and it accepted them without further question.

![Claude Code terminal showing the user saying "those are all trustworthy sources" and Claude accepting the results, dropping its skepticism, and moving on to answer the original customization question](/blog/images/6-trustworthy-good-to-know.png)

[message 19](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-002.html#msg-0019)

---

## Once satisfied, Claude answers the original question without hesitation

Claude then moved on to answer the original question about customizing openclaw's appearance.

![Claude Code terminal showing the agent researching openclaw appearance customization and returning detailed results about the CSS variable system and built-in themes](/blog/images/7-finally-does-task.png)

[message 24](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-002.html#msg-0024)

---

## Full transcript

[Full transcript](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/index.html)

![Full Claude Code session page 1, showing the appearance customization questions and the first openclaw exchange](/blog/images/1-full.png)

[message 0](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0000)

![Full Claude Code session page 2, showing the "research it" prompt, the hallucinated agent results, and Claude flagging them as unreliable](/blog/images/2-full.png)

[message 7](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-001.html#msg-0007)

![Full Claude Code session page 3, showing the clawdbot research, source verification, and final customization answer](/blog/images/3-full.png)

[message 17](https://gisthost.github.io/?00cd00ab9b383b6a8d8fa54ca2e6e2a7/page-002.html#msg-0017)
