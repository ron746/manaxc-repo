import React, { createContext, useContext, useState } from 'react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange: (value: string) => void;
}

export function Select({ children, value = '', onValueChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');
  
  const baseStyles = 'flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  const classes = `${baseStyles} ${className}`.trim();
  
  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={classes}
    >
      {children}
      <svg
        className={`h-4 w-4 opacity-50 transition-transform ${context.open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');
  
  return (
    <span className={!context.value ? 'text-gray-400' : ''}>
      {context.value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');
  
  if (!context.open) return null;
  
  const baseStyles = 'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg';
  const classes = `${baseStyles} ${className}`.trim();
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export function SelectItem({ children, value, className = '' }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');
  
  const baseStyles = 'relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none';
  const selectedStyles = context.value === value ? 'bg-gray-600' : '';
  const classes = `${baseStyles} ${selectedStyles} ${className}`.trim();
  
  return (
    <div
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      className={classes}
    >
      {children}
    </div>
  );
}
