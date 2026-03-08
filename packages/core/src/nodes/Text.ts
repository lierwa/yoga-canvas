import type { NodeDescriptor, StyleProps } from '../types';

export interface TextNodeProps {
  id?: string;
  content: string;
  name?: string;
  style?: StyleProps;
  motion?: NodeDescriptor['motion'];
}

export function Text(props: TextNodeProps): NodeDescriptor {
  return {
    type: 'text',
    id: props.id,
    name: props.name,
    style: props.style ?? {},
    content: props.content,
    motion: props.motion,
  };
}
