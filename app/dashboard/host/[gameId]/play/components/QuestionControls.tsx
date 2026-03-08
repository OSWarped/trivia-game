'use client';

import React from 'react';

interface QuestionControlsProps {
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  disablePrev?: boolean;
  disableNext?: boolean;
  isLastInRound: boolean;
  isFinalQuestion: boolean;
}

export default function QuestionControls({
  onPrev,
  onNext,
  disablePrev = false,
  disableNext = false,
  isLastInRound,
  isFinalQuestion,
}: QuestionControlsProps) {
  const statusMessage = isFinalQuestion
    ? 'Final question in this game'
    : isLastInRound
      ? 'Last question in this round'
      : null;

  const statusClasses = isFinalQuestion
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disablePrev}
            onClick={onPrev}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${disablePrev
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
          >
            Previous
          </button>

          <button
            type="button"
            disabled={disableNext}
            onClick={onNext}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${disableNext
                ? 'cursor-not-allowed border-blue-100 bg-blue-100 text-blue-300'
                : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            Next
          </button>
        </div>

        {statusMessage ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${statusClasses}`}
          >
            {statusMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}