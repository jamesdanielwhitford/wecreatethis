---
title: Images and media
author: Test Suite
date: 2026-07-24
order: 4
description: Image rendering at different aspect ratios, plus the alt-text and dark-mode cases that are easy to get wrong.
---

# Images and media

The renderer supports markdown image syntax. These are generated test images, checked in next to this post, so the fixture is self-contained and works offline.

## Wide image

Wider than the text column, so it must scale down to fit rather than overflow the page.

![A gradient landscape with a horizon line](/content/test/images-and-media/wide-gradient.png)

## Small image

Narrower than the text column. It should render at its natural size and **not** be stretched up to fill the column.

![A small orange circle on a light background](/content/test/images-and-media/small-square.png)

## Tall image

A portrait image, to check that a very tall image does not run away down the page.

![A tall image of six horizontal blue-grey bands](/content/test/images-and-media/tall-portrait.png)

## Image on a white background

Diagrams exported on a white background are the awkward case in dark mode: the image keeps its white background while the page around it goes dark.

![A diagram of two boxes connected by a line](/content/test/images-and-media/white-diagram.png)

## Inline and linked images

An image inside a list item:

- ![small circle](/content/test/images-and-media/small-square.png)
- A normal list item after it

An image wrapped in a link, which should be clickable:

[![small circle](/content/test/images-and-media/small-square.png)](/test)

## Missing image

A broken path, to confirm a bad image does not break the rest of the render. The alt text should show instead:

![This alt text should be visible because the file does not exist](/content/test/images-and-media/does-not-exist.png)

Text after the broken image, which must still render normally.
