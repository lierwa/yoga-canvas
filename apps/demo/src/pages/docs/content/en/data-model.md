---
title: Data Model
description: NodeDescriptor / NodeTree / ScrollManager
order: 3
---

# Data Model

## NodeDescriptor (declarative)

The layout tree you author (from DSL or JSX conversion).

## NodeTree / CanvasNode (runtime flattened tree)

Used by the engine for layout and rendering:

- `flexStyle`: Yoga layout input
- `visualStyle`: drawing input (background/border/shadow/gradient, etc.)
- `textProps` / `imageProps` / `scrollViewProps`
- `computedLayout`: Yoga output (left/top/width/height)

## ScrollManager (scroll state)

ScrollView scroll offset/contentSize is kept outside NodeTree to keep the tree serializable.

