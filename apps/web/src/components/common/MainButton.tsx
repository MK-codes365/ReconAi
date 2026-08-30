'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface MainButtonProps {
  text: string;
  variant?: 'primary' | 'emerald' | 'danger' | 'secondary' | 'amber';
  size?: 'sm' | 'md' | 'lg' | string;
  isLoading?: boolean;
  disabled?: boolean;
  action?: () => void;
  iconComponent?: React.ReactNode;
  className?: string;
}

export default function MainButton({
  text,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  action,
  iconComponent,
  className = '',
}: MainButtonProps) {
  const variantStyles = {
    primary: 'bg-[#FA5D29] hover:bg-orange-600 text-white shadow-[#FA5D29]/25 border-transparent',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 border-transparent',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30 border-transparent',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30 border-transparent',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm',
  };

  const chosenSize = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md;

  return (
    <button
      onClick={action}
      disabled={disabled || isLoading}
      className={`rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${chosenSize} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white" />
      ) : (
        <>
          {iconComponent}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
