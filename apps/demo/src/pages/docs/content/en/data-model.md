---
title: Data Model
description: NodeDescriptor / NodeTree / ScrollManager
order: 3
---

# Data Model

Yoga Canvas's data architecture is divided into three core layers: **Declarative Descriptor**, **Runtime Node**, and **State Management**. This separation ensures high development efficiency, performance, and data serializability.

---

## 1. Declarative Layer: NodeDescriptor

`NodeDescriptor` is the primary interface for users to interact with the engine. Whether using JSX or the pure JS API, the result is always a descriptor tree.

- **Characteristics**: Pure object structure, easy to serialize and transmit.
- **Core Components**:
  - `type`: Node type (`view`, `text`, `image`, `scrollview`).
  - `style`: Mixed styles containing both Flex layout and visual properties.
  - `props`: Type-specific properties (e.g., `content` for Text, `src` for Image).
  - `children`: Array of child node descriptors.
  - `motion`: Animation definitions (initial/animate states, transitions).
  - `events`: Event bindings (clicks, pointer events, etc.).

---

## 2. Runtime Layer: CanvasNode & NodeTree

During engine initialization, the `NodeTreeManager` converts `NodeDescriptor` into `CanvasNode` and builds the `NodeTree`.

### CanvasNode (Core Entity)
Each node is normalized into a `CanvasNode` at runtime, with clearly categorized properties:
- **flexStyle**: Input parameters for the Yoga layout engine (e.g., `width`, `flexDirection`, `padding`).
- **visualStyle**: Input parameters for the Canvas drawing layer (e.g., `backgroundColor`, `borderRadius`, `opacity`).
- **TypeProps**: Specific business properties (`textProps`, `imageProps`, `scrollViewProps`).
- **computedLayout**: **(Crucial)** Final coordinates and sizes computed by Yoga (`left`, `top`, `width`, `height`). The renderer uses these values directly.

### NodeTree (Flattened Management)
The engine uses a flattened structure for efficiency and to support undo/redo:
- `rootId`: The ID of the root node.
- `nodes`: A record object keyed by ID, storing all `CanvasNode` instances.

---

## 3. State Management Layer: ScrollManager

To keep the `NodeTree` pure (serializable), we separate **high-frequency** state from the tree itself.

- **ScrollManager**: Independently manages the scroll positions (`scrollLeft`, `scrollTop`) of `ScrollView` nodes.
- **Benefits**: 
  - Scrolling doesn't require frequent tree modifications.
  - Facilitates synchronized and inertial scrolling logic.
  - The tree remains clean and serializable when exported to JSON.

---

## Data Flow Diagram

1. **Input**: `NodeDescriptor` (JSX/JSON)
2. **Transform**: `NodeTreeManager` builds the flattened tree.
3. **Compute**: `Yoga` processes `flexStyle` -> populates `computedLayout`.
4. **Render**: `Renderer` draws using `visualStyle` + `computedLayout`.
5. **Interact**: `PointerDispatcher` captures events -> updates `ScrollManager` or triggers `NodeAction`.

![Data Flow Architecture](/src/pages/docs/assets/data-modal-01.png)



