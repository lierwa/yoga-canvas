import type { NodeDescriptor, ScrollBarVisibility, StyleProps } from '@yoga-canvas/core';

export interface ScrollViewJSXProps {
  id?: string;
  name?: string;
  className?: string;
  tw?: string;
  style?: StyleProps;
  motion?: NodeDescriptor['motion'];
  events?: NodeDescriptor['events'];
  scrollDirection?: 'vertical' | 'horizontal';
  scrollBarVisibility?: ScrollBarVisibility;
  children?: React.ReactNode;
}

/**
 * JSX marker component for ScrollView nodes.
 * Does NOT render to DOM — used by YogaCanvas to build the descriptor tree.
 */
export function ScrollView(_props: ScrollViewJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(ScrollView as unknown as { __yogaNodeType: string }).__yogaNodeType = 'scrollview';
