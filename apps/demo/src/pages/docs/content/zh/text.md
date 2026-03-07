---
title: 文本
description: lineHeight / lineClamp / 渐变
order: 5
---

# 文本能力

## lineHeight：倍数 vs px

为了兼容“倍数行高”和“设计稿 px 行高”，这里采用约定：

- `lineHeight < 4`：按 **倍数**（最终像素行高 = `fontSize * lineHeight`）
- `lineHeight >= 4`：按 **px**（最终像素行高 = `lineHeight`）

## lineClamp

限制最大显示行数，常用于摘要文本。

## 示例

```tsx
<Text
  text="多行文本……"
  style={{
    fontSize: 14,
    lineHeight: 20, // 20px
    lineClamp: 2,
    color: '#ffffff',
  }}
/>
```

