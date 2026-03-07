---
title: 事件系统
description: PointerEventDispatcher（capture / bubble）
order: 6
---

# 事件系统（retained-mode）

核心能力：

- 通过 hitTest 找到事件目标节点
- 支持 capture / bubble 两阶段传播
- 支持 stopPropagation

## 使用方式（概念示例）

```ts
node.addEventListener('pointerdown', (e) => {
  // e.targetId / e.currentTargetId 等
});
```

