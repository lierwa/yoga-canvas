import type { NodeDescriptor, StyleProps } from '@yoga-canvas/core';

export interface ImageJSXProps {
  id?: string;
  name?: string;
  className?: string;
  tw?: string;
  style?: StyleProps;
  motion?: NodeDescriptor['motion'];
  events?: NodeDescriptor['events'];
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

/**
 * JSX marker component for Image nodes.
 * Does NOT render to DOM — used by YogaCanvas to build the descriptor tree.
 */
export function Image(_props: ImageJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(Image as unknown as { __yogaNodeType: string }).__yogaNodeType = 'image';
