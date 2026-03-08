import type { NodeDescriptor, StyleProps } from '@yoga-canvas/core';

export interface ViewJSXProps {
  id?: string;
  name?: string;
  className?: string;
  tw?: string;
  style?: StyleProps;
  motion?: NodeDescriptor['motion'];
  events?: NodeDescriptor['events'];
  children?: React.ReactNode;
}

/**
 * JSX marker component for View nodes.
 * Does NOT render to DOM — used by YogaCanvas to build the descriptor tree.
 */
export function View(_props: ViewJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(View as unknown as { __yogaNodeType: string }).__yogaNodeType = 'view';
