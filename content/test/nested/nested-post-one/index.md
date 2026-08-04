---
title: Nested post one
author: Test Suite
date: 2026-07-26
description: A post one level down, used to check that nested section URLs, breadcrumbs, and post routes at any depth all work.
---

# Nested post one

This post lives at `content/test/nested/nested-post-one/`, so its section path is `test/nested` and its own URL is `/test/nested/nested-post-one`.

## What to check

- The breadcrumb reads `wecreatethis.com / test / nested`, with `test` clickable and `nested` as the current page (the breadcrumb points at the section, not this post)
- The parent section page at [/test/nested](/test/nested) lists this post, and lists `deeper` as a subsection above them
- The grandparent section page at [/test](/test) lists `nested` and `nested/deeper` as subsections

## Links

- [Up to the parent test section](/test)
- [Down to the deeper subsection](/test/nested/deeper)
- [Blog home](/)
