import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none';

const VARIANT: Record<ButtonVariant, string> = {
  default:
    'rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  primary: 'rounded-md border border-transparent bg-black/80 hover:bg-black/70 active:bg-black/60 text-white',
  ghost: 'rounded-md border border-transparent text-gray-700 hover:bg-gray-50',
  danger:
    'rounded-md border border-transparent bg-red-50 text-red-600 hover:bg-red-100',
  icon:
    'w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs font-medium',
  md: 'px-3 py-2 text-sm font-medium',
};

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  type,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type={type ?? 'button'}
      className={`${BASE} ${VARIANT[variant]} ${variant === 'icon' ? '' : SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
