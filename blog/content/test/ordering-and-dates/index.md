---
title: Ordering and dates
author: Test Suite
date: 2026-07-27
order: 3
description: The third post in the section, used to test the reading-order toggle, the scroll stack running to its end, and deep links that land on the last post.
---

# Ordering and dates

This section uses explicit `order` frontmatter (1, 2, 3), so these posts always appear in a fixed sequence regardless of date. The reading-order toggle at the top of the section should reverse them.

## What to check

1. The toggle appears, because this section has more than one post
2. Clicking it reverses the stack and scrolls back to the top
3. The label updates each time it is clicked
4. After reversing, in-page fragment links still land on the right post

## Scroll stack behaviour

Posts lazy-load as they come near the viewport. Scrolling steadily down from the top of the section should load each post before it is reached, with no visible "Loading..." placeholder in normal reading.

The last post in a section has no bottom border and no trailing gap, so the page should end cleanly here.

## Back up

- [First post](#kitchen-sink)
- [Second post](#navigation-modes)
- [Blog home](/blog/)
