```yaml
DEV_LOG_META:
  LastLogId: 2026-03-02/02
  LastAnchorCommit: ccdaa56
  LastAnchorDate: 2026-03-02
```

## Log Entry: BOOTSTRAP-2026-03-02/01
- Date: 2026-03-02
- Range: UNKNOWN.. ed32fc7
- Focus: 建立可复用的项目上下文（供后续按批次增量记录）

### Summary
- 仓库为 pnpm workspace monorepo，核心目标是用 Yoga(flexbox) 在 Canvas 上进行布局与绘制
- 引擎层（@yoga-canvas/core）提供布局计算、渲染、滚动/命中测试、导入导出与 H5/WX 平台适配
- 数据形态围绕 NodeDescriptor（声明）、NodeTree/CanvasNode（运行时扁平树）与 ScrollManager（可序列化滚动状态分离）
- 提供组件 DSL（View/Text/Image/ScrollView）与 React JSX 标记组件两种“描述树”写法
- React 绑定（@yoga-canvas/react）支持 layout prop 与 JSX children，并提供 Hook 与编辑器辅助组件
- 支持 ScrollView 裁剪与滚动条绘制，并包含滚动条可见性/淡出控制能力
- 支持导出 JSON / DOM string，以及 H5 DataURL 与 WX tempFilePath 两种图片导出路径
- 根目录 src/ 存在更完整的可视化编辑器应用（节点树、属性面板、交互与撤销重做）
- packages/demo 提供 Live JSX Editor 演示；另有 @yoga-canvas/taro 与 taro-demo 支持小程序侧集成

### Changes By Area
- Core (@yoga-canvas/core):
  - 引擎主入口与实例：packages/core/src/YogaCanvas.ts、packages/core/src/index.ts
  - 树构建与布局计算：packages/core/src/tree/NodeTreeManager.ts、packages/core/src/layout/*
  - 渲染与 painters：packages/core/src/renderer/Renderer.ts、packages/core/src/renderer/painters/*
  - 平台适配：packages/core/src/platform/H5Adapter.ts、packages/core/src/platform/WxAdapter.ts
  - 滚动与事件：packages/core/src/scroll/ScrollManager.ts、packages/core/src/events/HitTest.ts
  - 导入导出：packages/core/src/export/*
- React (@yoga-canvas/react):
  - 组件与 Hook：packages/react/src/YogaCanvasComponent.tsx、packages/react/src/useYogaCanvas.ts
  - JSX → descriptor：packages/react/src/jsx/convertJSX.ts、packages/react/src/jsx/tailwindToStyle.ts
  - JSX 标记组件：packages/react/src/components/*
  - 编辑器能力：packages/react/src/editor/EditorCanvas.tsx、packages/react/src/editor/useCanvasInteraction.ts
- Editor (root src/):
  - 应用入口与 UI：src/App.tsx、src/components/*
  - 树状态与历史：src/hooks/useNodeTree.ts
- Demo / Taro:
  - Demo（Live 编辑器）：packages/demo/src/App.tsx、packages/demo/src/LiveEditor.tsx
  - Taro 集成：packages/taro/src/runtime/initYogaCanvasTaro.ts、packages/taro/src/components/CanvasContainer.tsx
  - Taro Demo：packages/taro-demo/src/pages/*

### Notable API / Data Model Changes
- @yoga-canvas/core 主要导出：createYogaCanvas / YogaCanvas、View/Text/Image/ScrollView DSL、NodeTreeManager、ScrollManager、H5Adapter/WxAdapter、hitTest/hitTestAll、exportToJSON/importFromJSON/exportToDOMString/exportToDataURL/exportToTempFilePath（packages/core/src/index.ts）
- @yoga-canvas/react 主要导出：YogaCanvas 组件（支持 layout 与 JSX children）、useYogaCanvas、JSX 标记组件 View/Text/Image/ScrollView、convertChildrenToDescriptors，以及 EditorCanvas/useCanvasInteraction（packages/react/src/index.ts）

### Notes & Gotchas
- ScrollView 的滚动状态与内容尺寸不放入 NodeTree，依赖 ScrollManager 保持树可序列化（project.md 约定）
- H5 与 WX 文本测量/图片导出能力差异较大，需要依赖 adapter 做分支处理（project.md 约定）
- 仓库规则：不要执行 npm run dev:h5（project.md 约定）

### Open Issues
- 根目录 README.md 仍为 Vite 模板内容，未沉淀仓库使用说明
- 根 package.json 的 name 为 windsurf-project，可能与 yoga-canvas 命名不一致
- 同时存在 pnpm-lock.yaml 与 package-lock.json，依赖管理口径可能需要统一

### Next
- 从本条 BOOTSTRAP 开始按批次追加增量日志（以 LastAnchorCommit..HEAD 为范围）
- 为 @yoga-canvas/core 的布局/渲染/命中测试添加基础自动化测试用例
- 明确并补齐根目录与各包的开发/构建/发布工作流（pnpm 口径）
- 将仓库规则与关键入口同步到根 README（或迁移到 project.md 并在 README 引用）
- 梳理 H5/WX adapter 的差异清单并补充回归样例（文本测量、图片导出、触摸坐标）

---

## Log Entry: 2026-03-02/02
- Date: 2026-03-02
- Range: ed32fc7.. ccdaa56
- Focus: 支持画布自动高度与项目工作空间（工作台/持久化项目）

### Summary
- Core：根节点 height='auto' / minHeight 场景允许 height=null 约束，layout 后同步逻辑高度并发出 resize 事件
- React：YogaCanvasComponent 订阅 resize，自动更新 canvas 的 CSS 尺寸以匹配 auto-height
- Taro：initYogaCanvasTaro 在 init 后根据 root computedLayout.height 回写 canvasNode.height，兼容小程序 canvas 固定高度限制
- Layout：ScrollView contentSize 计算改为从子节点绝对布局转换为相对 viewport，避免滚动范围偏移
- H5Adapter：文本测量改为基于 canvas + 手动换行算法，支持 nowrap/normal，提高布局高度计算稳定性
- Editor：新增工作台 WorkspacePage + hash 路由；项目创建/复制/重命名/删除与 localStorage 持久化；编辑页按 projectId 打开并自动保存 treeJSON
- DevLogs：新增 run-log.md 记录手册；日志采集的 git 命令统一加 --no-pager 避免 pager 卡住

### Changes By Area
- Core (@yoga-canvas/core):
  - YogaCanvas 支持 setSize(height:null) 与 auto-fit-height；新增 resize 事件（packages/core/src/YogaCanvas.ts）
  - NodeTreeManager 支持 height 约束为 null 表示不限制，并按 root height/minHeight 推断 auto-height（packages/core/src/tree/NodeTreeManager.ts）
  - ScrollView 内容尺寸计算修正为相对父节点坐标（packages/core/src/layout/LayoutEngine.ts）
  - H5 文本测量/图片缓存加载逻辑调整（packages/core/src/platform/H5Adapter.ts）
  - 布局/渲染入口整理（packages/core/src/layout/index.ts、packages/core/src/renderer/Renderer.ts、packages/core/src/layout/YogaManager.ts）
- React (@yoga-canvas/react):
  - YogaCanvasComponent 监听 core resize 自动更新 canvasSize（packages/react/src/YogaCanvasComponent.tsx）
- Editor (root src/):
  - 新增工作台与 hashRouter（src/pages/WorkspacePage.tsx、src/utils/hashRouter.ts）
  - 新增项目存储与 seed 模板，编辑页自动持久化 treeJSON（src/workspace/projectStore.ts、src/templates/seedDescriptors.ts、src/pages/EditorPage.tsx）
  - UI 组件与属性面板支持 Auto Height preset（src/components/LeftPanel.tsx、src/components/PropertiesPanel.tsx 等）
- Demo / Taro:
  - taro 初始化根据计算后高度回写 canvas 尺寸（packages/taro/src/runtime/initYogaCanvasTaro.ts）
  - Demo 与 taro-demo 适配示例调整（packages/demo/src/App.tsx、packages/taro-demo/src/pages/*）

### Notable API / Data Model Changes
- @yoga-canvas/core：YogaCanvas `setSize({ height: null })` 用于取消显式高度、启用 auto-fit-height（packages/core/src/YogaCanvas.ts）
- @yoga-canvas/core：新增 `resize` 事件（参数 `{ width, height }`），用于外层同步画布尺寸（packages/core/src/YogaCanvas.ts）
- 行为变化：当 root `flexStyle.height === 'auto'` 或 `height` 未设但存在 `minHeight` 且未传 `options.height` 时，布局高度可随内容增长（auto-fit）

### Notes & Gotchas
- git diff/log 在某些环境会走 pager（less）并等待手动退出；记录日志时统一使用 `git --no-pager ...`（dev-logs/run-log.md）
- auto-fit-height 仅在未提供显式 height 且 root 满足 auto-height 判定条件时启用；需确保 root 宽度可推断（options.width 或 root.style.width）
- React 侧通过 CSS style 控制 canvas 展示尺寸；canvas 实际像素尺寸仍由 core 按 pixelRatio 写入 width/height 属性

### Open Issues
- Workspace 的项目数据目前仅 localStorage，尚未支持导入/导出与跨设备同步
- auto-height + ScrollView 的组合需要更多回归（滚动条、命中测试、内容尺寸）

### Next
- 为 YogaCanvas auto-height 添加单元测试/示例（root height='auto' / minHeight 分支）
- 补充 Workspace 项目导入/导出 JSON 工作流
- 在 demo/taro-demo 加入 auto-height 模板示例与回归用例
- 在 run-log.md 中补齐 Windows/CI 下 git/pager 的诊断命令（如 `git var GIT_PAGER`）

---
