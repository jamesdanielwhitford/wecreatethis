---
title: Deep post
author: Test Suite
date: 2026-07-25
description: Three levels deep, to confirm section nesting has no depth limit and the breadcrumb keeps every ancestor linkable.
---

# Deep post

Section path `test/nested/deeper`, reached at `/blog/test/nested/deeper`. This is the deepest test content, confirming the `/blog/*` wildcard handles any depth.

## What to check

- The breadcrumb reads `wecreatethis.com / blog / test / nested / deeper`
- Every ancestor segment is a working link
- This section has only one post, so the reading-order toggle should be hidden

## Links back up

- [Parent: nested](/blog/test/nested)
- [Grandparent: test](/blog/test)
- [Blog home](/blog/)
