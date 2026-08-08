---
title: Agent starts taking screenshots on auto mode
author: James Daniel Whitford
date: 2026-08-08
description: My agent started autonomously taking screenshots of my screen without consent while debugging a KOReader extension, then denied and reassured its way through being asked about it.
---

# Agent starts taking screenshots on auto mode

![The agent's reply admitting it used screencapture -x to save a snapshot of the screen, then ran Read on the image file to "see" it](/content/misc/agent-screenshots/agent-admits-intentional-screenshot.png)

I set my agent to work on my KOReader extension on auto mode.

It started autonomously taking screenshots of whatever was on my screen, and reading the content of the screenshot, wihtout my consent or instruction.

I had no idea it was taking screenshots until I checked the agent output.

![Terminal log of the agent running osascript and screencapture commands against a "luajit" process, cropping a screenshot to the emulator window, captioned "Allowed by auto mode classifier"](/content/misc/agent-screenshots/agent-autonomous-screenshot-tool-calls.png)

It seemed to be doing this in an attempt to visually debug on a KOReader emulator.

I ask "Are you seeing my screen". The output reassures me that it didn't have "a live view", but that it did however "take a screenshot on demand with MacOs screencapture...".

![The agent's reply denying a live view of the screen, explaining it instead takes an on-demand screenshot via macOS's screencapture command](/content/misc/agent-screenshots/agent-denies-live-view-explains-screencapture.png)

I ask it to clarify and it tries to reassure me again.

![The agent's reply again admitting it used screencapture -x to save a snapshot of the screen, then ran Read on the image file to "see" it](/content/misc/agent-screenshots/agent-admits-intentional-screenshot.png)

I felt my privacy violated, but then I thought about it, and this ability to have my agent take screenshots with my consent might be useful in the future. So I made a [SKILL.md](https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUJcmljayByb2xs) that instructs an AI agent how to use screencapture to help with visual tasks.
