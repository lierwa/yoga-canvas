# yoga-canvas（Yoga Canvas）— AI 项目概览

这个仓库是一个 pnpm workspace 的 monorepo，核心目标是：

- 用 Yoga（flexbox）在 Canvas 上做布局计算
- 把“类似 React Native 的节点树（View/Text/Image/ScrollView）”渲染到 Canvas
- 同时支持 H5（浏览器）与微信小程序（wx）平台
- 提供 React 绑定（组件 + Hook + JSX→descriptor 转换）
- 仓库内还包含两个演示/编辑器应用：
  - `packages/demo`：Live JSX Editor + 导出 + 选区覆盖层
  - 根目录 `src/`：一个更完整的可视化编辑器（节点树/属性面板/拖拽/缩放/撤销重做）

本文件面向 AI，用于快速建立上下文，减少每次都全量扫描仓库的成本。

## 仓库结构（高频入口）

- `packages/core`：引擎（布局 + 渲染 + 事件/滚动/导出 + 平台适配器）
  - 入口导出：`packages/core/src/index.ts`
  - 主类：`packages/core/src/YogaCanvas.ts`
  - 树管理：`packages/core/src/tree/NodeTreeManager.ts`
  - 布局：`packages/core/src/layout/*`（YogaManager / LayoutEngine）
  - 渲染：`packages/core/src/renderer/*`（Renderer + painters）
  - 平台适配：`packages/core/src/platform/H5Adapter.ts`、`packages/core/src/platform/WxAdapter.ts`
  - 滚动：`packages/core/src/scroll/ScrollManager.ts`
  - 命中测试：`packages/core/src/events/HitTest.ts`
  - 导出：`packages/core/src/export/*`（JSON / DOM string / DataURL / WX tempFilePath）

- `packages/react`：React 绑定（YogaCanvas 组件、Hook、JSX 标记组件、JSX 转 descriptor）
  - 入口导出：`packages/react/src/index.ts`
  - 组件封装：`packages/react/src/YogaCanvasComponent.tsx`
  - Hook：`packages/react/src/useYogaCanvas.ts`
  - JSX 转换：`packages/react/src/jsx/convertJSX.ts`
  - JSX 标记组件：`packages/react/src/components/*`（只用于描述树，不渲染 DOM）

- `packages/demo`：演示应用（Live Editor）
  - 入口：`packages/demo/src/App.tsx`

- 根目录 `src/`：编辑器应用（非 package）
  - 入口：`src/App.tsx`
  - 树/撤销重做/节点增删改：`src/hooks/useNodeTree.ts`
  - 交互（选择/拖拽/缩放/滚轮/双击等）：`src/hooks/useCanvasInteraction.ts`
  - 编辑器渲染（grid/选区/控制柄/scroll 可视化）：`src/core/CanvasRenderer.ts`

## 核心数据结构（重要）

引擎对外/对内主要围绕三种数据形态：

1) **NodeDescriptor（声明式描述）**
- 来自 DSL `View({...}) / Text({...}) / Image({...}) / ScrollView({...})`
- 或来自 React JSX（通过 `convertChildrenToDescriptors` 转换）
- 类型定义：`packages/core/src/types/node.ts`（`NodeDescriptor`）

2) **NodeTree / CanvasNode（扁平树，运行时结构）**
- `NodeTree = { rootId, nodes: Record<string, CanvasNode> }`
- `CanvasNode` 里包含：
  - `flexStyle`（Yoga 计算输入）
  - `visualStyle`（背景/边框/圆角/透明度/旋转等）
  - `textProps` / `imageProps` / `scrollViewProps`
  - `computedLayout`（Yoga 输出：left/top/width/height）
- 类型定义：`packages/core/src/types/node.ts`

3) **ScrollManager（与树分离的滚动状态）**
- ScrollView 的 offset/contentSize/viewportSize/scrollBarOpacity 不放在 NodeTree 里，保证树可序列化
- 实现：`packages/core/src/scroll/ScrollManager.ts`

## 渲染/布局主流程（从 descriptor 到画面）

以 `@yoga-canvas/core` 的 `YogaCanvas` 为主线：

- 初始化：`YogaCanvas.init()`
  - `initYoga()` 加载 Yoga wasm
  - `NodeTreeManager.buildFromDescriptor(layout)` 把 descriptor 编译为 NodeTree（生成 id、拆分 style、填充类型 props）
  - `NodeTreeManager.computeLayout()`
    - `buildYogaTree(...)` 生成 YogaNode 树
    - `applyFlexStyle(...)` 把 FlexStyle 映射到 Yoga API
    - `calculateLayout(...)` 写回 `computedLayout`
  - `computeScrollContentSizes(tree, scrollManager)` 计算 ScrollView 内容尺寸/视口尺寸
  - `adapter.createCanvasContext(canvas)` 获取跨平台 CanvasContextLike

- 渲染：`YogaCanvas.render()`
  - 根据 pixelRatio 设置 H5 canvas 实际像素尺寸
  - `renderTree(ctx, tree, logicalWidth, logicalHeight, { getImage, scrollManager })`
    - `drawBox/drawText/drawImage/drawScrollViewScrollbar` 等 painters
    - 对 scrollview：对子树进行 clip + translate(-offset)

- 更新：`YogaCanvas.update(newLayout)`
  - 重新 build + computeLayout + computeScrollContentSizes + render

建议把“布局/树/滚动状态/绘制”的变化定位到上述四个环节之一。

## 平台适配（H5 vs WX）

- `H5Adapter`
  - 文本测量：用隐藏 div 计算 `width/height`（`measureText`）
  - 图片加载：`getCachedImage` 可同步返回已加载图片，否则异步加载完触发 render callback
  - 导出：`canvas.toDataURL`

- `WxAdapter`
  - 文本测量：优先用 canvas `measureText` 做逐字换行估算，没有 ctx 时 fallback 估算
  - 图片加载：`canvas.createImage()`
  - 导出：不支持 DataURL，使用 `wx.canvasToTempFilePath`

## React 绑定的两种使用方式

1) **Descriptor 模式**（更接近 core）
- 直接传 `layout: NodeDescriptor` 给 `<YogaCanvas />`
- 适合从 JSON/DSL 生成布局

2) **JSX 模式**（React 体验）
- 写 `<View> <Text/> ...` 这类“标记组件”
- `packages/react/src/jsx/convertJSX.ts` 会遍历 React element tree，识别 `__yogaNodeType` 并转换成 NodeDescriptor
- 注意：这些组件本身不渲染 DOM（返回 null），只作为描述树的语法糖

## 导出/导入能力

- JSON：`exportToJSON` / `importFromJSON`（`packages/core/src/export/exportNodeTree.ts`）
- DOM string：`exportToDOMString`（`packages/core/src/export/exportDOMTree.ts`）
- 图片：H5 `toDataURL`；WX `toTempFilePath`

## 编辑器应用（根目录 src/）定位指南

这个应用不是 `packages/demo`，它直接用 core 的 `NodeTreeManager` 来做“可视化编辑”能力：

- 树状态与撤销/重做：`src/hooks/useNodeTree.ts`
  - `NodeTreeManager.commit/applyLive/commitLive` 管理历史
  - 各种 mutation：updateFlexStyle/updateVisualStyle/updateTextProps/updateImageProps/addChild/delete/move/resize/rotate
- 画布绘制（含选区/控制柄/辅助线）：`src/core/CanvasRenderer.ts`
- 交互：`src/hooks/useCanvasInteraction.ts`（鼠标/滚轮/缩放/拖拽/双击）

## AI 常见任务 → 推荐入口文件

- 新增/修改节点样式字段：
  - 类型：`packages/core/src/types/style.ts`、`packages/core/src/types/node.ts`
  - Yoga 映射：`packages/core/src/layout/YogaManager.ts`
  - 绘制：`packages/core/src/renderer/painters/*`

- ScrollView 行为（滚动/滚动条/命中测试）：
  - 状态：`packages/core/src/scroll/ScrollManager.ts`
  - 渲染：`packages/core/src/renderer/Renderer.ts`、`packages/core/src/renderer/painters/ScrollViewPainter.ts`
  - 命中测试：`packages/core/src/events/HitTest.ts`

- React JSX → descriptor 支持更多 props：
  - 转换：`packages/react/src/jsx/convertJSX.ts`
  - 标记组件 props：`packages/react/src/components/*`

## 开发与构建（仓库事实）

- 根目录 scripts：`dev / build / lint / preview`（Vite + TS）
- `packages/core`、`packages/react` 用 `tsup` 输出 `dist`（esm/cjs + dts）
- workspace 依赖：根目录与 demo 依赖 `@yoga-canvas/core`、`@yoga-canvas/react`

## 项目约束（对 AI 很重要）

- 不要执行 `npm run dev:h5`（仓库规则）。