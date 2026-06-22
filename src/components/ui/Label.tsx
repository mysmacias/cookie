import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'label' | 'p';
  htmlFor?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className = '',
  as: Tag = 'span',
  htmlFor,
}) => (
  <Tag
    htmlFor={Tag === 'label' ? htmlFor : undefined}
    className={`text-[10px] font-label uppercase tracking-widest opacity-50 ${className}`}
  >
    {children}
  </Tag>
);
