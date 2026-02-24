# @yoga-canvas/core

Framework-agnostic Canvas layout engine powered by Yoga (flexbox).  
Supports **H5 (browser)** and **WeChat Mini Program** environments.

## Installation

```bash
npm install @yoga-canvas/core
# or
pnpm add @yoga-canvas/core
```

## Quick Start

```ts
import { createYogaCanvas, View, Text, Image } from '@yoga-canvas/core';

// 1. Define your layout using the declarative DSL
const layout = View({
  style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
  children: [
    Text({
      content: 'Hello Yoga Canvas!',
      style: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
    }),
    View({
      style: { flexDirection: 'row', gap: 8, marginTop: 12 },
      children: [
        Image({
          src: 'https://example.com/photo.jpg',
          style: { width: 80, height: 80, borderRadius: 8 },
        }),
        View({
          style: { flex: 1, justifyContent: 'center' },
          children: [
            Text({
              content: 'A flexible canvas layout engine',
              style: { fontSize: 14, color: '#6b7280' },
            }),
          ],
        }),
      ],
    }),
  ],
});

// 2. Create and initialize the engine
const canvas = document.getElementById('my-canvas');
const yoga = createYogaCanvas(canvas, layout, {
  platform: 'h5',
  pixelRatio: window.devicePixelRatio,
  width: 375,
  height: 667,
});

await yoga.init();
yoga.render();

// 3. Use output APIs
const json = yoga.toJSON();           // Serialize to JSON
const dataUrl = await yoga.toDataURL(); // Export as image
const html = yoga.toDOMString();       // Export as HTML flex layout
```

## Component DSL

| Component | Description |
|-----------|-------------|
| `View({style, children})` | Container with flexbox layout |
| `Text({content, style})` | Text node with word wrapping |
| `Image({src, objectFit, style})` | Image node with cover/contain/fill |
| `ScrollView({scrollDirection, style, children})` | Scrollable container |

## Style Properties

All components accept a unified `style` prop that merges:

- **Flex layout** — `width`, `height`, `flex`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `padding`, `margin`, etc.
- **Visual** — `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `rotation`
- **Text** (Text only) — `fontSize`, `fontWeight`, `color`, `lineHeight`, `textAlign`

Shorthand `padding` / `margin` expand to all four edges.

## Platform Support

| Platform | Adapter | Import |
|----------|---------|--------|
| Browser (H5) | `H5Adapter` | Built-in default |
| WeChat Mini Program | `WxAdapter` | `import { WxAdapter } from '@yoga-canvas/core'` |

## Instance API

```ts
// Rendering
yoga.render()
yoga.update(newLayout)

// Node tree
yoga.getNodeTree()
yoga.getNodeById(id)
yoga.getRootNode()

// Mutations
yoga.updateFlexStyle(nodeId, { flex: 2 })
yoga.addChild(parentId, Text({ content: 'new' }))
yoga.deleteNode(nodeId)
yoga.moveNode(nodeId, newParentId, index)

// Undo / Redo
yoga.undo()
yoga.redo()

// Export
yoga.toJSON()
yoga.loadJSON(json)
yoga.toDataURL()
yoga.toDOMString()

// Events
yoga.on('render', callback)
yoga.on('ready', callback)

// Lifecycle
yoga.destroy()
```

## License

MIT
