import type { NodeDescriptor, StyleProps } from '../types';

export interface ViewProps {
  id?: string;
  name?: string;
  style?: StyleProps;
  children?: NodeDescriptor[];
  motion?: NodeDescriptor['motion'];
}

export function View(props: ViewProps = {}): NodeDescriptor {
  return {
    type: 'view',
    id: props.id,
    name: props.name,
    style: props.style ?? {},
    children: props.children,
    motion: props.motion,
  };
}
