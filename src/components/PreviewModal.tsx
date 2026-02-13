import type { CanvasNode, NodeTree, FlexStyle, FlexValue } from '../types';

interface PreviewModalProps {
  tree: NodeTree;
  onClose: () => void;
}

function flexValueToCSS(v: FlexValue | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (v === 'auto') return 'auto';
  if (typeof v === 'string' && v.endsWith('%')) return v;
  return `${v}px`;
}

function flexStyleToCSS(s: FlexStyle): React.CSSProperties {
  const css: React.CSSProperties = {
    display: 'flex',
    boxSizing: 'border-box',
  };
  if (s.width !== undefined) css.width = flexValueToCSS(s.width);
  if (s.height !== undefined) css.height = flexValueToCSS(s.height);
  css.flexDirection = s.flexDirection ?? 'column';
  if (s.justifyContent) css.justifyContent = s.justifyContent;
  if (s.alignItems) css.alignItems = s.alignItems;
  if (s.flexWrap) css.flexWrap = s.flexWrap;
  if (s.flex !== undefined) css.flex = s.flex;
  if (s.flexGrow !== undefined) css.flexGrow = s.flexGrow;
  if (s.flexShrink !== undefined) css.flexShrink = s.flexShrink;
  if (s.flexBasis !== undefined) css.flexBasis = flexValueToCSS(s.flexBasis);
  if (s.gap !== undefined) css.gap = flexValueToCSS(s.gap);
  if (s.rowGap !== undefined) css.rowGap = flexValueToCSS(s.rowGap);
  if (s.columnGap !== undefined) css.columnGap = flexValueToCSS(s.columnGap);
  if (s.paddingTop !== undefined) css.paddingTop = flexValueToCSS(s.paddingTop);
  if (s.paddingRight !== undefined) css.paddingRight = flexValueToCSS(s.paddingRight);
  if (s.paddingBottom !== undefined) css.paddingBottom = flexValueToCSS(s.paddingBottom);
  if (s.paddingLeft !== undefined) css.paddingLeft = flexValueToCSS(s.paddingLeft);
  if (s.marginTop !== undefined) css.marginTop = flexValueToCSS(s.marginTop);
  if (s.marginRight !== undefined) css.marginRight = flexValueToCSS(s.marginRight);
  if (s.marginBottom !== undefined) css.marginBottom = flexValueToCSS(s.marginBottom);
  if (s.marginLeft !== undefined) css.marginLeft = flexValueToCSS(s.marginLeft);
  if (s.positionType && s.positionType !== 'static') css.position = s.positionType;
  if (s.positionTop !== undefined) css.top = flexValueToCSS(s.positionTop);
  if (s.positionRight !== undefined) css.right = flexValueToCSS(s.positionRight);
  if (s.positionBottom !== undefined) css.bottom = flexValueToCSS(s.positionBottom);
  if (s.positionLeft !== undefined) css.left = flexValueToCSS(s.positionLeft);
  return css;
}

function PreviewNode({ node, tree }: { node: CanvasNode; tree: NodeTree }) {
  const flexCSS = flexStyleToCSS(node.flexStyle);
  const { backgroundColor, borderColor, borderWidth, borderRadius, opacity, rotation } = node.visualStyle;

  const style: React.CSSProperties = {
    ...flexCSS,
    backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
    borderColor: borderColor !== 'transparent' ? borderColor : undefined,
    borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
    borderStyle: borderWidth > 0 ? 'solid' : undefined,
    borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
    opacity,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    overflow: node.type === 'scrollview' ? 'auto' : undefined,
    minWidth: 0,
    minHeight: 0,
  };

  if (node.type === 'text' && node.textProps) {
    const { fontSize, fontWeight, color, lineHeight, textAlign } = node.textProps;
    return (
      <div
        style={{
          ...style,
          display: 'block',
          fontSize: `${fontSize}px`,
          fontWeight,
          color,
          lineHeight,
          textAlign,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {node.textProps.content}
      </div>
    );
  }

  if (node.type === 'image') {
    const imgSrc = node.imageProps?.src;
    const objFit = node.imageProps?.objectFit ?? 'cover';
    return (
      <div style={style}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={node.name}
            style={{ width: '100%', height: '100%', objectFit: objFit, display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#e0e7ff',
              fontSize: '24px',
            }}
          >
            🖼
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={style}>
      {node.children.map((childId) => {
        const child = tree.nodes[childId];
        if (!child) return null;
        return <PreviewNode key={childId} node={child} tree={tree} />;
      })}
    </div>
  );
}

export default function PreviewModal({ tree, onClose }: PreviewModalProps) {
  const root = tree.nodes[tree.rootId];
  if (!root) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white shadow-2xl rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600">Preview — {root.name}</span>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
          >
            ✕ Close
          </button>
        </div>
        <div className="overflow-auto" style={{ maxHeight: '85vh', maxWidth: '90vw' }}>
          <PreviewNode node={root} tree={tree} />
        </div>
      </div>
    </div>
  );
}
