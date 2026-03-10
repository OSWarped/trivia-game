'use client';

import React, { JSX, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppBackground from '@/components/AppBackground';

interface AnswerPartResult {
  index: number;
  submitted: string;
  expected: string;
  isCorrect: boolean;
}

interface AnswerResult {
  questionId: string;
  roundNumber: number;
  questionNumber: number;
  text: string;
  yourAnswer: string;
  correctAnswer?: string;
  questionType: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER' | 'LIST';
  isCorrect: boolean;
  pointsDelta: number;
  favorite: boolean;
  parts?: AnswerPartResult[];
}

interface ResultsData {
  game: {
    id: string;
    title: string;
    date: string;
    status: 'DRAFT' | 'LIVE' | 'CLOSED';
    rank?: number;
    totalTeams?: number;
  };
  team: { id: string; name: string; finalScore: number; rank?: number };
  answers: AnswerResult[];
  stats: {
    totalCorrect: number;
    avgPoints: number;
    maxGain: number;
    maxLoss: number;
    favoritesCount: number;
  };
}

function ordinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function formatPointsDelta(points: number): string {
  if (points > 0) return `+${points}`;
  return `${points}`;
}

function isListQuestion(answer: AnswerResult): boolean {
  return answer.questionType === 'ORDERED' || answer.questionType === 'LIST';
}

function getPartiallyCorrectCount(parts?: AnswerPartResult[]): number {
  if (!parts?.length) return 0;
  return parts.filter((part) => part.isCorrect).length;
}

function sortAnswerResults(a: AnswerResult, b: AnswerResult): number {
  if (a.roundNumber !== b.roundNumber) {
    return a.roundNumber - b.roundNumber;
  }

  return a.questionNumber - b.questionNumber;
}

export default function ResultsPage(): JSX.Element {
  const { gameId } = useParams() as { gameId: string };
  const router = useRouter();
  const teamId =
    typeof window !== 'undefined' ? localStorage.getItem('teamId') : null;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !teamId) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/play/results?gameId=${gameId}&teamId=${teamId}`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          console.error('Failed to load results', await res.text());
          setLoading(false);
          return;
        }

        const json = (await res.json()) as ResultsData;

        if (json.game.status !== 'CLOSED') {
          router.replace(`/app/games/${gameId}/play`);
          return;
        }

        setData(json);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, teamId, router]);

  const sortedAnswers = useMemo(() => {
    if (!data) return [];
    return [...data.answers].sort(sortAnswerResults);
  }, [data]);

  const favoriteAnswers = useMemo(
    () => sortedAnswers.filter((answer) => answer.favorite),
    [sortedAnswers]
  );

  const derived = useMemo(() => {
    if (!data) {
      return {
        totalQuestions: 0,
        accuracy: 0,
      };
    }

    const totalQuestions = data.answers.length;
    const accuracy =
      totalQuestions > 0
        ? Math.round((data.stats.totalCorrect / totalQuestions) * 100)
        : 0;

    return {
      totalQuestions,
      accuracy,
    };
  }, [data]);

  if (loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="text-sm font-medium text-slate-600">
              Loading results…
            </div>
          </div>
        </div>
      </AppBackground>
    );
  }

  if (!data) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="text-sm font-medium text-rose-600">
              Results not available.
            </div>
          </div>
        </div>
      </AppBackground>
    );
  }

  const { game, team, stats } = data;
  const placement =
    team.rank != null && game.totalTeams != null
      ? `${ordinal(team.rank)} of ${game.totalTeams}`
      : null;

  const gameDateLabel = game.date
    ? new Date(game.date).toLocaleString()
    : '—';

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Game Complete
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {game.title}
                </h1>

                <p className="mt-2 text-sm text-slate-600">{gameDateLabel}</p>

                <p className="mt-4 text-sm text-slate-500">Team</p>
                <div className="text-xl font-semibold text-slate-900">
                  {team.name}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Final Score
                </div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                  {team.finalScore}
                </div>
                <div className="text-sm text-slate-500">points</div>

                {placement ? (
                  <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Finished {placement}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Final Score"
              value={`${team.finalScore}`}
              sublabel="points"
            />
            <SummaryCard
              label="Placement"
              value={team.rank != null ? ordinal(team.rank) : '—'}
              sublabel={
                game.totalTeams != null ? `out of ${game.totalTeams}` : '—'
              }
            />
            <SummaryCard
              label="Correct Answers"
              value={`${stats.totalCorrect}`}
              sublabel={`of ${derived.totalQuestions}`}
            />
            <SummaryCard
              label="Accuracy"
              value={`${derived.accuracy}%`}
              sublabel="overall"
            />
            <SummaryCard
              label="Host Favorites"
              value={`${stats.favoritesCount}`}
              sublabel="answers selected"
            />
          </section>

          {favoriteAnswers.length > 0 ? (
            <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Team Highlights
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Answers the host marked as favorites.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {favoriteAnswers.map((answer) => (
                  <div
                    key={answer.questionId}
                    className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Favorite
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Round {answer.roundNumber} • Q{answer.questionNumber}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-slate-900">
                      {answer.text}
                    </div>

                    <div className="mt-2 text-sm text-slate-700">
                      “{answer.yourAnswer || 'No answer submitted'}”
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Question Breakdown
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                A full recap of how your team performed across the game.
              </p>
            </div>

            <div className="space-y-4">
              {sortedAnswers.map((answer) => {
                const listQuestion = isListQuestion(answer);
                const correctParts = getPartiallyCorrectCount(answer.parts);
                const totalParts = answer.parts?.length ?? 0;
                const correctAnswerParts =
                  answer.correctAnswer
                    ?.split('|')
                    .map((part) => part.trim())
                    .filter(Boolean) ?? []

                return (
                  <div
                    key={answer.questionId}
                    className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Round {answer.roundNumber} • Question {answer.questionNumber}
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                          {answer.text}
                        </h3>

                        {!listQuestion ? (
                          <>
                            <div className="mt-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Your Answer
                              </div>
                              <div className="mt-1 text-sm text-slate-700">
                                {answer.yourAnswer || 'No answer submitted'}
                              </div>
                            </div>

                            {answer.correctAnswer ? (
                              <div className="mt-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Correct Answer
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  {answer.correctAnswer}
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="mt-4 space-y-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Answer Breakdown
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <div className="grid grid-cols-1 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid-cols-[80px_minmax(0,1fr)_120px]">
                                <div>Part</div>
                                <div>Your Answer</div>
                                <div>Status</div>
                              </div>

                              <div className="divide-y divide-slate-200">
                                {(answer.parts ?? []).map((part) => (
                                  <div
                                    key={`${answer.questionId}-${part.index}`}
                                    className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[80px_minmax(0,1fr)_120px] md:items-center"
                                  >
                                    <div className="font-medium text-slate-500">#{part.index}</div>

                                    <div className="text-slate-800">
                                      {part.submitted || '—'}
                                    </div>

                                    <div>
                                      <span
                                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${part.isCorrect
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-300 bg-rose-50 text-rose-700'
                                          }`}
                                      >
                                        {part.isCorrect ? 'Correct' : 'Incorrect'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {correctAnswerParts.length > 0 ? (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Correct Answer
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {correctAnswerParts.map((part, index) => (
                                    <span
                                      key={`${answer.questionId}-correct-${index}`}
                                      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700"
                                    >
                                      {index + 1}. {part}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        {listQuestion ? (
                          <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                            {correctParts} of {totalParts} correct
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${answer.isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-rose-300 bg-rose-50 text-rose-700'
                              }`}
                          >
                            {answer.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${answer.pointsDelta > 0
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : answer.pointsDelta < 0
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : 'border-slate-300 bg-slate-50 text-slate-700'
                            }`}
                        >
                          {formatPointsDelta(answer.pointsDelta)} pts
                        </span>

                        {answer.favorite ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Host Favorite
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <footer className="flex flex-wrap gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View Leaderboard
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Return Home
            </Link>
          </footer>
        </div>
      </div>
    </AppBackground>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-lg backdrop-blur-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-1 text-sm text-slate-500">{sublabel}</div>
      ) : null}
    </div>
  );
}