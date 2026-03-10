'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CalendarDays, Trophy, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppBackground from '@/components/AppBackground';

interface SeasonDetailData {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  event: {
    id: string;
    name: string;
    site: {
      id: string;
      name: string;
    };
  };
}

interface GameRow {
  id: string;
  title: string;
  joinCode: string;
  special: boolean;
  tag: string | null;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

interface Standing {
  teamId: string;
  team: string;
  games: number;
  points: number;
}

function formatDate(date: string | null): string {
  if (!date) return 'Ongoing';
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date: string | null): string {
  if (!date) return 'Unscheduled';
  return new Date(date).toLocaleString();
}

function getStatusBadgeClasses(status: string): string {
  switch (status.toUpperCase()) {
    case 'LIVE':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'CLOSED':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    case 'DRAFT':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'SCHEDULED':
      return 'border-blue-300 bg-blue-50 text-blue-700';
    case 'CANCELED':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-600';
  }
}

export default function SeasonDetailPage() {
  const { id: seasonId } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [season, setSeason] = useState<SeasonDetailData | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [table, setTable] = useState<Standing[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
  }, [authLoading, isAdmin, router]);

  const loadSeason = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [seasonRes, gamesRes, standingsRes] = await Promise.all([
        fetch(`/api/admin/seasons/${seasonId}`, { cache: 'no-store' }),
        fetch(`/api/admin/seasons/${seasonId}/games`, { cache: 'no-store' }),
        fetch(`/api/admin/seasons/${seasonId}/standings`, { cache: 'no-store' }),
      ]);

      if (!seasonRes.ok) {
        throw new Error('Failed to load season details.');
      }

      if (!gamesRes.ok) {
        throw new Error('Failed to load season games.');
      }

      if (!standingsRes.ok) {
        throw new Error('Failed to load standings.');
      }

      const seasonData = (await seasonRes.json()) as SeasonDetailData;
      const gamesData = (await gamesRes.json()) as GameRow[];
      const standingsData = (await standingsRes.json()) as Standing[];

      setSeason(seasonData);
      setGames(gamesData);
      setTable(standingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    if (!authChecked) return;
    void loadSeason();
  }, [authChecked, loadSeason]);

  async function createGame(): Promise<void> {
    if (!newTitle.trim()) {
      window.alert('Game title is required.');
      return;
    }

    if (!scheduledFor) {
      window.alert('Scheduled date/time is required.');
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/seasons/${seasonId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          scheduledFor,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to create game.');
      }

      setNewTitle('');
      setScheduledFor('');
      await loadSeason();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create game.');
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading season...
          </div>
        </div>
      </AppBackground>
    );
  }

  if (error || !season) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl space-y-4">
            <Link
              href="/admin/sites"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Sites
            </Link>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              {error ?? 'Unable to load season.'}
            </div>
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <Link
              href={`/admin/events/${season.event.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Event
            </Link>
          </div>

          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Season Management
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {season.name}
                </h1>

                <p className="mt-2 text-sm text-slate-600">
                  Event: <span className="font-medium text-slate-800">{season.event.name}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Site: <span className="font-medium text-slate-800">{season.event.site.name}</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={16} />
                    {formatDate(season.startsAt)} - {formatDate(season.endsAt)}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      season.active
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {season.active ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{games.length}</span>{' '}
                game{games.length === 1 ? '' : 's'}
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <PlusCircle size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Draft Game in This Season
                </h2>
                <p className="text-sm text-slate-600">
                  Create a new draft game and attach it to this season.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <input
                type="text"
                placeholder="Game title"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void createGame();
                }}
                disabled={saving || !newTitle.trim() || !scheduledFor}
              >
                {saving ? 'Creating...' : 'Draft Game'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Trophy size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Standings</h2>
                <p className="text-sm text-slate-600">
                  Current season totals across participating teams.
                </p>
              </div>
            </div>

            {table.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                <div className="text-lg font-semibold text-slate-900">
                  No standings yet
                </div>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                  Standings will appear here once teams have played games in this season.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        #
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        Team
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        Games
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, idx) => (
                      <tr key={row.teamId} className="hover:bg-slate-50/80">
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                          {row.team}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {row.games}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Games in Season</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review games attached to this season and jump into game detail.
              </p>
            </div>

            {games.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                <div className="text-lg font-semibold text-slate-900">
                  No games yet
                </div>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                  No games have been created for this season yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">
                          {game.title}
                        </p>

                        {game.special ? (
                          <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {game.tag ?? 'Special'}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Scheduled: {formatDateTime(game.scheduledFor)}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Join Code:{' '}
                        <span className="font-mono font-medium text-slate-800">
                          {game.joinCode}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                          game.status
                        )}`}
                      >
                        {game.status}
                      </span>

                      <Link
                        href={`/admin/games/${game.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View Game
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppBackground>
  );
}