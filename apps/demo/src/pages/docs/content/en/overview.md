---
title: Overview
description: What this library does
order: 1
---

# What is Yoga Canvas?

Yoga Canvas is a high-performance, lightweight **Canvas rendering engine** that combines the layout power of **Yoga Flexbox** with **Canvas 2D**'s drawing capabilities. It provides a React-like declarative UI rendering solution for both H5 and WeChat Mini Programs.

---

## 1. Core Advantages

- **🚀 Exceptional Performance**: Rendered on Canvas, maintaining a smooth 60FPS experience even with complex lists of thousands of nodes or frequent interactions.
- **🧩 Declarative UI**: Supports JSX and React-like component-based development (View, Text, Image, ScrollView) with a minimal learning curve.
- **📏 Robust Layout System**: Integrated with Facebook's Yoga engine, offering full support for the Flexbox model, including flexibility, gaps, absolute positioning, and more.
- **🎨 Rich Styling Support**: Built-in Tailwind CSS parser, supporting gradients, shadows, border-radius clipping, multi-line text truncation, and other web-level visual capabilities.
- **📱 Cross-Platform Consistency**: A single codebase for both H5 and WeChat Mini Programs, bridging environmental gaps with a platform abstraction layer (Adapter).
- **⚡ Full Interaction System**: An event dispatching system supporting capture and bubble phases, with high-precision hit testing.

---

## 2. Use Cases

1. **High-Performance Dynamic Posters**: Move away from traditional DOM-to-image solutions. Render high-fidelity, interactive sharing posters in real-time within Canvas.
2. **Visual Low-Code Platforms**: Serve as the rendering core for visual editors, supporting node selection, highlighting, dragging, zooming, and panning.
3. **Complex List Rendering**: Solve performance stutters in mobile H5 when handling long lists or complex cards.
4. **Game UI & Lightweight Engines**: Provide a standard UI layout solution for game development.

---

## 3. Core Concepts

| Concept | Description |
| :--- | :--- |
| **NodeDescriptor** | **Declarative Description**. The tree structure you define via JSX or JSON. |
| **NodeTree / CanvasNode** | **Runtime Flattened Tree**. Entity nodes used internally by the engine for layout calculation, rendering, and hit testing. |
| **Yoga Engine** | **Layout Core**. Responsible for translating Flexbox properties into precise pixel coordinates for each node. |
| **Adapter** | **Platform Abstraction Layer**. Bridges differences between H5 and Mini Programs in image loading, text measurement, and Canvas exporting. |

---

## 4. Why Not Use DOM or WebGL?

- **vs. DOM**: DOM incurs massive performance costs when handling large-scale animations or frequent interactions, and lacks direct support for high-fidelity image export. Yoga Canvas is superior in memory usage and drawing efficiency.
- **vs. WebGL / PixiJS**: While WebGL is powerful, its bundle size is large, and its support for text and Flexbox layout is weak. Yoga Canvas focuses on UI rendering with a tiny footprint and layout capabilities that fully align with web standards.


