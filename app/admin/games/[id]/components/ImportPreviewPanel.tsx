'use client';

import React from 'react';

type PreviewOption = {
  text: string;
  isCorrect: boolean;
  sortOrder: number | null;
};

type PreviewQuestion = {
  text: string;
  type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER' | 'LIST';
  sortOrder: number;
  options: PreviewOption[];
};

type PreviewRound = {
  name: string;
  roundType: 'POINT_BASED' | 'TIME_BASED' | 'WAGER' | 'LIGHTNING' | 'IMAGE';
  pointSystem: 'POOL' | 'FLAT';
  maxPoints: number | null;
  pointValue: number | null;
  pointPool: number[];
  timeLimit: number | null;
  wagerLimit: number | null;
  sortOrder: number;
  questions: PreviewQuestion[];
};

export type ImportPreviewData = {
  title: string | null;
  tag: string | null;
  rounds: PreviewRound[];
};

interface ImportPreviewPanelProps {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    roundCount: number;
    questionCount: number;
    optionCount: number;
  } | null;
  preview: ImportPreviewData | null;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function MessageList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'error' | 'warning';
}) {
  if (items.length === 0) return null;

  const containerClasses =
    tone === 'error'
      ? 'border-red-200 bg-red-50'
      : 'border-amber-200 bg-amber-50';

  const titleClasses =
    tone === 'error' ? 'text-red-800' : 'text-amber-800';

  const itemClasses =
    tone === 'error' ? 'text-red-700' : 'text-amber-700';

  return (
    <div className={`rounded-xl border p-4 ${containerClasses}`}>
      <h3 className={`text-sm font-semibold ${titleClasses}`}>{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className={`text-sm ${itemClasses}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ImportPreviewPanel({
  ok,
  errors,
  warnings,
  summary,
  preview,
}: ImportPreviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Import Preview
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review the parsed game structure before committing changes.
            </p>
          </div>

          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              ok
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {ok ? 'Ready to Import' : 'Needs Fixes'}
          </div>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Rounds" value={summary.roundCount} />
          <StatCard label="Questions" value={summary.questionCount} />
          <StatCard label="Options" value={summary.optionCount} />
        </div>
      ) : null}

      <MessageList title="Errors" items={errors} tone="error" />
      <MessageList title="Warnings" items={warnings} tone="warning" />

      {preview ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Title
                </div>
                <div className="mt-2 text-sm text-slate-900">
                  {preview.title ?? 'No title override'}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Tag
                </div>
                <div className="mt-2 text-sm text-slate-900">
                  {preview.tag ?? 'No tag'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {preview.rounds.map((round) => (
              <div
                key={`round-${round.sortOrder}-${round.name}`}
                className="rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Round {round.sortOrder}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {round.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {round.roundType}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {round.pointSystem}
                      </span>
                      {round.pointValue !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Point Value: {round.pointValue}
                        </span>
                      ) : null}
                      {round.maxPoints !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Max Points: {round.maxPoints}
                        </span>
                      ) : null}
                      {round.timeLimit !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Time Limit: {round.timeLimit}s
                        </span>
                      ) : null}
                      {round.wagerLimit !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Wager Limit: {round.wagerLimit}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {round.pointPool.length > 0 ? (
                    <div className="mt-3 text-sm text-slate-600">
                      Point Pool: {round.pointPool.join(', ')}
                    </div>
                  ) : null}
                </div>

                <div className="divide-y divide-slate-200">
                  {round.questions.map((question) => (
                    <div
                      key={`question-${round.sortOrder}-${question.sortOrder}`}
                      className="px-5 py-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Question {question.sortOrder}
                          </div>
                          <div className="mt-1 text-sm font-medium leading-6 text-slate-900">
                            {question.text}
                          </div>
                        </div>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {question.type}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={`option-${question.sortOrder}-${optionIndex}`}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              option.isCorrect
                                ? 'border-green-200 bg-green-50 text-green-800'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{option.text}</span>
                              <div className="flex items-center gap-2">
                                {option.sortOrder !== null ? (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                                    Sort {option.sortOrder}
                                  </span>
                                ) : null}
                                {option.isCorrect ? (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                    Correct
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}