---
title: Overview
description: What this library does
order: 1
---

# What is Yoga Canvas?

Yoga Canvas is an engine + component system that **computes layout with Yoga (flexbox)** and **renders a View/Text/Image/ScrollView node tree onto Canvas**.

You can use it to:

- Render RN-like layout models on Canvas (H5 / WeChat Mini Program)
- Build visual editing tools (hit-testing, selection highlight, zoom/pan, property tweaking)
- Export JSON / DOM / image

## 3 concepts to remember

1) NodeDescriptor: declarative description (the tree you author)
2) NodeTree/CanvasNode: runtime flattened tree (used for layout/render/hit-test)
3) Adapter: platform abstraction (H5/WX measurement/loading/export differences)

