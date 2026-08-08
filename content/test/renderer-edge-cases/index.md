---
title: Renderer edge cases - indentation and whitespace
author: Test Suite
date: 2026-08-07
order: 2
description: Leading-space and indentation variants of every block type. Each case should render like its kitchen-sink equivalent; if it renders as raw text in a paragraph instead, that is the bug.
---

# Renderer edge cases - indentation and whitespace

Companion to the kitchen sink post. Every example below is a real block (list, heading,
blockquote, code fence, table) written with a leading space or two, the way an editor's
auto-indent or a copy-paste from another list often produces. Each one should render exactly
like its unindented equivalent. If instead you see the raw `-`, `#`, `>`, or `` ``` `` characters
sitting inside a plain, dimmed paragraph, that block fell through to the paragraph pass and the
bug is back.

## Unordered list with a leading space

This is the exact shape that broke the homepage link list:

 - First item, one leading space
 - Second item with **bold** and `code`
 - [A link](https://example.com)

## `*` and `+` bullets

Markdown allows all three bullet characters. Each should render as its own list:

* Star bullet one
* Star bullet two

+ Plus bullet one
+ Plus bullet two

## Ordered list with a leading space

 1. First step, one leading space
 2. Second step with `inline code`
 3. Third step with [a link](https://example.com)

## Nested list

A sub-item indented two spaces under a top-level item. At minimum this must not leak as raw
unwrapped text outside the list, even if it renders flat rather than truly nested:

- Top-level item
  - Nested item, two-space indent
- Second top-level item

## Heading with a leading space

The line below is a real `##` heading with one leading space in the source:

 ## Indented heading

If this rendered correctly, the line above is a heading (larger, bold) and this sentence is a
normal paragraph directly after it, with a working `#h-indented-heading` anchor.

## Blockquote with a leading space

 > A blockquote with one leading space before the `>`.
 > A second line of the same quote, also indented.

## Code fence with a leading space

 ```
 indented fence marker
 ```

## Table with leading spaces

 | Column one | Column two |
 |---|---|
 | value | another value |

## CRLF line endings

The list below is authored with Windows-style CRLF line endings in the source file. It should
render as one list, not split into several, and no item should show a trailing invisible
character:

- CRLF item one
- CRLF item two
- CRLF item three
