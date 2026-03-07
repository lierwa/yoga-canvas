---
title: 概览
description: 这个库能做什么
order: 1
---

# Yoga Canvas 是什么？

Yoga Canvas 是一个 **用 Yoga（flexbox）做布局计算**，并把 **View/Text/Image/ScrollView 节点树渲染到 Canvas** 的引擎与组件库。

你可以用它：

- 把“类似 RN 的布局模型”画在 Canvas 上（H5 / 微信小程序）
- 做可视化编辑（命中测试、选中高亮、缩放平移、属性调参）
- 导出 JSON / DOM / 图片

## 你会用到的 3 个概念

1) NodeDescriptor：声明式描述（你写的“树”）
2) NodeTree/CanvasNode：运行时扁平树（引擎内部用于布局/渲染/命中测试）
3) Adapter：平台差异封装（H5/WX 的测量/加载/导出差异）

