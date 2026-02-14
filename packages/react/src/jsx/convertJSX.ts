import React from 'react';
import type { NodeDescriptor } from '@yaga-canvas/core';

interface YagaComponent {
  __yagaNodeType?: string;
}

/**
 * Convert React JSX children into an array of NodeDescriptors.
 * Traverses the React element tree without rendering to DOM.
 */
export function convertChildrenToDescriptors(
  children: React.ReactNode,
): NodeDescriptor[] {
  const result: NodeDescriptor[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const descriptor = convertElementToDescriptor(child);
    if (descriptor) {
      result.push(descriptor);
    }
  });

  return result;
}

function convertElementToDescriptor(
  element: React.ReactElement,
): NodeDescriptor | null {
  const type = element.type as YagaComponent;
  const nodeType = type?.__yagaNodeType;

  if (!nodeType) {
    // Fragment: flatten children
    if (element.type === React.Fragment) {
      const descs = convertChildrenToDescriptors(
        (element.props as { children?: React.ReactNode }).children,
      );
      return descs.length === 1 ? descs[0] : null;
    }

    // Regular function component — call it to get its Yaga element output
    if (typeof element.type === 'function') {
      try {
        const result = (element.type as (props: Record<string, unknown>) => React.ReactElement | null)(
          element.props as Record<string, unknown>,
        );
        if (result && React.isValidElement(result)) {
          return convertElementToDescriptor(result);
        }
      } catch {
        // Silently ignore components that can't be called
      }
    }

    return null;
  }

  const props = element.props as Record<string, unknown>;

  switch (nodeType) {
    case 'view':
      return {
        type: 'view',
        name: props.name as string | undefined,
        style: (props.style as NodeDescriptor['style']) ?? {},
        children: props.children
          ? convertChildrenToDescriptors(props.children as React.ReactNode)
          : undefined,
      };

    case 'text': {
      // Content from `content` prop or children string
      let content = (props.content as string) ?? '';
      if (!content && props.children) {
        content = extractTextContent(props.children as React.ReactNode);
      }
      return {
        type: 'text',
        name: props.name as string | undefined,
        style: (props.style as NodeDescriptor['style']) ?? {},
        content,
      };
    }

    case 'image':
      return {
        type: 'image',
        name: props.name as string | undefined,
        style: (props.style as NodeDescriptor['style']) ?? {},
        src: props.src as string,
        objectFit: props.objectFit as NodeDescriptor['objectFit'],
      };

    case 'scrollview':
      return {
        type: 'scrollview',
        name: props.name as string | undefined,
        style: (props.style as NodeDescriptor['style']) ?? {},
        scrollDirection: props.scrollDirection as NodeDescriptor['scrollDirection'],
        children: props.children
          ? convertChildrenToDescriptors(props.children as React.ReactNode)
          : undefined,
      };

    default:
      return null;
  }
}

/**
 * Extract plain text from React children (strings and numbers only).
 */
function extractTextContent(children: React.ReactNode): string {
  const parts: string[] = [];
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string') {
      parts.push(child);
    } else if (typeof child === 'number') {
      parts.push(String(child));
    }
  });
  return parts.join('');
}
