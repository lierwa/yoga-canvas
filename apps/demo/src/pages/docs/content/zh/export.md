---
title: 导出与序列化
description: JSON / DOM / Image
order: 7
---

# 导出与序列化

Yoga Canvas 提供了强大的序列化与导出能力，支持将画布内容转换为多种格式，以满足模板保存、Web 预览及社交分享等场景。

---

## 1. JSON 序列化 (Template)

这是最核心的导出方式。你可以将整个节点树序列化为 JSON 字符串，用于后端存储或模板复用。

- **完整性**: 包含所有节点的 `flexStyle`、`visualStyle` 以及文本/图片内容。
- **可恢复性**: 导出的 JSON 可以通过 `YogaCanvas.loadJSON()` 或 React 的 `NodeDescriptor` 属性重新还原为画布。
- **场景**: 云端模板库、草稿箱、版本管理。

---

## 2. HTML / CSS 导出

Yoga Canvas 内置了将节点树转换为标准 Web 标签的功能。

- **DOM 结构**: 将 `View` 映射为 `div`，`Text` 映射为 `span` 或 `p`。
- **内联样式**: 将 `flexStyle` 转换为标准的 CSS Flexbox 属性。
- **场景**: 邮件模板导出、网页代码生成器、SEO 友好的静态页面。

---

## 3. 图片导出 (Image)

支持将当前画布渲染的结果导出为像素图。

### H5 环境
- **格式**: Base64 (DataURL)。
- **方法**: 调用 `canvas.toDataURL('image/png')`。
- **特点**: 简单快捷，支持设置导出质量。

### 微信小程序
- **格式**: 本地临时路径 (tempFilePath)。
- **方法**: 使用 `wx.canvasToTempFilePath` 接口。
- **特点**: 导出的路径可直接用于 `wx.saveImageToPhotosAlbum` 保存到相册。

---

## 4. 高级导出特性

### 导出分辨率控制
在导出图片时，你可以通过适配层（Adapter）调整渲染比例，从而导出比当前预览区域更清晰的“高清大图”。

### 离屏渲染导出
如果你不需要在屏幕上显示画布，也可以在内存中创建 `OffscreenCanvas`，静默完成布局计算和导出工作。这在小程序后台生成分享图的场景中非常有用。

---

## 5. 常见问题 (FAQ)

**Q: 导出的图片为什么不清晰？**
**A: 请检查导出时的 `devicePixelRatio` 设置。通常建议将导出倍率设置为 2 或 3。

**Q: JSON 导出包含图片数据吗？**
**A: 不包含。JSON 仅存储图片的 URL。在重新加载时，适配层会重新下载图片。如果需要离线存储，建议先将图片转换为 Base64 再存入 JSON。


