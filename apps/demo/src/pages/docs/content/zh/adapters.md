---
title: 平台适配
description: H5 vs WX 的差异与建议
order: 8
---

# 平台适配（H5 / WX）

## H5

- 文本测量可借助 DOM/canvas
- 图片加载可用 `Image()`
- 导出支持 `toDataURL`

## WX（小程序）

- 文本测量能力受限，通常需要估算/折中策略
- 图片加载依赖小程序 canvas API
- 导出为 `canvasToTempFilePath`

建议：业务侧尽量只接触统一的 Adapter 接口，不在业务层散落平台分支。

