---
title: Platform Adapters
description: H5 vs WX differences
order: 8
---

# Platform Adapters (H5 / WX)

## H5

- Text measurement can leverage DOM/canvas
- Image loading via `Image()`
- Export supports `toDataURL`

## WX (Mini Program)

- Text measurement is constrained and may rely on estimation
- Image loading relies on Mini Program canvas APIs
- Export uses `canvasToTempFilePath`

Recommendation: keep platform branching inside adapters, not spread across business code.

