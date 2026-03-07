---
title: Quickstart
description: Minimal runnable example
order: 2
---

# Quickstart (React)

## Install

```bash
pnpm add @yoga-canvas/core @yoga-canvas/react
```

## Minimal example

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

## JSX mode

- `View/Text/...` are marker components (they do not render DOM)
- `YogaCanvas` converts JSX into NodeDescriptor and renders via the core engine

