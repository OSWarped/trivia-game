'use client';

import React from 'react';

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export default function ToolbarButton({
  label,
  onClick,
  primary = false,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
          : primary
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}