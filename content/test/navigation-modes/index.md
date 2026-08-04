---
title: Navigation modes
author: Test Suite
date: 2026-07-28
order: 2
description: Every way of moving around the blog - post fragments within a section, heading anchors, sibling sections, nested subsections, and back to home.
---

# Navigation modes

The blog addresses posts by URL fragment within a section page, so this post exists to test each kind of link from inside rendered content.

## Within this section

These jump between posts in the same scroll stack. The page should not reload, and the target post should end up at the top of the viewport with the posts above it already fully rendered (not still showing "Loading...").

- [Up to the kitchen sink post](#kitchen-sink)
- [Down to the third post](#ordering-and-dates)

## Heading anchors in another post

These target a heading inside a different post in the same section. Both the bare form and the prefixed form should work:

- [Kitchen sink: Tables (prefixed)](#h-tables)
- [Kitchen sink: Code (prefixed)](#h-code)

## Across sections

Full page navigations to other section URLs. Each relies on the `_redirects` wildcard, so these are also the links that break on a plain static server:

- [Nested subsection](/test/nested)
- [Deeply nested subsection](/test/nested/deeper)
- [Dev tools section](/dev-tools)
- [Blog home](/)
- [Main site](/)

## Deep links

Copy these into the address bar to test a cold load that lands mid-stack:

- `/test#ordering-and-dates` should open the section already scrolled to the third post
- `/test#h-tables` should open scrolled to the Tables heading of the first post
- `/test/nested#nested-post-one` should open the nested section at its first post
