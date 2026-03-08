import type { NodeDescriptor, NodeEventBindings, StyleProps } from '../types';
import { Text } from './Text';

export interface ButtonNodeProps {
  id?: string;
  name?: string;
  label: string;
  style?: StyleProps;
  textStyle?: StyleProps;
  onClick?: (e: unknown) => void;
  events?: NodeEventBindings;
  motion?: NodeDescriptor['motion'];
}

export function Button(props: ButtonNodeProps): NodeDescriptor {
  return {
    type: 'view',
    id: props.id,
    name: props.name ?? 'Button',
    style: props.style ?? {},
    motion: props.motion,
    onClick: props.onClick,
    events: props.events,
    children: [
      Text({
        name: 'ButtonLabel',
        content: props.label,
        style: {
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...(props.textStyle ?? {}),
        },
      }),
    ],
  };
}
