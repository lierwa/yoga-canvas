---
title: 快速开始
description: 最小可运行示例
order: 2
---

# 快速开始

Yoga Canvas 提供了多种使用方式，以适配不同的开发场景。

## 安装

```bash
pnpm add @yoga-canvas/core @yoga-canvas/react
```

---

## 1. React (JSX) 模式

这是最推荐的使用方式，通过 React 组件声明式地构建画布内容。

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

### 模式说明
- `View/Text/...` 是“标记组件”，本身不渲染 DOM。
- `YogaCanvas` 内部会把 JSX 转成 `NodeDescriptor` 树，然后交给 core 引擎做布局与绘制。

---

## 2. 纯 JS (API) 模式

如果你不使用 React，或者需要在纯逻辑环境（如 Node.js 生成图片或原生 JS 环境）下使用，可以直接调用 `@yoga-canvas/core` 的 API。

```ts
import { YogaCanvas, View, Text } from '@yoga-canvas/core';

async function initCanvas() {
  const canvas = document.getElementById('myCanvas');
  
  // 1. 定义布局描述符 (NodeDescriptor)
  const layout = View({
    style: { width: 375, height: 240, padding: 20, backgroundColor: '#000' },
    children: [
      Text({
        content: 'Hello from Core API',
        style: { color: '#fff', fontSize: 20 }
      })
    ]
  });

  // 2. 初始化引擎
  const engine = new YogaCanvas(canvas, layout, {
    width: 375,
    height: 240,
    pixelRatio: window.devicePixelRatio
  });

  // 3. 启动并渲染
  await engine.init();
  engine.render();
}
```

---

## 3. JSON 模式

Yoga Canvas 支持完全从 JSON 数据加载布局，这对于远程下发 UI 模板或跨端同步非常有用。

### 定义 JSON 数据
```json
{
  "type": "view",
  "style": { "width": 375, "height": 240, "backgroundColor": "#f0f0f0", "padding": 20 },
  "children": [
    {
      "type": "text",
      "content": "Hello JSON Layout",
      "style": { "color": "#333", "fontSize": 16 }
    }
  ]
}
```

### 加载并渲染
```ts
import { YogaCanvas } from '@yoga-canvas/core';

async function renderFromJson(jsonData) {
  const canvas = document.getElementById('myCanvas');
  
  // 直接将 JSON 作为描述符传入
  const engine = new YogaCanvas(canvas, jsonData, { width: 375, height: 240 });
  
  await engine.init();
  engine.render();
}
```

---

## 总结

| 模式 | 适用场景 | 特点 |
| :--- | :--- | :--- |
| **JSX** | React Web/小程序应用 | 声明式、易维护、与 React 生态完美集成 |
| **API** | 纯 JS 逻辑、动态生成 UI | 灵活、无 UI 框架依赖 |
| **JSON** | 动态模板、Server-Driven UI | 序列化友好、跨端一致性、支持动态下发 |


