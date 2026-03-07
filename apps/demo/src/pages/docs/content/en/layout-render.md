---
title: Layout & Render Pipeline
description: From descriptor to pixels
order: 4
---

# Layout & Render Pipeline

## Typical flow

1) descriptor → NodeTree (build)
2) Yoga computes flex → computedLayout (layout)
3) Compute ScrollView content sizes (scroll)
4) Painters draw nodes onto Canvas (render)

## Rendering capabilities (quick list)

- Background: solid / linear gradient / radial gradient
- Border / radius
- Shadow (boxShadow)
- Text: wrapping, align, lineHeight, lineClamp, gradient text
- Image: cover/contain/fill

