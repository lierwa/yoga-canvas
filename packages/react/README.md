# @yoga-canvas/react

React bindings for `@yoga-canvas/core` — Canvas layout engine with flexbox.

## Installation

```bash
npm install @yoga-canvas/react @yoga-canvas/core
```

## Usage

### Component

```tsx
import { YogaCanvas, View, Text } from '@yoga-canvas/react';

function App() {
  const ref = useRef(null);
  const layout = View({
    style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
    children: [
      Text({ content: 'Hello!', style: { fontSize: 20, color: '#333' } }),
    ],
  });

  return (
    <YogaCanvas
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
import { useYogaCanvas, View, Text } from '@yoga-canvas/react';

function App() {
  const layout = View({
    style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
    children: [
      Text({ content: 'Hello!', style: { fontSize: 20 } }),
    ],
  });

  const { canvasRef, ready, toDataURL, toJSON } = useYogaCanvas(layout, {
    width: 375,
    height: 667,
  });

  return <canvas ref={canvasRef} style={{ width: 375, height: 667 }} />;
}
```

## License

MIT

## todo

- 现在在scrollView的点击indicator显示没有跟随滚动
- 现在文字节点，宽度没有岁自身内容自适应，类似于 inlineFlex