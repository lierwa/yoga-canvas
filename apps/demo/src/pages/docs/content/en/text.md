---
title: Text
description: lineHeight / lineClamp / gradients
order: 5
---

# Text

## lineHeight: multiplier vs px

To support both “multiplier line-height” and “design-spec px line-height”, we use a convention:

- `lineHeight < 4`: treated as **multiplier** (px line-height = `fontSize * lineHeight`)
- `lineHeight >= 4`: treated as **px** (px line-height = `lineHeight`)

## lineClamp

Limit the maximum number of visible lines, often used for snippets.

## Example

```tsx
<Text
  text="Multi-line text..."
  style={{
    fontSize: 14,
    lineHeight: 20, // 20px
    lineClamp: 2,
    color: '#ffffff',
  }}
/>
```

