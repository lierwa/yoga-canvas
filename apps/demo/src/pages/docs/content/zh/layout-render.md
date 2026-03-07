---
title: 布局与渲染链路
description: 从 descriptor 到画面
order: 4
---

# 布局与渲染链路

## 典型流程

1) descriptor → NodeTree（build）
2) Yoga 计算 flex → computedLayout（layout）
3) 计算 ScrollView 内容尺寸（scroll）
4) painters 逐节点绘制到 Canvas（render）

## 渲染能力（示例清单）

- 背景：纯色 / 线性渐变 / 径向渐变
- 边框/圆角
- 阴影（boxShadow）
- 文本：换行、对齐、lineHeight、lineClamp、文本渐变
- 图片：cover/contain/fill

