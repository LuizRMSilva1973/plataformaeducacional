/// <reference types="react" />
import React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    cursor: 'pointer'
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#2563eb', color: 'white', borderColor: '#1d4ed8' },
    secondary: { background: 'white', color: '#111827' }
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}
