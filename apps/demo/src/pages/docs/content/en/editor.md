---
title: Demo / Editor
description: Workspace, inspector, preview/export
order: 9
---

# Demo / Editor

- The Yoga Canvas Demo is not just a showcase; it's a fully-functional **Visual Editor Prototype**. You can create, edit, and export your Canvas layouts directly within this environment.

![编辑页面](/src/pages/docs/assets/editor.png)
---

## 1. Project Management (WorkSpace)

Manage your projects seamlessly from the home page or sidebar:
- **CRUD Operations**: Support for creating, duplicating, renaming, and deleting projects.
- **Persistence**: All edits are automatically saved to the browser's `localStorage`, ensuring no progress is lost.
- **Example Templates**: Built-in presets to help you quickly understand how Flexbox behaves within Canvas.

---

## 2. Core Editing Features

The editor consists of three essential panels:

### Node Tree
- **Visual Hierarchy**: Inspect nested node relationships similar to Chrome DevTools.
- **Quick Selection**: Click any tree node to pinpoint its location on the Canvas instantly.

### Property Panel (Inspector)
- **Flex Layout Tuning**: Real-time modification of `flex-direction`, `justify-content`, `gap`, and other layout properties.
- **Visual Styling**: Adjust background colors, border-radii, gradients, shadows, and more.
- **Tailwind Integration**: Type Tailwind classes directly into the `className` field for instant visual feedback.

### Interactive Canvas
- **Highlighting**: Accurate borders and dimensions are displayed when hovering over or selecting nodes.
- **Viewport Navigation**: Support for zooming and panning the Canvas via gestures or keyboard shortcuts.

---

## 3. Preview & Export

- **Multi-Platform Preview**: View your layout's performance in real-time within H5 and simulated Mini Program environments.
- **Code Generation**: Automatically generate JSX, JSON, or standard HTML/CSS snippets ready for copy-pasting.
- **Download**: Export your creative work as high-definition images with a single click.

---

## 4. Developer Reference

If you're planning to build your own visual design tools (e.g., poster editors, dashboard builders), the source code for this demo is an excellent reference:
- **State Synchronization**: Learn how to manage complex node tree changes using React state.
- **Command Patterns**: Explore potential implementations for undo/redo functionality.
- **Performance Tuning**: Understand how to handle Canvas redraws during high-frequency interactions.


