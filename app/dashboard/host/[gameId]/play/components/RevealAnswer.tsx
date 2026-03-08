'use client';

import React, { useState } from 'react';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options?: QuestionOption[];
}

interface RevealAnswerProps {
  question: Question | null;
}

export default function RevealAnswer({ question }: RevealAnswerProps) {
  const [open, setOpen] = useState(false);

  if (!question) return null;

  const correctOptions = (question.options ?? []).filter((option) => option.isCorrect);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        Reveal Answer
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Correct Answer
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Review the accepted answer for the current question.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Hide
        </button>
      </div>

      <div className="mt-4">
        {correctOptions.length > 0 ? (
          <ul className="space-y-2">
            {correctOptions.map((option) => (
              <li
                key={option.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                {option.text}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No correct answer options are configured for this question.
          </div>
        )}
      </div>
    </div>
  );
}