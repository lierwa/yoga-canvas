---
title: Layout & Render Pipeline
description: From descriptor to pixels
order: 4
---

# Layout & Render Pipeline

Yoga Canvas combines the layout capabilities of **Yoga Layout** with high-performance **Canvas 2D** rendering, providing a web-like but highly optimized pipeline.

---

## 1. Core Pipeline

1. **Build**: Converts `NodeDescriptor` (JSX/JSON) into a flattened `NodeTree`.
2. **Layout**:
   - Injects `flexStyle` into the Yoga engine.
   - Yoga calculates relative coordinates and dimensions for each node.
   - The engine populates results into `computedLayout` (`left`, `top`, `width`, `height`).
3. **Scroll**: For `ScrollView` nodes, calculates total content size (`contentSize`).
4. **Render**: The renderer traverses the tree, drawing each node using the Canvas API based on `visualStyle` and `computedLayout`.

---

## 2. Layout Capabilities

Powered by [Yoga Layout](https://yogalayout.com/), we support the full Flexbox model:

- **Direction**: `flexDirection` (`row`, `column`, `row-reverse`, `column-reverse`)
- **Alignment**:
  - `justifyContent` (Main Axis): `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly`
  - `alignItems` (Cross Axis): `flex-start`, `center`, `flex-end`, `stretch`
  - `alignSelf`: Allows an individual node to override the container's `alignItems`.
- **Flexibility**: `flex`, `flexGrow`, `flexShrink`, `flexBasis`
- **Gap**: `gap`, `rowGap`, `columnGap` (full support)
- **Positioning**: `position: relative` / `absolute` (supports `top`, `right`, `bottom`, `left`)
- **Box Model**: `padding`, `margin` (independent control for all sides)
- **Sizing**: `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` (pixels and percentages)

---

## 3. CSS Style Support List

Yoga Canvas implements common CSS properties with high precision:

### Basic Styles
- `backgroundColor`: Supports Hex, RGB, RGBA.
- `opacity`: 0 ~ 1.
- `zIndex`: Controls layer stacking.
- `overflow`: `visible`, `hidden` (supports border-radius clipping).

### Borders & Corners
- `borderWidth`, `borderColor`
- `borderRadius`: Supports uniform rounding (individual corners/borders are under development).

### Gradients (Canvas Speciality)
- `linearGradient`: Linear gradient (supports angles and multiple color stops).
- `radialGradient`: Radial gradient.

### Shadows
- `boxShadow`: Supports `offsetX`, `offsetY`, `blur`, `spread`, `color`.

### Transforms
- `translateX`, `translateY`, `scaleX`, `scaleY`, `rotate` (degrees).

---

## 4. Tailwind CSS Support

In `@yoga-canvas/react`, you can use Tailwind classes via the `className` prop. Our built-in parser maps these classes to engine styles.

### Supported Common Classes
- **Layout**: `flex`, `flex-col`, `items-center`, `justify-between`, `grow`, `shrink-0`, `gap-4`, etc.
- **Spacing/Sizing**: `p-4`, `m-2`, `w-full`, `h-[200px]`, `min-w-0`, etc.
- **Colors**: `bg-blue-500`, `bg-opacity-50`, `text-white`, etc.
- **Borders/Rounding**: `rounded-xl`, `border`, `border-gray-200`, etc.
- **Text**: `text-sm`, `font-bold`, `leading-relaxed`, `text-center`, etc.

### Limitations
- **No Responsive Breakpoints**: e.g., `md:flex` (Canvas environments usually have fixed logical dimensions).
- **No Pseudo-classes**: e.g., `hover:bg-red-500` (must be handled via React state or `NodeAction`).
- **Custom Units**: Use explicit units like `[100px]`; default numeric units are parsed based on configuration.

---

## 5. Rendering Features

- **Text Rendering**: Supports word wrapping, `lineClamp` (truncation), `lineHeight` (multipliers), and gradient text.
- **Image Handling**: Supports `objectFit` (`cover`, `contain`, `fill`) for perfect scaling in Canvas.
- **Performance**: Maintains 60FPS even with thousands of nodes using `overflow: hidden` and layered drawing techniques.


