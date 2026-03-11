---
title: 文本
description: lineHeight / lineClamp / 渐变
order: 5
---

# 文本能力

Yoga Canvas 提供了强大的文本渲染引擎，支持自动换行、多行截断、丰富的样式配置以及高性能的 Canvas 绘制。

---

## 1. 基础属性

| 属性 | 类型 | 说明 |
| :--- | :--- | :--- |
| `fontSize` | `number` | 字体大小 (px)。 |
| `fontWeight` | `string \| number` | 字重，支持 `normal`, `bold`, `500` 等。 |
| `fontFamily` | `string` | 字体族，默认为 `sans-serif`。 |
| `color` | `string` | 文本颜色，支持 Hex, RGB, RGBA。 |
| `textAlign` | `string` | 对齐方式：`left`, `center`, `right`。 |

---

## 2. 行高 (lineHeight)

为了兼容“倍数行高”和“固定像素行高”，引擎采用以下逻辑进行解析：

- **倍数模式**: 当 `lineHeight < 4` 时，最终像素行高 = `fontSize * lineHeight`。
- **固定像素模式**: 当 `lineHeight >= 4` 时，最终像素行高 = `lineHeight`。

> **提示**: 默认行高为 `fontSize * 1.2`。

---

## 3. 换行与截断

### 自动换行 (whiteSpace)
- `normal` (默认): 文本根据容器宽度自动换行。
- `nowrap`: 文本不换行，超出部分将被隐藏或根据 `lineClamp` 截断。

### 多行截断 (lineClamp)
通过 `lineClamp` 属性可以限制文本显示的最大行数。超出限制的部分会自动添加省略号 `...`。

```tsx
<Text
  content="这是一段非常长的文本，我们希望它在显示两行之后就自动截断并显示省略号。"
  style={{
    fontSize: 14,
    lineHeight: 1.5, // 21px
    lineClamp: 2,    // 限制 2 行
    width: 200,
  }}
/>
```

---

## 4. 进阶视觉效果

### 文本渐变 (Gradients)
文本支持通过 `linearGradient` 属性实现渐变色填充。

```tsx
<Text
  content="渐变文字效果"
  style={{
    fontSize: 24,
    fontWeight: 'bold',
    linearGradient: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colors: [
        { offset: 0, color: '#FF0000' },
        { offset: 1, color: '#0000FF' }
      ]
    }
  }}
/>
```

### 文本阴影 (textShadow)
支持设置文本阴影，提升视觉层级。

- `offsetX`, `offsetY`: 偏移量。
- `blur`: 模糊半径。
- `color`: 阴影颜色。

---

## 5. 性能优化建议

1. **避免频繁变更内容**: 文本测量（Measure）是 Canvas 渲染中较昂贵的操作。如果文本内容频繁变化，建议尽量复用节点。
2. **合理使用 lineClamp**: 引擎内部会对截断后的文本进行缓存，在大列表场景下性能表现优异。
3. **字体预加载**: 在 Canvas 绘制前，请确保所使用的自定义字体已加载完成，否则可能会回退到系统默认字体。


