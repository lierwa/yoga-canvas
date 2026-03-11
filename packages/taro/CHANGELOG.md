# @yoga-canvas/taro

## 0.1.1

### Patch Changes

- **Taro 适配器发布**:
  - 提供 `CanvasContainer` 组件，封装跨端 Canvas 容器逻辑。
  - 实现针对微信小程序的专用适配器 (`WxAdapter`)。
  - 集成 Yoga WASM 运行时，在小程序环境实现高性能布局计算。
  - 自动处理小程序端的字体缩放、图片加载与事件绑定。
- Updated dependencies
  - @yoga-canvas/core@0.1.1
  - @yoga-canvas/react@0.1.1
