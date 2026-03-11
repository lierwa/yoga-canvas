---
title: 数据模型
description: NodeDescriptor / NodeTree / ScrollManager
order: 3
---

# 数据模型

Yoga Canvas 的数据架构分为三个核心层次：**声明式描述 (Descriptor)**、**运行时节点 (Node)** 和 **状态管理 (State)**。这种分离确保了开发的高效性、渲染的高性能以及数据的可序列化。

---

## 1. 声明式描述层：NodeDescriptor

`NodeDescriptor` 是用户与引擎交互的主要媒介。无论你使用 JSX 还是纯 JS API，最终都会生成一个描述符树。

- **特点**：纯对象结构，易于序列化和远程下发。
- **核心组成**：
  - `type`: 节点类型 (`view`, `text`, `image`, `scrollview`)。
  - `style`: 混合样式，包含 Flex 布局和视觉样式。
  - `props`: 类型特定属性（如 Text 的 `content`，Image 的 `src`）。
  - `children`: 子节点描述符数组。
  - `motion`: 动画定义（初始状态、目标状态、过渡参数）。
  - `events`: 事件绑定（点击、指针事件等）。

---

## 2. 运行时节点层：CanvasNode & NodeTree

当引擎初始化时，`NodeTreeManager` 会将 `NodeDescriptor` 转换为 `CanvasNode` 并组建成 `NodeTree`。

### CanvasNode (核心实体)
每个节点在运行时都被规范化为 `CanvasNode`，其内部属性分类清晰：
- **flexStyle**: Yoga 引擎的输入参数（如 `width`, `flexDirection`, `padding`）。
- **visualStyle**: Canvas 绘图层的输入参数（如 `backgroundColor`, `borderRadius`, `opacity`）。
- **TypeProps**: 特定类型的业务属性（`textProps`, `imageProps`, `scrollViewProps`）。
- **computedLayout**: **(重要)** 由 Yoga 计算出的最终坐标和尺寸 (`left`, `top`, `width`, `height`)，绘图层直接使用这些值。

### NodeTree (扁平化管理)
为了提高查询效率和支持撤销/重做，引擎内部使用扁平化结构存储：
- `rootId`: 根节点 ID。
- `nodes`: 以 ID 为键的键值对对象，存储所有 `CanvasNode`。

---

## 3. 状态管理层：ScrollManager

为了保持 `NodeTree` 的纯粹性（可序列化），我们将**高频变化**的状态从节点树中分离。

- **ScrollManager**: 独立管理 `ScrollView` 的滚动位置 (`scrollLeft`, `scrollTop`)。
- **优势**: 
  - 滚动时不需要频繁修改节点树。
  - 方便实现滚动同步和惯性滚动逻辑。
  - 节点树在导出为 JSON 时，不会携带临时的滚动状态。

---

## 数据流转图示

1. **输入**: `NodeDescriptor` (JSX/JSON)
2. **转换**: `NodeTreeManager` 构建扁平树
3. **计算**: `Yoga` 计算 `flexStyle` -> 填充 `computedLayout`
4. **渲染**: `Renderer` 根据 `visualStyle` + `computedLayout` 绘制到 Canvas
5. **交互**: `PointerDispatcher` 捕获事件 -> 更新 `ScrollManager` 或触发 `NodeAction`

![数据流转架构图](/src/pages/docs/assets/data-modal-01.png)



