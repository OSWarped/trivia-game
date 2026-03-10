'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  Layers3,
  PlusCircle,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppBackground from '@/components/AppBackground';

interface GamePreview {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: string;
}

interface SeasonSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  gameCount: number;
  games: GamePreview[];
}

interface EventOverview {
  id: string;
  name: string;
  site: {
    id: string;
    name: string;
  };
  seasons: SeasonSummary[];
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

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventData, setEventData] = useState<EventOverview | null>(null);
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

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/events/${eventId}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load event details.');
      }

      const data = (await res.json()) as EventOverview;
      setEventData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!authChecked) return;
    void loadEvent();
  }, [authChecked, loadEvent]);

  const activeSeason = useMemo(
    () => eventData?.seasons.find((season) => season.active) ?? null,
    [eventData]
  );

  async function toggleActive(seasonId: string, value: boolean): Promise<void> {
    if (!eventData) return;

    const previous = eventData;

    setEventData({
      ...eventData,
      seasons: eventData.seasons.map((season) => ({
        ...season,
        active: season.id === seasonId ? value : value ? false : season.active,
      })),
    });

    const res = await fetch(`/api/admin/seasons/${seasonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: value }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setEventData(previous);
      window.alert(data.error ?? 'Failed to update season.');
      return;
    }

    await loadEvent();
  }

  async function deleteSeason(seasonId: string): Promise<void> {
    if (!window.confirm('Delete this season?')) return;

    const res = await fetch(`/api/admin/seasons/${seasonId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? 'Failed to delete season.');
      return;
    }

    await loadEvent();
  }

  async function createGame(): Promise<void> {
    if (!activeSeason) {
      window.alert('You need an active season before creating a game.');
      return;
    }

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

      const res = await fetch(`/api/admin/seasons/${activeSeason.id}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          scheduledFor,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create game.');
      }

      setNewTitle('');
      setScheduledFor('');
      await loadEvent();
    } catch {
      window.alert('Failed to create game.');
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading event...
          </div>
        </div>
      </AppBackground>
    );
  }

  if (error || !eventData) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl space-y-4">
            <Link
              href="/admin/workspace"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Admin Workspace
            </Link>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              {error ?? 'Unable to load event.'}
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
            <div>
              <Link
                href={`/admin/sites/${eventData.site.id}/events`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
              >
                <ChevronLeft size={18} />
                Back to Events
              </Link>
            </div>
          </div>

          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Event Management
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {eventData.name}
                </h1>

                <p className="mt-2 text-sm text-slate-600">
                  Site:{' '}
                  <span className="font-medium text-slate-800">
                    {eventData.site.name}
                  </span>
                </p>
              </div>

              <Link
                href={`/admin/events/${eventId}/seasons/new`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <PlusCircle size={18} />
                New Season
              </Link>
            </div>
          </header>

          {activeSeason ? (
            <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Active Season
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {activeSeason.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatDate(activeSeason.startsAt)} -{' '}
                    {formatDate(activeSeason.endsAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeSeason.gameCount} game
                    {activeSeason.gameCount === 1 ? '' : 's'}
                  </p>
                </div>

                <Link
                  href={`/admin/seasons/${activeSeason.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View Season Details
                </Link>
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
          ) : (
            <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 px-6 py-8">
                <h2 className="text-xl font-semibold text-slate-900">
                  No Active Season
                </h2>
                <p className="mt-2 text-sm text-slate-700">
                  Create or activate a season before drafting games for this
                  event.
                </p>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Layers3 size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Seasons</h2>
                <p className="text-sm text-slate-600">
                  Review season status, highlight recent games, and manage
                  activation.
                </p>
              </div>
            </div>

            {eventData.seasons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                <div className="text-lg font-semibold text-slate-900">
                  No seasons yet
                </div>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                  Create a season to begin scheduling games for this event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {eventData.seasons.map((season) => (
                  <div
                    key={season.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/admin/seasons/${season.id}`}
                          className="text-xl font-semibold text-slate-900 hover:underline"
                        >
                          {season.name}
                        </Link>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={16} />
                            {formatDate(season.startsAt)} -{' '}
                            {formatDate(season.endsAt)}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${season.active
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-300 bg-slate-100 text-slate-700'
                              }`}
                          >
                            {season.active ? 'Active' : 'Closed'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-600">
                        <div className="inline-flex items-center gap-1.5">
                          <Trophy size={16} />
                          {season.gameCount} game
                          {season.gameCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Game Highlights
                      </h3>

                      {season.games.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No games in this season yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {season.games.map((game) => (
                            <li
                              key={game.id}
                              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {game.title}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatDateTime(game.scheduledFor)}
                                </p>
                              </div>

                              <span
                                className={`ml-3 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                                  game.status
                                )}`}
                              >
                                {game.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={season.active}
                          onChange={() => {
                            void toggleActive(season.id, !season.active);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        Active
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/seasons/${season.id}`}
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View Details
                        </Link>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            void deleteSeason(season.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
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