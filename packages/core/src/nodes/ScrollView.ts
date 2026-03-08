import type { NodeDescriptor, StyleProps, ScrollBarVisibility } from '../types';

export interface ScrollViewProps {
  id?: string;
  scrollDirection?: 'vertical' | 'horizontal';
  scrollBarVisibility?: ScrollBarVisibility;
  name?: string;
  style?: StyleProps;
  children?: NodeDescriptor[];
  motion?: NodeDescriptor['motion'];
}

export function ScrollView(props: ScrollViewProps = {}): NodeDescriptor {
  return {
    type: 'scrollview',
    id: props.id,
    name: props.name,
    style: props.style ?? {},
    children: props.children,
    scrollDirection: props.scrollDirection ?? 'vertical',
    scrollBarVisibility: props.scrollBarVisibility,
    motion: props.motion,
  };
}
