---
title: 平台适配
description: H5 vs WX 的差异与建议
order: 8
---

# 平台适配

Yoga Canvas 通过 **Adapter（适配层）** 机制抹平了 H5 与微信小程序等不同运行环境之间的差异。这使得你可以编写一套业务代码，在多个平台上获得完全一致的渲染效果。

---

## 1. 为什么需要适配层？

Canvas 在不同平台上的 API 存在显著差异：
- **图片加载**: H5 使用 `new Image()`，而小程序需要使用 `canvas.createImage()`。
- **文本测量**: H5 可以通过 DOM 或 `ctx.measureText`，小程序则有自己的测量接口。
- **DPI 处理**: 不同屏幕像素密度下，Canvas 的物理尺寸与逻辑尺寸需要精确同步，否则画面会模糊。
- **离屏渲染**: 小程序对离屏 Canvas 的创建方式有严格限制。

---

## 2. 适配器的核心职责

一个标准的 Adapter 需要实现以下接口：

- `createImage()`: 加载网络或本地图片。
- `measureText()`: 在不渲染的情况下预计算文本的宽度。
- `getDevicePixelRatio()`: 获取当前设备的像素密度。
- `requestAnimationFrame()`: 驱动渲染循环。

---

## 3. H5 适配方案

在 Web 环境中，Adapter 利用了成熟的浏览器 API：
- **性能**: 优先使用 `requestAnimationFrame` 保证平滑。
- **文本**: 直接调用 Canvas 2D 的 `measureText`。
- **高清**: 自动检测 `window.devicePixelRatio` 并缩放 Canvas 绘图上下文。

---

## 4. 微信小程序适配方案

小程序环境下的适配最为关键，我们针对其特性做了深度优化：

### 渲染上下文
- 支持小程序的 **Canvas 2D** 接口（新版引擎）。
- 自动处理小程序的 `OffscreenCanvas`，用于后台预渲染或文本测量。

### DPI 适配
由于小程序 Canvas 的物理像素和逻辑像素不一致，适配层会自动执行以下操作：
```js
// 内部逻辑示例
const dpr = wx.getSystemInfoSync().pixelRatio;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);
```

### 图片缓存
小程序环境下重复加载图片会有性能损耗。适配层内置了图片对象缓存池，确保同一资源只被创建一次。

---

## 5. 最佳实践

1. **统一入口**: 始终通过 `@yoga-canvas/react` 的 `YogaCanvas` 组件或 `@yoga-canvas/core` 的 `YogaCanvas` 类进行开发，避免直接调用平台原生 API。
2. **处理异步**: 记住图片加载在所有平台上都是异步的。如果你需要导出 Canvas，请确保 `onImagesLoaded` 或类似的生命周期已触发。
3. **字体一致性**: 在小程序中，如果使用了自定义字体，请确保在测量文本前通过 `wx.loadFontFace` 加载完成。


