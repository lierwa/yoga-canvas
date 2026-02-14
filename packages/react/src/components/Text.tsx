import type { StyleProps } from '@yaga-canvas/core';

export interface TextJSXProps {
  name?: string;
  style?: StyleProps;
  /** Text content. Also accepts children string. */
  content?: string;
  children?: React.ReactNode;
}

/**
 * JSX marker component for Text nodes.
 * Does NOT render to DOM — used by YagaCanvas to build the descriptor tree.
 *
 * Content can be set via `content` prop or as children:
 * ```tsx
 * <Text content="Hello" />
 * <Text>Hello</Text>
 * ```
 */
export function Text(_props: TextJSXProps): React.ReactElement | null {
  return null;
}

(Text as unknown as { __yagaNodeType: string }).__yagaNodeType = 'text';
