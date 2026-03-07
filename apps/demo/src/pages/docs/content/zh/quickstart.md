---
title: 快速开始
description: 最小可运行示例
order: 2
---

# 快速开始（React）

## 安装

```bash
pnpm add @yoga-canvas/core @yoga-canvas/react
```

## 最小示例

```tsx
import { YogaCanvas, View, Text } from '@yoga-canvas/react';

export function MyCanvas() {
  return (
    <div style={{ width: 375, height: 240 }}>
      <YogaCanvas width={375} height={240}>
        <View style={{ width: 375, height: 240, padding: 16, backgroundColor: '#050816' }}>
          <Text
            text="Hello Yoga Canvas"
            style={{ fontSize: 18, color: '#ffffff', lineHeight: 1.4 }}
          />
        </View>
      </YogaCanvas>
    </div>
  );
}
```

## JSX 模式说明

- `View/Text/...` 是“标记组件”，本身不渲染 DOM
- `YogaCanvas` 内部会把 JSX 转成 NodeDescriptor，然后交给 core 做布局与绘制

