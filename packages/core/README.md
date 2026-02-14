# @yaga-canvas/core

Framework-agnostic Canvas layout engine powered by Yoga (flexbox).  
Supports **H5 (browser)** and **WeChat Mini Program** environments.

## Installation

```bash
npm install @yaga-canvas/core
# or
pnpm add @yaga-canvas/core
```

## Quick Start

```ts
import { createYagaCanvas, View, Text, Image } from '@yaga-canvas/core';

// 1. Define your layout using the declarative DSL
const layout = View({
  style: { width: 375, height: 667, flexDirection: 'column', padding: 16 },
  children: [
    Text({
      content: 'Hello Yaga Canvas!',
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
const yaga = createYagaCanvas(canvas, layout, {
  platform: 'h5',
  pixelRatio: window.devicePixelRatio,
  width: 375,
  height: 667,
});

await yaga.init();
yaga.render();

// 3. Use output APIs
const json = yaga.toJSON();           // Serialize to JSON
const dataUrl = await yaga.toDataURL(); // Export as image
const html = yaga.toDOMString();       // Export as HTML flex layout
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
| WeChat Mini Program | `WxAdapter` | `import { WxAdapter } from '@yaga-canvas/core'` |

## Instance API

```ts
// Rendering
yaga.render()
yaga.update(newLayout)

// Node tree
yaga.getNodeTree()
yaga.getNodeById(id)
yaga.getRootNode()

// Mutations
yaga.updateFlexStyle(nodeId, { flex: 2 })
yaga.addChild(parentId, Text({ content: 'new' }))
yaga.deleteNode(nodeId)
yaga.moveNode(nodeId, newParentId, index)

// Undo / Redo
yaga.undo()
yaga.redo()

// Export
yaga.toJSON()
yaga.loadJSON(json)
yaga.toDataURL()
yaga.toDOMString()

// Events
yaga.on('render', callback)
yaga.on('ready', callback)

// Lifecycle
yaga.destroy()
```

## License

MIT
