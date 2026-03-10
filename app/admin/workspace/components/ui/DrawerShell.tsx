'use client';

import React from 'react';

interface DrawerShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  meta?: string;
  widthClassName?: string;
  zIndexClassName?: string;
  bodyClassName?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DrawerShell({
  open,
  title,
  subtitle,
  meta,
  widthClassName = 'max-w-xl',
  zIndexClassName = 'z-40',
  bodyClassName = '',
  actions,
  footer,
  onClose,
  children,
}: DrawerShellProps) {
  if (!open) return null;

  const hasFooter = Boolean(footer);

  return (
    <div
      className={`fixed inset-y-0 right-0 ${zIndexClassName} w-full ${widthClassName} border-l border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),-12px_0_32px_rgba(15,23,42,0.12)]`}
    >
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {meta ? (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {meta}
                  </div>
                ) : null}

                <h3 className="truncate text-lg font-semibold text-slate-900">
                  {title}
                </h3>

                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {actions ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {actions}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${bodyClassName}`}
        >
          {children}
        </div>

        {hasFooter ? (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}