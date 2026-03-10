'use client';

import React from 'react';
import QRCode from 'react-qr-code';

interface JoinAccessModalProps {
  open: boolean;
  gameTitle: string;
  joinCode: string;
  onClose: () => void;
}

export default function JoinAccessModal({
  open,
  gameTitle,
  joinCode,
  onClose,
}: JoinAccessModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!open) return null;

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${joinCode}`
      : `/join/${joinCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy join link', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[101] w-full max-w-2xl rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Join Access
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Share with Players
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Use this for late arrivals or approved rejoins.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr] md:items-start">
          <div className="flex justify-center rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <QRCode value={joinUrl} className="h-52 w-52" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Game
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {gameTitle}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Join Code
              </div>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-lg text-slate-900">
                {joinCode}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Join Link
              </div>
              <div className="mt-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {joinUrl}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {copied ? 'Copied Join Link' : 'Copy Join Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}