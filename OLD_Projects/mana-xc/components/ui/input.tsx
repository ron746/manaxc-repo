import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ 
  className = '', 
  error = false,
  ...props 
}: InputProps) {
  const baseStyles = 'flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  
  const errorStyles = error 
    ? 'border-red-500 focus-visible:ring-red-500' 
    : 'border-gray-300 focus-visible:ring-blue-600';
  
  const classes = `${baseStyles} ${errorStyles} ${className}`.trim();
  
  return <input className={classes} {...props} />;
}
