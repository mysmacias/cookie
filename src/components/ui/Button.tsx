import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary font-bold hover:bg-primary-container transition-all shadow-lg shadow-primary/20',
  outline:
    'border border-outline-variant hover:bg-surface-container transition-colors',
  ghost:
    'hover:bg-surface-container transition-colors',
  danger:
    'border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[10px]',
  md: 'px-6 py-3 text-xs',
  lg: 'px-8 py-5 text-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'md',
  pill = true,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => (
  <button
    type="button"
    disabled={disabled}
    className={[
      'inline-flex items-center justify-center gap-2 font-label uppercase tracking-widest',
      pill ? 'rounded-full' : 'rounded-xl',
      variantClasses[variant],
      sizeClasses[size],
      disabled ? 'opacity-40 cursor-not-allowed' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  >
    {icon}
    {children}
  </button>
);
