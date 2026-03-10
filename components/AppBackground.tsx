'use client';

import { ReactNode } from 'react';

type AppBackgroundVariant = 'hero' | 'dashboard' | 'minimal';

interface AppBackgroundProps {
  children: ReactNode;
  variant?: AppBackgroundVariant;
  className?: string;
}

const variantClasses: Record<AppBackgroundVariant, string> = {
  hero: 'bg-slate-950 text-white',
  dashboard: 'bg-slate-950 text-slate-100',
  minimal: 'bg-slate-950 text-slate-100',
};

const overlayClasses: Record<AppBackgroundVariant, string> = {
  hero:
    'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_30%)]',
  dashboard:
    'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_26%)]',
  minimal:
    'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.05),transparent_22%)]',
};

export default function AppBackground({
  children,
  variant = 'hero',
  className = '',
}: AppBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden ${variantClasses[variant]} ${className}`}
    >
      <div className={`absolute inset-0 ${overlayClasses[variant]}`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}