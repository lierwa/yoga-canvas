import type { StyleProps } from '@yoga-canvas/core';

export interface TextJSXProps {
  name?: string;
  style?: StyleProps;
  /** Text content. Also accepts children string. */
  content?: string;
  children?: React.ReactNode;
}

/**
 * JSX marker component for Text nodes.
 * Does NOT render to DOM — used by YogaCanvas to build the descriptor tree.
 *
 * Content can be set via `content` prop or as children:
 * ```tsx
 * <Text content="Hello" />
 * <Text>Hello</Text>
 * ```
 */
export function Text(_props: TextJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(Text as unknown as { __yogaNodeType: string }).__yogaNodeType = 'text';
