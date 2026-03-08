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
      return 'border-red-200 bg-red-600 text-white hover:bg-red-700';
    case 'primary':
      return 'border-blue-200 bg-blue-600 text-white hover:bg-blue-700';
    case 'neutral':
    default:
      return 'border-gray-300 bg-gray-800 text-white hover:bg-gray-900';
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={isLoading ? undefined : onCancel}
      />

      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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