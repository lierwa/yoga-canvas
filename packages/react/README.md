# @yaga-canvas/react

React bindings for `@yaga-canvas/core` — Canvas layout engine with flexbox.

## Installation

```bash
npm install @yaga-canvas/react @yaga-canvas/core
```

## Usage

### Component

```tsx
import { YagaCanvas, View, Text } from '@yaga-canvas/react';

function App() {
  const ref = useRef(null);
  const layout = View({
    style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
    children: [
      Text({ content: 'Hello!', style: { fontSize: 20, color: '#333' } }),
    ],
  });

  return (
    <YagaCanvas
      ref={ref}
      layout={layout}
      width={375}
      height={667}
      onReady={(instance) => console.log('Ready!', instance)}
    />
  );
}
```

### Hook

```tsx
import { useYagaCanvas, View, Text } from '@yaga-canvas/react';

function App() {
  const layout = View({
    style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
    children: [
      Text({ content: 'Hello!', style: { fontSize: 20 } }),
    ],
  });

  const { canvasRef, ready, toDataURL, toJSON } = useYagaCanvas(layout, {
    width: 375,
    height: 667,
  });

  return <canvas ref={canvasRef} style={{ width: 375, height: 667 }} />;
}
```

## License

MIT
