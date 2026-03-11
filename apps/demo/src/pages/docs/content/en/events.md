# Event System

Yoga Canvas implements a full-featured, web-standard **Retained Mode** event dispatching system. You can bind interaction events like clicks and swipes to Canvas nodes just as you would in the DOM.

---

## 1. Core Principles

Unlike traditional immediate-mode Canvas drawing, Yoga Canvas maintains a runtime node tree. When a user interacts with the Canvas, the engine executes the following flow:

1. **Hit Testing**: The engine traverses the node tree based on coordinates to find the deepest leaf node.
2. **Event Dispatching**: Manages the event stream via the `PointerEventDispatcher`.
3. **Propagation Mechanism**: Full support for both Capture and Bubble phases.

---

## 2. Propagation Phases

1. **Capture Phase**: Propagates from the root node down to the target node.
2. **Target Phase**: Triggers the event on the target node itself.
3. **Bubble Phase**: Propagates back up from the target node to the root.

> You can stop further propagation at any phase using `e.stopPropagation()`.

---

## 3. Supported Event Types

| Event Name | Description |
| :--- | :--- |
| `pointerdown` | Finger/Mouse pressed. |
| `pointermove` | Finger/Mouse moved. |
| `pointerup` | Finger/Mouse released. |
| `pointertap` | Click event (automatically determined by time/distance between press and release). |
| `scroll` | Exclusive to `ScrollView` nodes, includes `scrollLeft` and `scrollTop`. |

---

## 4. Event Object

The event object received in callbacks includes these core properties:

- `type`: The event type name.
- `targetId`: The ID of the deepest node that triggered the event.
- `currentTargetId`: The ID of the node currently handling the event.
- `x`, `y`: Coordinates relative to the top-left of the Canvas.
- `nativeEvent`: The original DOM or Mini Program event object.
- `stopPropagation()`: Call this to prevent the event from propagating further.

---

## 5. Usage Examples

### Using in JSX
In `@yoga-canvas/react`, you can bind events directly via props:

```tsx
<View
  style={{ width: 100, height: 100, backgroundColor: 'blue' }}
  onPointerTap={(e) => {
    console.log('Blue square clicked', e.targetId);
  }}
>
  <Text content="Click Me" />
</View>
```

### Stopping Propagation
```tsx
<View onPointerTap={() => console.log('Parent received click')}>
  <View
    onPointerTap={(e) => {
      e.stopPropagation(); // Prevents event from reaching the parent
      console.log('Child received click');
    }}
  />
</View>
```

---

## 6. Hit Testing Strategy

- **Opacity**: Nodes with `opacity: 0` can still receive events unless specific pointer-ignoring properties are set.
- **Overflow**: Even if a node is outside an `overflow: hidden` container, it can still be hit as long as it's within the Canvas bounds and not clipped.
- **Z-Index**: `zIndex` affects the hit testing order; nodes with higher z-index values are evaluated first.

