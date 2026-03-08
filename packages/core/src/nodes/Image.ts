import type { NodeDescriptor, StyleProps } from '../types';

export interface ImageNodeProps {
  id?: string;
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  name?: string;
  style?: StyleProps;
  motion?: NodeDescriptor['motion'];
}

export function Image(props: ImageNodeProps): NodeDescriptor {
  return {
    type: 'image',
    id: props.id,
    name: props.name,
    style: props.style ?? {},
    src: props.src,
    objectFit: props.objectFit ?? 'cover',
    motion: props.motion,
  };
}
