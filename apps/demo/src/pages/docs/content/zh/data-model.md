---
title: 数据模型
description: NodeDescriptor / NodeTree / ScrollManager
order: 3
---

# 数据模型

## NodeDescriptor（声明式描述）

你写的布局树（来自 DSL 或 JSX 转换）。

## NodeTree / CanvasNode（运行时扁平树）

引擎内部用于布局/渲染的结构，包含：

- `flexStyle`：Yoga 布局输入
- `visualStyle`：背景/边框/阴影/渐变等绘制输入
- `textProps` / `imageProps` / `scrollViewProps`
- `computedLayout`：Yoga 布局输出（left/top/width/height）

## ScrollManager（滚动状态）

ScrollView 的滚动 offset/contentSize 与树分离，保证树可序列化（方便存储/导出/协作）。

