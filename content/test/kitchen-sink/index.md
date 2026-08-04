---
title: Kitchen sink - every markdown feature
author: Test Suite
date: 2026-07-29
order: 1
description: Exercises every construct the renderer supports, so regressions in headings, tables, lists, code, quotes, and inline formatting are visible at a glance.
---

# Kitchen sink - every markdown feature

This post is a rendering test. Every block below should look right. If something renders as raw markdown or runs together with the paragraph next to it, that is the bug.

## Table of contents

These are in-page heading anchors. Clicking one should scroll down without reloading, and the URL should pick up a `#h-...` fragment.

- [Paragraphs and inline formatting](#h-paragraphs-and-inline-formatting)
- [Lists](#h-lists)
- [Tables](#h-tables)
- [Code](#h-code)
- [Blockquotes](#h-blockquotes)
- [Links out of this post](#h-links-out-of-this-post)

## Paragraphs and inline formatting

An ordinary paragraph, with **bold text**, *italic text*, and `inline code` in it. This sentence exists so there is enough text to see whether line height and wrapping behave.

**A paragraph that starts with bold.** This is the exact case that used to break: the line began with a `<strong>` tag and so never got wrapped in a paragraph, which made it collide with whatever came next.

**Another bold-led paragraph immediately after.** These two should be visibly separate blocks with a gap between them, not one run-on wall of text.

*An italic-led paragraph* should behave the same way.

`An inline-code-led paragraph` should also be its own block.

[A link-led paragraph](https://example.com) rounds out the set.

## Lists

Unordered:

- First item
- Second item with **bold** and `code`
- Third item with [a link](https://example.com)

Ordered, which the renderer previously did not support at all:

1. **Trigger:** the first numbered step
2. Second step with `inline code`
3. Third step with [a link](https://example.com)

## Tables

The published loops post uses a table, so this must work:

| Syntax | Behaviour |
|---|---|
| `/loop 5m <prompt>` | Runs every 5 minutes |
| `/loop <prompt>` | Claude chooses the interval dynamically |
| `/loop` | Uses `.claude/loop.md` if it exists |

A wider table, to check horizontal scrolling on narrow screens:

| Column one | Column two | Column three | Column four | Column five |
|---|---|---|---|---|
| value | another value | a longer value here | yet more text | and the last one |
| a | b | c | d | e |

A paragraph directly after a table, which should be a normal paragraph and not get swallowed by the table block.

## Code

An indented-language fence with a URL in it. The URL must **not** be greyed out as a comment from the `//` onward:

```bash
git clone https://github.com/YOUR_USERNAME/claude-code-loops-demo
cd claude-code-loops-demo
npm install
```

A JavaScript fence, where real comments *should* be greyed:

```js
// this is a genuine comment and should be grey
const url = 'https://example.com/not-a-comment';
function add(a, b) {
  return a + b; // trailing comment
}
```

A fence with no language:

```
plain preformatted text
  with indentation preserved
```

## Blockquotes

> A simple blockquote.

> A blockquote with **bold**, `code`, and a [link](https://example.com).
> It also spans two lines.

> ### A heading inside a blockquote
>
> Followed by body text, to check the recursive render.

## Links out of this post

Navigation targets, used by the other test posts:

- [Second test post, same section](/test/navigation-modes)
- [The nested subsection](/test/nested)
- [The dev-tools section](/dev-tools)
- [Blog home](/)
