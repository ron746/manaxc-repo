import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function Button({ 
  variant = 'default', 
  size = 'default', 
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 focus-visible:ring-gray-600',
    ghost: 'hover:bg-gray-100 focus-visible:ring-gray-600'
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-6'
  };
  
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim();
  
  return <button className={classes} {...props}>{props.children}</button>;
}
