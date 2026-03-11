---
title: 事件系统
description: PointerEventDispatcher（capture / bubble）
order: 6
---

# 事件系统

Yoga Canvas 实现了一套完整的、符合 Web 标准的**保留模式（Retained Mode）**事件分发系统。你可以像在 DOM 中一样，为 Canvas 节点绑定点击、滑动等交互事件。

---

## 1. 核心原理

不同于传统的 Canvas 立即模式绘制，Yoga Canvas 维护了一棵运行时节点树。当用户在 Canvas 上进行交互时，引擎会执行以下流程：

1. **命中测试 (Hit Testing)**: 引擎根据坐标遍历节点树，找到最深层的叶子节点。
2. **事件分发 (Dispatching)**: 通过 `PointerEventDispatcher` 管理事件流。
3. **传播机制 (Propagation)**: 完整支持捕获（Capture）和冒泡（Bubble）两个阶段。

---

## 2. 传播阶段

1. **捕获阶段 (Capture Phase)**: 从根节点向下传播到目标节点。
2. **目标阶段 (Target Phase)**: 在目标节点上触发事件。
3. **冒泡阶段 (Bubble Phase)**: 从目标节点向上回传到根节点。

> 你可以通过 `e.stopPropagation()` 在任何阶段停止事件的继续传播。

---

## 3. 支持的事件类型

| 事件名 | 说明 |
| :--- | :--- |
| `pointerdown` | 手指/鼠标按下。 |
| `pointermove` | 手指/鼠标移动。 |
| `pointerup` | 手指/鼠标抬起。 |
| `pointertap` | 点击事件（通过按下和抬起的时空距离自动判定）。 |
| `scroll` | `ScrollView` 节点独有的滚动事件，包含 `scrollLeft` 和 `scrollTop`。 |

---

## 4. 事件对象 (Event Object)

回调函数接收到的事件对象包含以下核心属性：

- `type`: 事件类型名。
- `targetId`: 触发事件的最深层节点 ID。
- `currentTargetId`: 当前正在处理事件的节点 ID。
- `x`, `y`: 相对于 Canvas 左上角的坐标。
- `nativeEvent`: 原始的 DOM 或小程序事件对象。
- `stopPropagation()`: 调用此方法可阻止事件继续传播。

---

## 5. 使用示例

### 在 JSX 中使用
在 `@yoga-canvas/react` 中，你可以直接通过 props 绑定事件：

```tsx
<View
  style={{ width: 100, height: 100, backgroundColor: 'blue' }}
  onPointerTap={(e) => {
    console.log('点击了蓝色方块', e.targetId);
  }}
>
  <Text content="点击我" />
</View>
```

### 阻止冒泡
```tsx
<View onPointerTap={() => console.log('父节点收到点击')}>
  <View
    onPointerTap={(e) => {
      e.stopPropagation(); // 阻止事件传给父节点
      console.log('子节点收到点击');
    }}
  />
</View>
```

---

## 6. 命中测试策略

- **透明度**: `opacity: 0` 的节点依然可以接收事件，除非设置了特定的指针忽略属性。
- **溢出隐藏**: 即使节点在 `overflow: hidden` 容器之外，只要它在 Canvas 范围内且未被裁剪，依然能被命中。
- **层级**: `zIndex` 会影响命中测试的顺序，层级越高的节点越先被判定。


