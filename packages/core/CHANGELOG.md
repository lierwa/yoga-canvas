# @yoga-canvas/core

## 0.1.1

### Patch Changes

- **核心渲染引擎初始化**:
  - 集成 Yoga Layout (Flexbox) 布局引擎。
  - 支持 H5 (Canvas 2D) 与微信小程序平台的跨端适配。
  - 实现 View, Text, Image, ScrollView 等基础 UI 节点渲染。
  - 支持线性渐变 (Linear Gradient)、圆角、阴影、边框等视觉样式。
  - 完善的事件系统，支持 Pointer 事件派发与点击测试 (Hit Testing)。
  - 内置节点树管理器，支持历史记录 (Undo/Redo) 与状态持久化。
  - 提供 Canvas 到图片/JSON 的导出功能。
