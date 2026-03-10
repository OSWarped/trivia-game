'use client';

import React from 'react';

export interface ListItem {
  submitted: string;
  isCorrect: boolean | null;
}

export interface TeamAnswer {
  id: string;
  teamId: string;
  teamName: string;
  questionId: string;
  given: string;
  isCorrect: boolean | null;
  awardedPoints: number;
  pointsUsed: number;
  favorite: boolean;
  items?: ListItem[];
}

export interface Round {
  pointSystem: 'POOL' | 'FLAT';
  pointValue?: number;
}

export interface TeamAnswerWithFavorite extends TeamAnswer {
  favorite: boolean;
}

export interface TeamAnswerGridProps {
  teamAnswers: TeamAnswerWithFavorite[];
  currentRound: Round | null;
  handleScore: (teamId: string, questionId: string, isCorrect: boolean) => void;
  handleListScore: (
    teamId: string,
    questionId: string,
    itemIndex: number,
    isCorrect: boolean
  ) => void;
  handleFavorite: (
    teamId: string,
    questionId: string,
    favorite: boolean
  ) => void;
}

function getCardClasses(answer: TeamAnswerWithFavorite): string {
  if (answer.isCorrect === true) {
    return 'border-emerald-200 bg-emerald-50/40';
  }

  if (answer.isCorrect === false) {
    return 'border-rose-200 bg-rose-50/40';
  }

  return 'border-slate-200 bg-white/90';
}

function getStatusPill(answer: TeamAnswerWithFavorite) {
  if (answer.isCorrect === true) {
    return (
      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Correct
      </span>
    );
  }

  if (answer.isCorrect === false) {
    return (
      <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
        Incorrect
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Unscored
    </span>
  );
}

function renderAnswerContent(given: string) {
  try {
    const parsed = JSON.parse(given);

    if (Array.isArray(parsed)) {
      return (
        <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-800">
          {parsed.map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      );
    }
  } catch {
    // noop
  }

  return <p className="text-sm leading-6 text-slate-800">{given}</p>;
}

export default function TeamAnswerGrid({
  teamAnswers,
  currentRound,
  handleScore,
  handleListScore,
  handleFavorite,
}: TeamAnswerGridProps) {
  if (teamAnswers.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-xl backdrop-blur-sm">
        <div className="text-base font-semibold text-slate-900">
          No team answers submitted yet
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Submitted answers will appear here for scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-24 md:grid-cols-2 xl:grid-cols-3">
      {teamAnswers.map((answer) => {
        const displayPoints =
          answer.awardedPoints ||
          (currentRound?.pointSystem === 'FLAT'
            ? currentRound.pointValue ?? 0
            : 0);

        const isList = Array.isArray(answer.items);

        return (
          <article
            key={answer.id}
            className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${getCardClasses(
              answer
            )}`}
          >
            <div className="flex h-full flex-col gap-4">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    {answer.teamName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {getStatusPill(answer)}
                    {answer.favorite ? (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Favorite
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleFavorite(
                      answer.teamId,
                      answer.questionId,
                      !answer.favorite
                    )
                  }
                  className={`rounded-xl border px-2.5 py-1.5 text-sm font-medium transition ${
                    answer.favorite
                      ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                  title={answer.favorite ? 'Remove favorite' : 'Mark favorite'}
                >
                  {answer.favorite ? '★' : '☆'}
                </button>
              </header>

              <section className="rounded-xl border border-slate-200 bg-white/90 p-3">
                {isList ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Submitted Items
                    </div>

                    <div className="space-y-2">
                      {answer.items?.map((item, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="text-sm text-slate-800">
                              {item.submitted}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleListScore(
                                    answer.teamId,
                                    answer.questionId,
                                    index,
                                    true
                                  )
                                }
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                  item.isCorrect === true
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                Correct
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleListScore(
                                    answer.teamId,
                                    answer.questionId,
                                    index,
                                    false
                                  )
                                }
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                  item.isCorrect === false
                                    ? 'border-rose-600 bg-rose-600 text-white'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                Incorrect
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Submitted Answer
                    </div>
                    {renderAnswerContent(answer.given)}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <div className="text-sm text-slate-500">
                  {answer.pointsUsed == null
                    ? `Points: ${displayPoints}`
                    : `Points Used: ${answer.pointsUsed}`}
                </div>

                {!isList ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleScore(answer.teamId, answer.questionId, true)
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Mark Correct
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleScore(answer.teamId, answer.questionId, false)
                      }
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Mark Incorrect
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}