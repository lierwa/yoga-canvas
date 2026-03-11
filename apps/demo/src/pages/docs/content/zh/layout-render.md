---
title: 布局与渲染链路
description: 从 descriptor 到画面
order: 4
---

# 布局与渲染链路

Yoga Canvas 结合了 **Yoga Layout** 的布局能力与 **高性能 Canvas 2D** 的渲染能力，提供了一套类 Web 但高度优化的渲染管线。

---

## 1. 核心链路 (Pipeline)

1. **构建 (Build)**: 将 `NodeDescriptor` (JSX/JSON) 转换为扁平化的 `NodeTree`。
2. **布局 (Layout)**: 
   - 将 `flexStyle` 注入到 Yoga 引擎。
   - Yoga 计算出每个节点的相对坐标和尺寸。
   - 引擎将计算结果回填至节点的 `computedLayout` (`left`, `top`, `width`, `height`)。
3. **滚动计算 (Scroll)**: 针对 `ScrollView` 节点计算其内容区域的总尺寸 (`contentSize`)。
4. **绘制 (Render)**: 渲染器遍历节点树，根据 `visualStyle` 和 `computedLayout` 调用 Canvas API 进行像素级绘制。

---

## 2. 布局能力 (Layout Capabilities)

基于 [Yoga Layout](https://yogalayout.com/)，我们支持完整的 Flexbox 模型：

- **方向**: `flexDirection` (`row`, `column`, `row-reverse`, `column-reverse`)
- **对齐**: 
  - `justifyContent` (主轴): `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly`
  - `alignItems` (交叉轴): `flex-start`, `center`, `flex-end`, `stretch`
  - `alignSelf`: 允许单个节点覆盖容器的 `alignItems`
- **伸缩**: `flex`, `flexGrow`, `flexShrink`, `flexBasis`
- **间距**: `gap`, `rowGap`, `columnGap` (完美支持)
- **定位**: `position: relative` / `absolute` (支持 `top`, `right`, `bottom`, `left`)
- **盒模型**: `padding`, `margin` (支持上下左右独立配置)
- **尺寸**: `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` (支持像素和百分比)

---

## 3. CSS 样式支持清单

Yoga Canvas 对常用 CSS 属性进行了精细化实现：

### 基础样式
- `backgroundColor`: 支持 Hex, RGB, RGBA。
- `opacity`: 0 ~ 1 透明度。
- `zIndex`: 控制节点层级。
- `overflow`: `visible`, `hidden` (支持圆角裁剪)。

### 边框与圆角
- `borderWidth`, `borderColor`
- `borderRadius`: 支持统一圆角 (独立边框和独立圆角正在开发中)。

### 渐变 (Canvas 特色)
- `linearGradient`: 线性渐变 (支持角度、多个颜色停止点)。
- `radialGradient`: 径向渐变。

### 阴影
- `boxShadow`: 支持 `offsetX`, `offsetY`, `blur`, `spread`, `color`。

### 变换 (Transform)
- `translateX`, `translateY`, `scaleX`, `scaleY`, `rotate` (角度)。

---

## 4. Tailwind CSS 支持

在 `@yoga-canvas/react` 中，你可以通过 `className` 属性直接使用 Tailwind 类名。我们通过内置的解析器将 Tailwind 映射为引擎样式。

### 已支持的常用类名
- **布局**: `flex`, `flex-col`, `items-center`, `justify-between`, `grow`, `shrink-0`, `gap-4` 等。
- **间距/尺寸**: `p-4`, `m-2`, `w-full`, `h-[200px]`, `min-w-0` 等。
- **颜色/背景**: `bg-blue-500`, `bg-opacity-50`, `text-white` 等。
- **圆角/边框**: `rounded-xl`, `border`, `border-gray-200` 等。
- **文本**: `text-sm`, `font-bold`, `leading-relaxed`, `text-center` 等。

### 限制说明
- **不支持响应式断点**: 如 `md:flex` (Canvas 环境通常具有固定逻辑宽高)。
- **不支持伪类**: 如 `hover:bg-red-500` (需通过 React 状态或 `NodeAction` 处理)。
- **自定义单位**: 推荐使用 `[100px]` 这种显式单位，默认数值单位会根据配置解析。

---

## 5. 渲染特性

- **文本渲染**: 支持自动换行、`lineClamp` (多行截断)、`lineHeight` (倍数) 以及文本渐变色。
- **图片处理**: 支持 `objectFit` (`cover`, `contain`, `fill`)，确保图片在 Canvas 中完美缩放。
- **高性能裁剪**: 即使在数千个节点的复杂列表中，通过 `overflow: hidden` 和分层绘制技术，依然能保持 60FPS。


