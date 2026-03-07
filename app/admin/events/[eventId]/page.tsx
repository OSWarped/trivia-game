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
      return 'bg-green-100 text-green-700';
    case 'CLOSED':
      return 'bg-gray-200 text-gray-700';
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-700';
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-700';
    case 'CANCELED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
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
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading event...</div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <Link
          href="/admin/sites"
          className="mb-4 inline-flex items-center text-blue-600 hover:underline"
        >
          <ChevronLeft className="mr-1" size={18} />
          Back to Sites
        </Link>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error ?? 'Unable to load event.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Link
        href="/admin/sites"
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Sites
      </Link>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500">Event</p>
            <h1 className="text-3xl font-bold text-gray-900">{eventData.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Site: <span className="font-medium">{eventData.site.name}</span>
            </p>
          </div>

          <Link
            href={`/admin/events/${eventId}/seasons/new`}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <PlusCircle size={18} />
            New Season
          </Link>
        </div>
      </div>

      {activeSeason ? (
        <section className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Active Season
              </p>
              <h2 className="text-2xl font-bold text-gray-900">{activeSeason.name}</h2>
              <p className="mt-1 text-sm text-gray-700">
                {formatDate(activeSeason.startsAt)} - {formatDate(activeSeason.endsAt)}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {activeSeason.gameCount} game{activeSeason.gameCount === 1 ? '' : 's'}
              </p>
            </div>

            <Link
              href={`/admin/seasons/${activeSeason.id}`}
              className="inline-flex items-center rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow hover:bg-gray-50"
            >
              View Season Details
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Game title"
              className="rounded border p-2 md:col-span-2"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              type="datetime-local"
              className="rounded border p-2"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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
        <section className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">No Active Season</h2>
          <p className="mt-2 text-sm text-gray-700">
            Create or activate a season before drafting games for this event.
          </p>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Layers3 size={20} className="text-gray-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Seasons</h2>
        </div>

        {eventData.seasons.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-600">No seasons yet for this event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {eventData.seasons.map((season) => (
              <div key={season.id} className="rounded-xl bg-white p-5 shadow">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/admin/seasons/${season.id}`}
                      className="text-xl font-semibold text-gray-900 hover:underline"
                    >
                      {season.name}
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={16} />
                        {formatDate(season.startsAt)} - {formatDate(season.endsAt)}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${season.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {season.active ? 'Active' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-600">
                    <div className="inline-flex items-center gap-1">
                      <Trophy size={16} />
                      {season.gameCount} game{season.gameCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Game Highlights
                  </h3>

                  {season.games.length === 0 ? (
                    <p className="text-sm text-gray-500">No games in this season yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {season.games.map((game) => (
                        <li
                          key={game.id}
                          className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {game.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(game.scheduledFor)}
                            </p>
                          </div>

                          <span
                            className={`ml-3 rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
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

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={season.active}
                      onChange={() => {
                        void toggleActive(season.id, !season.active);
                      }}
                    />
                    Active
                  </label>

                  <div className="flex gap-3">
                    <Link
                      href={`/admin/seasons/${season.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View Details
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:underline"
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
  );
}