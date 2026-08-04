---
title: Navigation modes
author: Test Suite
date: 2026-07-28
order: 2
description: Every way of moving around the blog - post routes within a section, in-page heading anchors, sibling sections, nested subsections, and back to home.
---

# Navigation modes

Every folder is its own route and every post is its own route (`/{section}/{post-slug}`). There is no scroll stack: a post page renders only that post, so this post exists to test each kind of link from inside rendered content.

## Other posts in this section

Each of these is a full page navigation to that post's own URL, not a fragment jump within a shared stack:

- [Kitchen sink](/test/kitchen-sink)
- [Ordering and dates](/test/ordering-and-dates)

## Heading anchors within a post

These only make sense inside the same post: a heading anchor targets an id on the current page, and does not reach into a different post. See the kitchen sink post's own table of contents for that case.

## Across sections

Full page navigations to other section URLs. Each relies on the `_redirects` wildcard, so these are also the links that break on a plain static server:

- [Nested subsection](/test/nested)
- [Deeply nested subsection](/test/nested/deeper)
- [Dev tools section](/dev-tools)
- [Blog home](/)
- [Main site](/)

## Direct links

Copy these into the address bar to test a cold load straight to a route:

- `/test/ordering-and-dates` should open that post directly, standalone
- `/test/kitchen-sink#h-tables` should open that post scrolled to the Tables heading
- `/test/nested/nested-post-one` should open that post at three URL segments deep
