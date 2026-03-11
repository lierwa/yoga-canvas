---
title: Export & Serialization
description: JSON / DOM / Image
order: 7
---

# Export & Serialization

Yoga Canvas provides robust serialization and export capabilities, allowing you to convert Canvas content into multiple formats to meet needs like template saving, Web previewing, and social sharing.

---

## 1. JSON Serialization (Template)

This is the core export method. You can serialize the entire node tree into a JSON string for backend storage or template reuse.

- **Completeness**: Includes `flexStyle`, `visualStyle`, and all text/image content for every node.
- **Restorability**: Exported JSON can be reloaded via `YogaCanvas.loadJSON()` or the React `NodeDescriptor` prop.
- **Use Cases**: Cloud template libraries, draft boxes, version management.

---

## 2. HTML / CSS Export

Yoga Canvas includes a built-in function to transform the node tree into standard Web tags.

- **DOM Structure**: Maps `View` to `div` and `Text` to `span` or `p`.
- **Inline Styles**: Translates `flexStyle` into standard CSS Flexbox properties.
- **Use Cases**: Email template export, web code generators, SEO-friendly static pages.

---

## 3. Image Export

Supports exporting the current Canvas rendering result as a bitmap image.

### H5 Environment
- **Format**: Base64 (DataURL).
- **Method**: Calls `canvas.toDataURL('image/png')`.
- **Features**: Fast and simple, supports quality settings.

### WeChat Mini Program
- **Format**: Local temporary file path (tempFilePath).
- **Method**: Uses the `wx.canvasToTempFilePath` API.
- **Features**: The exported path can be used directly with `wx.saveImageToPhotosAlbum`.

---

## 4. Advanced Export Features

### Resolution Control
During image export, you can adjust the rendering scale via the Adapter to export high-definition "big pictures" that are clearer than the current preview area.

### Offscreen Rendering Export
If you don't need to display the Canvas on screen, you can create an `OffscreenCanvas` in memory to perform layout calculations and exports silently. This is highly useful for generating share images in the Mini Program background.

---

## 5. FAQ

**Q: Why is my exported image blurry?**
**A: Check the `devicePixelRatio` setting during export. We generally recommend an export scale of 2 or 3.

**Q: Does the JSON export include image data?**
**A: No. JSON only stores the image URL. Upon reloading, the Adapter will re-download the image. For offline storage, consider converting images to Base64 before adding them to the JSON.


