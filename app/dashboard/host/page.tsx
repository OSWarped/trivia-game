'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AppBackground from '@/components/AppBackground';

interface Game {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: 'DRAFT' | 'LIVE' | 'CLOSED' | 'SCHEDULED' | 'CANCELED';
}

const STATUS_STYLES: Record<Game['status'], string> = {
  DRAFT: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  LIVE: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  CLOSED: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  SCHEDULED: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  CANCELED: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
};

export default function HostDashboard() {
  const { user, isHost, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (!isHost && !isAdmin)) {
      router.push('/login');
    }
  }, [user, isHost, isAdmin, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/host/games', { credentials: 'include' });
        if (!res.ok) {
          setGames([]);
          return;
        }

        const data: unknown = await res.json();

        if (Array.isArray(data)) {
          setGames(data as Game[]);
        } else if (
          data &&
          typeof data === 'object' &&
          'games' in data &&
          Array.isArray((data as { games?: unknown }).games)
        ) {
          setGames((data as { games: Game[] }).games);
        } else {
          setGames([]);
        }
      } catch (err) {
        console.error('Error fetching host games:', err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleResetGame = async (gameId: string) => {
    const confirmed = confirm('Are you sure you want to reset this game?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/host/debug/reset-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Game reset successfully.');
      } else {
        alert(result.error || 'Failed to reset game.');
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('An error occurred while resetting the game.');
    }
  };

  const now = useMemo(() => new Date(), []);
  const upcoming = games.filter(
    (g) => g.scheduledFor && new Date(g.scheduledFor) >= now
  );
  const past = games.filter(
    (g) => g.scheduledFor && new Date(g.scheduledFor) < now
  );
  const liveCount = games.filter((g) => g.status === 'LIVE').length;
  const draftCount = games.filter((g) => g.status === 'DRAFT').length;

  function formatDate(dt: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
  }

  if (authLoading || loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            {authLoading ? 'Checking login...' : 'Loading games...'}
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Host Operations
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Quizam Host Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Manage upcoming games, launch live sessions, and review past
                  game activity from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAdmin ? (
                  <Link
                    href="/admin/workspace"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Admin Workspace
                  </Link>
                ) : null}

                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Home
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Games" value={games.length} />
            <StatCard label="Upcoming" value={upcoming.length} />
            <StatCard label="Live Now" value={liveCount} />
            <StatCard label="Drafts" value={draftCount} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Upcoming Games
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Games that are scheduled or still being prepared for launch.
                </p>
              </div>
            </div>

            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming games"
                description="Once games are scheduled, they’ll appear here for quick launch and editing."
              />
            ) : (
              <div className="space-y-4">
                {upcoming.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    dateLabel={formatDate(g.scheduledFor)}
                    actions={
                      <>
                        <button
                          onClick={() => handleResetGame(g.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Reset Game
                        </button>

                        {(g.status === 'DRAFT' || g.status === 'SCHEDULED') && (
                          <Link
                            href={`/dashboard/host/games/${g.id}/edit`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        )}

                        <Link
                          href={`/dashboard/host/${g.id}/command`}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Launch
                        </Link>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Past Games
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Review previous sessions and open historical game details.
              </p>
            </div>

            {past.length === 0 ? (
              <EmptyState
                title="No past games yet"
                description="Completed games will show up here once you’ve hosted a session."
              />
            ) : (
              <div className="space-y-4">
                {past.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    dateLabel={formatDate(g.scheduledFor)}
                    actions={
                      <Link
                        href={`/dashboard/host/games/${g.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppBackground>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-lg backdrop-blur-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}

function GameCard({
  game,
  dateLabel,
  actions,
}: {
  game: Game;
  dateLabel: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="truncate text-lg font-semibold text-slate-900">
            {game.title}
          </h3>

          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[game.status]
              }`}
          >
            {game.status}
          </span>
        </div>

        <div className="mt-2 text-sm text-slate-600">{dateLabel}</div>
      </div>

      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}