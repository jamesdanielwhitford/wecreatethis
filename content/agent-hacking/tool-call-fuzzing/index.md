---
title: Fuzzing tool call arguments to find schema blind spots
author: James Daniel Whitford
date: 2026-08-10
description: Feeding malformed and boundary-case arguments into tool definitions to see where validation quietly gives up.
slug: tool-call-fuzzing
tags: agent-hacking
---

# Fuzzing tool call arguments to find schema blind spots

Test post for navigation - not real content.

Wrote a small harness that takes a tool's JSON schema and generates adversarial inputs: numbers past int32, strings with embedded null bytes, arrays where objects were expected, and deeply nested objects well past any sane depth limit.

## Findings so far

A few tool runners silently coerced types instead of rejecting the call outright, which meant a "quantity" field that should have been an integer happily accepted a string and passed it straight through to a downstream function. Not a security bug on its own, but exactly the kind of gap a more deliberate attack would look for first.

More to come.
