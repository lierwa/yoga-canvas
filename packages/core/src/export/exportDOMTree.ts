import type { CanvasNode, NodeTree, FlexValue } from '../types';

/**
 * Export the node tree as an HTML string using CSS flexbox layout.
 * Useful for preview rendering or server-side generation.
 */
export function exportToDOMString(tree: NodeTree): string {
  const root = tree.nodes[tree.rootId];
  if (!root) return '';
  return renderNodeToHTML(root, tree);
}

function renderNodeToHTML(node: CanvasNode, tree: NodeTree): string {
  const style = buildCSSString(node);
  const tag = 'div';

  if (node.type === 'text' && node.textProps) {
    const textStyle = buildTextCSSString(node);
    const content = escapeHTML(node.textProps.content);
    return `<${tag} style="${style}${textStyle}">${content}</${tag}>`;
  }

  if (node.type === 'image' && node.imageProps) {
    const imgSrc = escapeHTML(node.imageProps.src);
    const objFit = node.imageProps.objectFit || 'cover';
    const imgStyle = `width:100%;height:100%;object-fit:${objFit};display:block;`;
    if (imgSrc) {
      return `<${tag} style="${style}"><img src="${imgSrc}" style="${imgStyle}" alt="${escapeHTML(node.name)}" /></${tag}>`;
    }
    return `<${tag} style="${style}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e0e7ff;font-size:24px;">\u{1F5BC}</div></${tag}>`;
  }

  const childrenHTML = node.children
    .map((childId) => tree.nodes[childId])
    .filter(Boolean)
    .map((child) => renderNodeToHTML(child, tree))
    .join('');

  return `<${tag} style="${style}">${childrenHTML}</${tag}>`;
}

function flexValueToCSS(v: FlexValue | undefined): string | null {
  if (v === undefined) return null;
  if (v === 'auto') return 'auto';
  if (typeof v === 'string' && v.endsWith('%')) return v;
  return `${v}px`;
}

function buildCSSString(node: CanvasNode): string {
  const s = node.flexStyle;
  const v = node.visualStyle;
  const parts: string[] = ['display:flex;', 'box-sizing:border-box;'];

  const addProp = (cssProp: string, value: FlexValue | undefined) => {
    const css = flexValueToCSS(value);
    if (css !== null) parts.push(`${cssProp}:${css};`);
  };

  addProp('width', s.width);
  addProp('height', s.height);
  addProp('min-width', s.minWidth);
  addProp('min-height', s.minHeight);
  addProp('max-width', s.maxWidth);
  addProp('max-height', s.maxHeight);

  if (s.flexDirection) parts.push(`flex-direction:${s.flexDirection};`);
  if (s.justifyContent) parts.push(`justify-content:${s.justifyContent};`);
  if (s.alignItems) parts.push(`align-items:${s.alignItems};`);
  if (s.alignSelf) parts.push(`align-self:${s.alignSelf};`);
  if (s.flexWrap) parts.push(`flex-wrap:${s.flexWrap};`);
  if (s.flex !== undefined) parts.push(`flex:${s.flex};`);
  if (s.flexGrow !== undefined) parts.push(`flex-grow:${s.flexGrow};`);
  if (s.flexShrink !== undefined) parts.push(`flex-shrink:${s.flexShrink};`);
  addProp('flex-basis', s.flexBasis);
  addProp('gap', s.gap);
  addProp('row-gap', s.rowGap);
  addProp('column-gap', s.columnGap);
  addProp('padding-top', s.paddingTop);
  addProp('padding-right', s.paddingRight);
  addProp('padding-bottom', s.paddingBottom);
  addProp('padding-left', s.paddingLeft);
  addProp('margin-top', s.marginTop);
  addProp('margin-right', s.marginRight);
  addProp('margin-bottom', s.marginBottom);
  addProp('margin-left', s.marginLeft);

  if (s.position && s.position !== 'static') parts.push(`position:${s.position};`);
  addProp('top', s.top);
  addProp('right', s.right);
  addProp('bottom', s.bottom);
  addProp('left', s.left);

  if (v.backgroundColor && v.backgroundColor !== 'transparent') {
    parts.push(`background-color:${v.backgroundColor};`);
  }
  if (v.borderWidth && v.borderWidth > 0) {
    parts.push(`border:${v.borderWidth}px solid ${v.borderColor || 'transparent'};`);
  }
  if (v.borderRadius && v.borderRadius > 0) {
    parts.push(`border-radius:${v.borderRadius}px;`);
  }
  if (v.opacity !== undefined && v.opacity < 1) {
    parts.push(`opacity:${v.opacity};`);
  }
  if (v.rotate) {
    parts.push(`transform:rotate(${v.rotate}deg);`);
  }
  if (node.type === 'scrollview') {
    parts.push('overflow:auto;');
  }

  return parts.join('');
}

function buildTextCSSString(node: CanvasNode): string {
  if (!node.textProps) return '';
  const t = node.textProps;
  const parts: string[] = [
    'display:block;',
    `font-size:${t.fontSize}px;`,
    `font-weight:${t.fontWeight};`,
    `color:${t.color};`,
    `line-height:${t.lineHeight};`,
    `text-align:${t.textAlign};`,
    'white-space:pre-wrap;',
    'word-break:break-word;',
  ];
  if (t.fontFamily) parts.push(`font-family:${t.fontFamily};`);
  return parts.join('');
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
