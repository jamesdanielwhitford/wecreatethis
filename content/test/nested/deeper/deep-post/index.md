---
title: Deep post
author: Test Suite
date: 2026-07-25
description: Three section levels deep, to confirm section nesting has no depth limit, the breadcrumb keeps every ancestor linkable, and post-route parsing still resolves the last segment as a post at any depth.
---

# Deep post

Section path `test/nested/deeper`, listed at `/test/nested/deeper`. This post's own URL is one level deeper still: `/test/nested/deeper/deep-post`, four path segments in total. This is the deepest test content, confirming the routing correctly splits an arbitrarily long path into "everything but the last segment is the section" and "the last segment is the post slug."

## What to check

- The breadcrumb on this post's page reads `wecreatethis.com / test / nested / deeper`
- Every ancestor segment is a working link
- The section page at `/test/nested/deeper` lists this post as its only entry

## Links back up

- [Parent: nested](/test/nested)
- [Grandparent: test](/test)
- [Blog home](/)
