---
title: Quickstart
description: Minimal runnable example
order: 2
---

# Quickstart

Yoga Canvas provides multiple usage modes to adapt to different development scenarios.

## Install

```bash
pnpm add @yoga-canvas/core @yoga-canvas/react
```

---

## 1. React (JSX) Mode

The recommended way to use Yoga Canvas in React applications.

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

### How it works
- `View/Text/...` are marker components (they do not render DOM).
- `YogaCanvas` converts JSX into a `NodeDescriptor` tree and renders via the core engine.

---

## 2. Pure JS (API) Mode

If you are not using React, or need to use it in a logic-only environment (e.g., generating images in Node.js), you can use the `@yoga-canvas/core` API directly.

```ts
import { YogaCanvas, View, Text } from '@yoga-canvas/core';

async function initCanvas() {
  const canvas = document.getElementById('myCanvas');
  
  // 1. Define the layout descriptor
  const layout = View({
    style: { width: 375, height: 240, padding: 20, backgroundColor: '#000' },
    children: [
      Text({
        content: 'Hello from Core API',
        style: { color: '#fff', fontSize: 20 }
      })
    ]
  });

  // 2. Initialize the engine
  const engine = new YogaCanvas(canvas, layout, {
    width: 375,
    height: 240,
    pixelRatio: window.devicePixelRatio
  });

  // 3. Initialize and render
  await engine.init();
  engine.render();
}
```

---

## 3. JSON Mode

Yoga Canvas supports loading layouts entirely from JSON data, which is useful for remote UI templates or cross-platform synchronization.

### Define JSON Data
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

### Load and Render
```ts
import { YogaCanvas } from '@yoga-canvas/core';

async function renderFromJson(jsonData) {
  const canvas = document.getElementById('myCanvas');
  
  // Pass JSON as the descriptor directly
  const engine = new YogaCanvas(canvas, jsonData, { width: 375, height: 240 });
  
  await engine.init();
  engine.render();
}
```

---

## Summary

| Mode | Use Case | Key Features |
| :--- | :--- | :--- |
| **JSX** | React Web/Mini-program | Declarative, easy to maintain, integrates with React ecosystem |
| **API** | Pure JS, dynamic UI generation | Flexible, no UI framework dependency |
| **JSON** | Dynamic templates, Server-Driven UI | Serialized-friendly, cross-platform consistency, dynamic delivery |


