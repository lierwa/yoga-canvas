---
title: Platform Adapters
description: H5 vs WX differences
order: 8
---

# Platform Abstraction

Yoga Canvas uses an **Adapter** mechanism to bridge the differences between various runtime environments like H5 and WeChat Mini Programs. This allows you to write a single set of business logic and achieve perfectly consistent rendering across multiple platforms.

---

## 1. Why Need an Adapter?

Canvas APIs vary significantly across platforms:
- **Image Loading**: H5 uses `new Image()`, whereas Mini Programs require `canvas.createImage()`.
- **Text Measurement**: H5 relies on DOM or `ctx.measureText`, while Mini Programs have their own measurement interfaces.
- **DPI Handling**: Physical and logical dimensions of a Canvas must be precisely synchronized for different screen pixel densities to avoid blurriness.
- **Offscreen Rendering**: Mini Programs have strict limitations on how Offscreen Canvases are created.

---

## 2. Core Responsibilities of an Adapter

A standard Adapter must implement the following interfaces:

- `createImage()`: Loads remote or local images.
- `measureText()`: Pre-calculates text width without rendering.
- `getDevicePixelRatio()`: Retrieves the current device's pixel ratio.
- `requestAnimationFrame()`: Drives the rendering loop.

---

## 3. H5 Adaptation Strategy

In Web environments, the Adapter leverages mature browser APIs:
- **Performance**: Prioritizes `requestAnimationFrame` for smooth transitions.
- **Text**: Calls Canvas 2D's `measureText` directly.
- **High-DPI**: Automatically detects `window.devicePixelRatio` and scales the Canvas drawing context.

---

## 4. WeChat Mini Program Adaptation Strategy

Adaptation for Mini Programs is critical, and we've implemented deep optimizations for its unique characteristics:

### Rendering Context
- Supports the **Canvas 2D** interface (the modern engine).
- Automatically handles the `OffscreenCanvas` for background pre-rendering or text measurement.

### DPI Adaptation
Since the physical and logical pixels of a Mini Program Canvas often mismatch, the adapter performs the following automatically:
```js
// Internal logic example
const dpr = wx.getSystemInfoSync().pixelRatio;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);
```

### Image Caching
Repeatedly loading images in a Mini Program environment can cause performance bottlenecks. The adapter includes a built-in image object cache to ensure each resource is only created once.

---

## 5. Best Practices

1. **Unified Entry**: Always develop using the `YogaCanvas` component from `@yoga-canvas/react` or the `YogaCanvas` class from `@yoga-canvas/core` to avoid calling platform-native APIs directly.
2. **Handle Asynchrony**: Remember that image loading is asynchronous on all platforms. If you need to export the Canvas, ensure the `onImagesLoaded` or similar lifecycle events have triggered.
3. **Font Consistency**: In Mini Programs, ensure custom fonts are fully loaded via `wx.loadFontFace` before performing text measurement.

