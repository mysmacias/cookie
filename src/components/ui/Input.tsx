import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
