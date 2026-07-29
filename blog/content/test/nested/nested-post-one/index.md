---
title: Nested post one
author: Test Suite
date: 2026-07-26
description: A post one level down, used to check that nested section URLs, breadcrumbs, and subsection listings all work.
---

# Nested post one

This post lives at `content/test/nested/nested-post-one/`, so its section path is `test/nested` and its URL is `/blog/test/nested`.

## What to check

- The breadcrumb reads `wecreatethis.com / blog / test / nested`, with `test` clickable and `nested` as the current page
- The parent section page at [/blog/test](/blog/test) lists `nested` and `nested/deeper` above its posts
- This page itself lists `deeper` as a subsection below it

## Links

- [Up to the parent test section](/blog/test)
- [Down to the deeper subsection](/blog/test/nested/deeper)
- [Blog home](/blog/)
