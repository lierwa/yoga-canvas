```yaml
DEV_LOG_META:
  LastLogId: 2026-03-07/01
  LastAnchorCommit: 3d84bf2
  LastAnchorDate: 2026-03-07
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

## Log Entry: 2026-03-07/01
- Date: 2026-03-07
- Range: 9f22aa6.. 3d84bf2
- Focus: 渐变/事件/文本能力增强，并修复行高与阴影渲染问题

### Summary
- Core：引入 retained-mode 指针事件系统（capture/bubble/stopPropagation），并把派发入口接入 YogaCanvas
- Core：增强视觉能力，支持径向渐变与文本渐变，并补齐文本 lineClamp 的排版与渲染链路
- Core：统一 lineHeight 的“倍数/px”双语义，并修复 boxShadow 透明度绘制与 DOM 导出行高单位
- Demo：移除 Playground/ComponentsCanvas 路由，重构 HomePage 展示；新增 demo 顶部导航与更完整的 ComponentsCanvasContent 数据
- Editor：修复 Tailwind 扫描范围导致的选中高亮失效；增强项目存储的脏数据容错；属性面板增加 lineHeight 的 px/倍数双输入

### Changes By Area
- Core (@yoga-canvas/core):
  - 事件：新增 retained-mode 派发器并导出，YogaCanvas 接入 dispatch 与监听（packages/core/src/events/*、packages/core/src/YogaCanvas.ts、packages/core/src/index.ts）
  - 文本：新增 lineClamp 支持与抽取 textLayout 工具；lineHeight 同时支持倍数/px（packages/core/src/text/textLayout.ts、packages/core/src/renderer/painters/TextPainter.ts、packages/core/src/platform/H5Adapter.ts、packages/core/src/platform/WxAdapter.ts）
  - 渲染：修复 boxShadow 绘制时 fillStyle 默认黑色导致透明背景发黑；DOM 导出在 px 行高时输出 px 单位（packages/core/src/renderer/painters/BoxPainter.ts、packages/core/src/export/exportDOMTree.ts）
  - 类型与构建：补齐类型导出与声明产物生成脚本（packages/core/src/types/*、packages/core/package.json）
- React (@yoga-canvas/react):
  - Editor：CanvasRenderer 文本渲染支持 lineHeight(px/倍数) 并与 core 语义对齐（packages/react/src/editor/CanvasRenderer.ts）
  - 交互：EditorCanvas/useCanvasInteraction 适配 retained-mode 指针事件链路（packages/react/src/editor/EditorCanvas.tsx、packages/react/src/editor/useCanvasInteraction.ts）
  - UI：NodeTreePanel 选中态展示调整（packages/react/src/components/NodeTreePanel.tsx）
- Editor (apps/demo/src/editor):
  - 属性面板：新增 lineHeight 的 px/倍数双输入，并在 seed 模板里将长小数行高统一四舍五入到 1 位（apps/demo/src/editor/components/PropertiesPanel.tsx、apps/demo/src/editor/templates/seedDescriptors.ts）
  - 项目存储：增强 localStorage 脏数据的归一化，避免读取时崩溃（apps/demo/src/editor/workspace/projectStore.ts）
  - LiveCodeEditor：增强输入解析与错误提示（apps/demo/src/editor/components/LiveCodeEditorPanel.tsx）
  - 样式：补齐 Tailwind 扫描源文件范围，修复选中高亮类名不生效（apps/demo/src/index.css）
- Demo / Taro:
  - Demo：重构 HomePage，新增 DemoTopNav 与更完整的 ComponentsCanvasContent 资源；移除 Playground/ComponentsCanvas 页面（apps/demo/src/pages/HomePage.tsx、apps/demo/src/components/DemoTopNav.tsx、apps/demo/src/pages/components/ComponentsCanvasContent.ts）
  - i18n：补齐 demo 侧文案资源（apps/demo/src/i18n.tsx）
  - Taro demo：新增多页示例结构与配置（apps/taro-demo/src/pages/*、apps/taro-demo/src/app.*）

### Notable API / Data Model Changes
- @yoga-canvas/core：新增 PointerEventDispatcher 事件体系，并通过 YogaCanvas 暴露节点级 add/removeEventListener 与 dispatchPointerEvent（packages/core/src/events/*、packages/core/src/YogaCanvas.ts）
- @yoga-canvas/core：lineHeight 行为变化——`lineHeight < 4` 视为倍数，`lineHeight >= 4` 视为 px；影响文本测量/布局/渲染与 DOM 导出（packages/core/src/platform/*、packages/core/src/renderer/painters/TextPainter.ts、packages/core/src/export/exportDOMTree.ts）
- @yoga-canvas/core：新增文本 lineClamp 支持与共享的 textLayout 工具（packages/core/src/text/textLayout.ts）

### Notes & Gotchas
- 仓库规则：不要执行 npm run dev:h5
- CSS 的 line-height 数字默认是“倍数”；当使用 px 行高时需要输出 `${n}px`（本批次已在 DOM 导出修复）
- lineHeight 的 px/倍数通过阈值 4 进行区分：如确实需要非常大的倍数行高，应避免使用 >=4 的值
- Demo 的 Tailwind 通过 @source 扩展扫描路径，避免 workspace 组件类名不被收集（apps/demo/src/index.css）

### Open Issues
- lineHeight 双语义目前靠阈值区分，后续可考虑引入显式单位字段（例如 lineHeightUnit）以避免歧义
- resolveLineHeightPx 逻辑在多处重复实现，后续可集中到 core 的单一工具函数并复用
- demo build 仍有 chunk 体积告警（>500kB），后续需要按路由或面板动态拆分

### Next
- 为 lineHeight(px/倍数) 与 lineClamp 增加最小回归用例（测量高度、渲染基线、DOM 导出）
- 抽取并统一 resolveLineHeightPx 到 core 工具层，React/editor 直接复用
- 评估 retained-mode 事件系统在 ScrollView 嵌套场景的回归覆盖（capture/bubble/wheel）

---

## Log Entry: 2026-03-06/01
- Date: 2026-03-06
- Range: d3057d3.. 9f22aa6
- Focus: 应用目录迁移 + Demo 能力增强，并引入 retained-mode 指针事件派发（含未提交增量）

### Summary
- 完成 apps 目录迁移：将 demo / taro-demo 从 packages 移到 apps，并对相关配置进行适配（tsconfig/workspace/package scripts）
- 将原根目录编辑器能力合并进演示应用：编辑器页面、组件与 hooks 迁移到 apps/demo/src/editor 体系
- Demo 新增多页面能力：Home / Playground / ComponentsCanvas 等页面与配套 UI 组件，提升展示与试用路径
- 交互增强：支持绝对定位节点的实时拖拽移动（absolute move）与相关编辑体验优化
- 事件系统升级（未提交）：新增 retained-mode PointerEventDispatcher，支持 capture/bubble/stopPropagation，并将散落的 hitTest 逻辑迁移到统一派发入口

### Changes By Area
- Core (@yoga-canvas/core):
  - 事件：新增 PointerEventDispatcher 与 CanvasPointerEvent 系列类型/导出；YogaCanvas 增加 addEventListener/removeEventListener/dispatchPointerEvent，并将 wheel 处理与事件派发对齐（packages/core/src/events/*、packages/core/src/YogaCanvas.ts、packages/core/src/index.ts）
  - 布局/文本/适配：LayoutEngine、TextPainter、H5Adapter/WxAdapter 等有同步调整（packages/core/src/layout/LayoutEngine.ts、packages/core/src/renderer/painters/TextPainter.ts、packages/core/src/platform/*）
  - 树与类型：NodeTreeManager、node/platform/style 类型有更新（packages/core/src/tree/NodeTreeManager.ts、packages/core/src/types/*）
- React (@yoga-canvas/react):
  - 组件：YogaCanvasComponent 增强 DOM pointer 事件转发到 core 的派发入口（packages/react/src/YogaCanvasComponent.tsx）
  - Editor：useCanvasInteraction 以统一派发器替代零散命中测试；EditorCanvas 事件签名与交互链路随之调整（packages/react/src/editor/useCanvasInteraction.ts、packages/react/src/editor/EditorCanvas.tsx、packages/react/src/editor/CanvasRenderer.ts）
- Editor (root src/):
  - 迁移：原 root src 编辑器应用整体迁移到 apps/demo/src/editor，原路径大幅减少/退出主流程（git diff 显示大量 src/ → apps/demo/src/editor/ 的 rename）
- Demo / Taro:
  - Demo：新增与调整多个页面（Home/Playground/ComponentsCanvas），并引入页面级组件目录（apps/demo/src/pages/*、apps/demo/src/pages/components/*）
  - 工程结构：apps/demo、apps/taro-demo 的配置迁移与适配（apps/*/package.json、apps/*/config、apps/*/tsconfig.json）

### Notable API / Data Model Changes
- @yoga-canvas/core：新增/导出 PointerEventDispatcher、CANVAS_EVENT_TARGET_ID、CanvasPointerEventType/CanvasPointerEvent 等事件相关 API（packages/core/src/events/*、packages/core/src/index.ts）
- @yoga-canvas/core：YogaCanvas 增加 dispatchPointerEvent 与节点级 add/removeEventListener（行为上为 retained-mode 事件系统入口）
- @yoga-canvas/react（可能 breaking）：EditorCanvas 的 onMouseUp 由无参改为接收 React MouseEvent（packages/react/src/editor/EditorCanvas.tsx）
- 目录结构（breaking）：demo 与 taro-demo 从 packages/* 迁移到 apps/*，旧路径在消费侧需要同步更新

### Notes & Gotchas
- 仓库规则：不要执行 npm run dev:h5
- Windows 环境下 git 提示 “LF will be replaced by CRLF”，后续提交前建议统一处理换行策略，避免 diff 噪声
- 本次范围包含未提交改动与未跟踪文件（例如事件派发器新文件、JS 产物与 tsbuildinfo），建议在落盘前整理 .gitignore 与提交边界

### Open Issues
- 未提交改动较多：当前工作区存在大量 M/??，需要决定哪些应纳入本批次提交，哪些应忽略或回滚（git status --porcelain）
- 未跟踪文件包含 JS 产物与 buildinfo（例如 apps/taro-demo/src/**/*.js、tsconfig.tsbuildinfo），需确认是否应进入版本库
- retained-mode 事件系统仍需更系统的交互回归（ScrollView 嵌套、capture/bubble 次序、wheel defaultPrevented 行为）

### Next
- 将 PointerEventDispatcher 与相关迁移整理为一次可提交的最小变更集（补齐导出/删掉旧入口或保留兼容层）
- 清理/规范生成文件：为 tsbuildinfo 与编译产物补齐 ignore 规则，降低跨平台 diff 噪声
- 补充 retained-mode 事件的最小测试/回归样例（click/wheel/stopPropagation、ScrollView 嵌套命中）
- 梳理 apps 迁移后的开发脚本与路径引用（README/内部文档可后续再补，但先保证脚本与依赖一致）

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

## Log Entry: 2026-03-03/01
- Date: 2026-03-03
- Range: ccdaa56.. d3057d3
- Focus: 编辑器 UI 重构：预览/导出面板与属性面板组件化

### Summary
- Editor：新增 PreviewModal，支持画布预览、节点点选与导出 TypeScript/JSON/HTML
- Editor：属性面板拆分为可复用的 property-controls（颜色/尺寸/数字/选择/分组等），减少重复表单逻辑
- Editor：LeftPanel / Toolbar / LiveCodeEditorPanel 结构重排并拆分子组件，提升可维护性
- React(editor)：CanvasRenderer 增加 overlay 绘制阶段，并支持 view+overflow=hidden 的裁剪渲染
- Core/React：收敛 overflow 语义，类型与 JSX style 转换仅允许 visible/hidden
- Tooling：新增 predev 脚本，启动 dev 前先构建 workspace 库产物

### Changes By Area
- Core (@yoga-canvas/core):
  - FlexStyle.overflow 移除 'scroll' 类型分支（packages/core/src/types/style.ts）
- React (@yoga-canvas/react):
  - editor CanvasRenderer：新增 drawOverlays，dropIndicator/选中框等覆盖层与 ScrollView offset 对齐；view overflow=hidden 时对子节点做 clip（packages/react/src/editor/CanvasRenderer.ts）
  - JSX style 转换：overflow 仅接受 visible/hidden（packages/react/src/jsx/tailwindToStyle.ts）
- Editor (root src/):
  - 预览/导出：新增 PreviewModal 及 preview-modal 子模块（canvas/code/inspector/ResizablePanels/codegen 等）（src/components/PreviewModal.tsx、src/components/preview-modal/*）
  - 属性面板：改造 PropertiesPanel 并新增 property-controls 组件库（src/components/PropertiesPanel.tsx、src/components/property-controls/*）
  - 面板拆分：新增 left-panel 子模块与 live-code-editor 子模块（src/components/left-panel/*、src/components/live-code-editor/*）
  - 工具条：拆分 HistoryControls/ZoomControls 等子组件（src/components/toolbar/*）
  - 工作台：WorkspacePage 适配新 UI 结构（src/pages/WorkspacePage.tsx）
- Demo / Taro:
  - 无

### Notable API / Data Model Changes
- Breaking: FlexStyle.overflow 不再包含 'scroll'（packages/core/src/types/style.ts）
- 行为收敛：JSX style 转换将过滤 overflow='scroll'（packages/react/src/jsx/tailwindToStyle.ts）

### Notes & Gotchas
- overflow=hidden 的裁剪目前在 React editor CanvasRenderer 中实现；core 渲染侧仍以 ScrollView 的裁剪/平移为主
- pnpm-lock.yaml 变更量较大，注意后续合并冲突与依赖一致性

### Open Issues
- PreviewModal 的 hitTest/选区在复杂 ScrollView 嵌套下仍需更多回归验证
- codegen（JSX/HTML）输出的格式化与稳定性需要补充测试样例

### Next
- 为 PreviewModal 的导出（JSON/HTML/TS）补充最小回归样例
- 验证 overflow='scroll' 迁移路径：明确 ScrollView 与 view overflow 的职责边界
- 对属性面板的关键控件（尺寸/颜色/图片输入）补充交互测试或 Story/示例

---
