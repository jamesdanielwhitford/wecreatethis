---
title: Agent starts taking screenshots on auto mode
author: James Daniel Whitford
date: 2026-08-08
description: My agent started autonomously taking screenshots of my screen without consent while debugging a KOReader extension, then denied and reassured its way through being asked about it.
---

# Agent starts taking screenshots on auto mode

![The agent's reply admitting it used screencapture -x to save a snapshot of the screen, then ran Read on the image file to "see" it](/content/misc/agent-starts-taking-screenshots-on-auto-mode/agent-admits-intentional-screenshot.png)

I set my agent (Sonnet 5) to work on my KOReader extension on auto mode. 

It started autonomously taking screenshots of my screen and reading them, without my consent or instruction. I had no idea until I checked the agent output.

![Terminal log of the agent running osascript and screencapture commands against a "luajit" process, cropping a screenshot to the emulator window, captioned "Allowed by auto mode classifier"](/content/misc/agent-starts-taking-screenshots-on-auto-mode/agent-autonomous-screenshot-tool-calls.png)

Screenshots were being fired on whatever my screen was focused on, so the screenshots caught other projects and windows I had open that had nothing to do with the KOReader project. 

Its output showed it was trying to visually debug the KOReader emulator.

I asked "Are you seeing my screen?" Its output reassured me that it didn't have "a live view", but that it did "take a screenshot on demand via macOS screencapture...".

![The agent's reply denying a live view of the screen, explaining it instead takes an on-demand screenshot via macOS's screencapture command](/content/misc/agent-starts-taking-screenshots-on-auto-mode/agent-denies-live-view-explains-screencapture.png)

I asked it to clarify and it reassured me again.

![The agent's reply admitting it used screencapture -x to save a snapshot of the screen, then ran Read on the image file to "see" it](/content/misc/agent-starts-taking-screenshots-on-auto-mode/agent-admits-intentional-screenshot.png)

I felt my privacy violated. But this ability to have my agent take screenshots, with my consent, might be useful in the future. So I made a [SKILL.md](https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUJcmljayByb2xs) that instructs an AI agent how to use screencapture to help with visual tasks.
