---
title: Ordering and dates
author: Test Suite
date: 2026-07-27
order: 3
description: The third post in the section by explicit order, used to check the section table of contents sorts correctly and that this standalone post page renders on its own route.
---

# Ordering and dates

This section uses explicit `order` frontmatter (1, 2, 3) on its posts, so the [section table of contents](/test) always lists them in that fixed sequence regardless of date.

## What to check

- On `/test`, this post is listed third, after Kitchen Sink and Navigation Modes
- This page itself is a standalone route (`/test/ordering-and-dates`) with only this one post in the DOM: no adjacent post loads, and there is nothing to scroll into

## Back up

- [First post](/test/kitchen-sink)
- [Second post](/test/navigation-modes)
- [Blog home](/)
