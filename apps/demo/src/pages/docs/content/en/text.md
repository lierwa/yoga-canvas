---
title: Text
description: lineHeight / lineClamp / gradients
order: 5
---

# Text Capabilities

Yoga Canvas provides a powerful text rendering engine, supporting automatic word wrapping, multi-line truncation, rich style configuration, and high-performance Canvas drawing.

---

## 1. Basic Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `fontSize` | `number` | Font size in px. |
| `fontWeight` | `string \| number` | Font weight, e.g., `normal`, `bold`, `500`, etc. |
| `fontFamily` | `string` | Font family, defaults to `sans-serif`. |
| `color` | `string` | Text color, supports Hex, RGB, RGBA. |
| `textAlign` | `string` | Alignment: `left`, `center`, `right`. |

---

## 2. Line Height (lineHeight)

To support both "multiplier line-height" and "fixed pixel line-height", the engine uses the following logic:

- **Multiplier Mode**: When `lineHeight < 4`, the final line height = `fontSize * lineHeight`.
- **Fixed Pixel Mode**: When `lineHeight >= 4`, the final line height = `lineHeight`.

> **Tip**: Default line height is `fontSize * 1.2`.

---

## 3. Wrapping & Truncation

### Word Wrap (whiteSpace)
- `normal` (default): Text wraps automatically based on container width.
- `nowrap`: Text doesn't wrap; overflow is hidden or truncated based on `lineClamp`.

### Multi-line Truncation (lineClamp)
The `lineClamp` property limits the maximum number of visible lines. Exceeding text will be truncated with an ellipsis `...`.

```tsx
<Text
  content="This is a very long text that we want to automatically truncate and show an ellipsis after displaying two lines."
  style={{
    fontSize: 14,
    lineHeight: 1.5, // 21px
    lineClamp: 2,    // Limit to 2 lines
    width: 200,
  }}
/>
```

---

## 4. Advanced Visual Effects

### Text Gradients
Text supports gradient fills via the `linearGradient` property.

```tsx
<Text
  content="Gradient Text Effect"
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

### Text Shadow (textShadow)
Enhance visual depth with text shadows.

- `offsetX`, `offsetY`: Shadow offset.
- `blur`: Blur radius.
- `color`: Shadow color.

---

## 5. Performance Best Practices

1. **Avoid Frequent Content Changes**: Text measurement is one of the most expensive operations in Canvas rendering. If content changes frequently, try to reuse nodes.
2. **Use lineClamp Wisely**: The engine caches truncated text internally, providing excellent performance in large lists.
3. **Font Preloading**: Ensure custom fonts are fully loaded before rendering to prevent fallback to system defaults.


