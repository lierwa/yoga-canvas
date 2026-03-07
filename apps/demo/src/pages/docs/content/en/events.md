---
title: Events
description: PointerEventDispatcher (capture / bubble)
order: 6
---

# Events (retained-mode)

Core ideas:

- Use hitTest to resolve the target node
- Support capture / bubble phases
- Support stopPropagation

## Conceptual usage

```ts
node.addEventListener('pointerdown', (e) => {
  // e.targetId / e.currentTargetId etc.
});
```

