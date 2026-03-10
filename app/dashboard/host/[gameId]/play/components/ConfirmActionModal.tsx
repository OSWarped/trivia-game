'use client';

import React from 'react';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'neutral';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function getConfirmButtonClasses(
  tone: ConfirmActionModalProps['tone']
): string {
  switch (tone) {
    case 'danger':
      return 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700';
    case 'primary':
      return 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';
    case 'neutral':
    default:
      return 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  }
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'neutral',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={isLoading ? undefined : onCancel}
      />

      <div className="relative z-[101] w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>

            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${getConfirmButtonClasses(
                tone
              )}`}
            >
              {isLoading ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}