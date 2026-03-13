'use client';

import React, { JSX, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppBackground from '@/components/AppBackground';

interface FavoriteEntry {
  questionId: string;
  yourAnswer: string;
}

interface TeamResult {
  teamId: string;
  teamName: string;
  finalScore: number;
  rank: number;
  favorites: FavoriteEntry[];
}

interface HostResultsData {
  game: {
    id: string;
    title: string;
    date: string;
    status: 'DRAFT' | 'LIVE' | 'CLOSED';
  };
  teams: TeamResult[];
  totalTeams: number;
}

interface QuestionInfo {
  id: string;
  text: string;
}

function ordinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export default function HostResultsPage(): JSX.Element {
  const { gameId } = useParams() as { gameId: string };
  const router = useRouter();

  const [data, setData] = useState<HostResultsData | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    (async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/host/results?gameId=${gameId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          console.error('Failed to load host results', await res.text());
          setLoading(false);
          return;
        }

        const json = (await res.json()) as HostResultsData;

        if (json.game.status !== 'CLOSED') {
          router.replace(`/dashboard/host/${gameId}/play`);
          return;
        }

        setData(json);

        const qres = await fetch(`/api/host/games/${gameId}/questions`, {
          cache: 'no-store',
        });

        if (qres.ok) {
          const qs = (await qres.json()) as QuestionInfo[];
          const map: Record<string, string> = {};

          qs.forEach((q) => {
            map[q.id] = q.text;
          });

          setQuestionsMap(map);
        }
      } catch (err) {
        console.error('Error fetching host results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, router]);

  const derived = useMemo(() => {
    if (!data) {
      return {
        totalFavorites: 0,
        winningTeam: null as TeamResult | null,
        topScore: 0,
      };
    }

    const totalFavorites = data.teams.reduce(
      (sum, team) => sum + team.favorites.length,
      0
    );

    const winningTeam =
      data.teams.length > 0
        ? [...data.teams].sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return b.finalScore - a.finalScore;
          })[0]
        : null;

    const topScore = winningTeam?.finalScore ?? 0;

    return {
      totalFavorites,
      winningTeam,
      topScore,
    };
  }, [data]);

  if (loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="text-sm font-medium text-slate-600">
              Loading host results…
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
          <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="text-sm font-medium text-rose-600">
              Host results not available.
            </div>
          </div>
        </div>
      </AppBackground>
    );
  }

  const { game, teams, totalTeams } = data;
  const gameDateLabel = game.date
    ? new Date(game.date).toLocaleString()
    : '—';

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Host Results
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {game.title}
                </h1>

                <p className="mt-2 text-sm text-slate-600">{gameDateLabel}</p>

                <p className="mt-4 text-sm text-slate-500">Status</p>
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  Finalized
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total Teams
                </div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                  {totalTeams}
                </div>
                <div className="text-sm text-slate-500">submitted teams</div>

                {derived.winningTeam ? (
                  <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Winner: {derived.winningTeam.teamName}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Teams"
              value={`${totalTeams}`}
              sublabel="final standings"
            />
            <SummaryCard
              label="Winning Score"
              value={`${derived.topScore}`}
              sublabel="top points"
            />
            <SummaryCard
              label="Winning Team"
              value={derived.winningTeam?.teamName ?? '—'}
              sublabel={
                derived.winningTeam
                  ? `${ordinal(derived.winningTeam.rank)} place`
                  : '—'
              }
            />
            <SummaryCard
              label="Host Favorites"
              value={`${derived.totalFavorites}`}
              sublabel="answers selected"
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Team Standings
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Final ranking, score totals, and favorite answers for each team.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
              <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid md:grid-cols-[100px_minmax(0,1.2fr)_120px_minmax(0,1.8fr)] md:gap-4">
                <div>Rank</div>
                <div>Team</div>
                <div>Score</div>
                <div>Favorites</div>
              </div>

              <div className="divide-y divide-slate-200">
                {teams.map((team) => (
                  <div
                    key={team.teamId}
                    className="px-5 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[100px_minmax(0,1.2fr)_120px_minmax(0,1.8fr)] md:items-start">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                          Rank
                        </div>
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                          {ordinal(team.rank)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                          Team
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {team.teamName}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                          Score
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {team.finalScore}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                          Favorites
                        </div>

                        {team.favorites.length > 0 ? (
                          <div className="space-y-2">
                            {team.favorites.map((favorite, index) => (
                              <div
                                key={`${team.teamId}-${favorite.questionId}-${index}`}
                                className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2"
                              >
                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                                  {questionsMap[favorite.questionId] ??
                                    `Q${favorite.questionId}`}
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  “{favorite.yourAnswer || 'No answer submitted'}”
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/host"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>

            <Link
              href={`/dashboard/host/${gameId}/play/results`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Refresh
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