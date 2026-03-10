'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CalendarDays, FolderTree, MapPin, } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface GameListItem {
  id: string;
  title: string;
  joinCode: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  special: boolean;
  tag: string | null;
  season: {
    id: string;
    name: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface EventGroup {
  eventId: string;
  eventName: string;
  upcomingGames: GameListItem[];
  pastGames: GameListItem[];
}

interface SiteGroup {
  siteId: string;
  siteName: string;
  events: EventGroup[];
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

export default function ManageGamesPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [siteGroups, setSiteGroups] = useState<SiteGroup[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
  }, [authLoading, isAdmin, router]);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/games', {
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch games.');
      }

      const data = (await res.json()) as SiteGroup[];
      setSiteGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    void loadGames();
  }, [authChecked, loadGames]);

  async function handleDeleteGame(gameId: string): Promise<void> {
    if (!window.confirm('Delete this game?')) return;

    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? 'Failed to delete game.');
      return;
    }

    await loadGames();
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <button
        type="button"
        onClick={() => router.push('/admin/workspace')}
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Admin Panel
      </button>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Games</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse all games grouped by site and event. Upcoming games appear first.
        </p>
      </div>

      {siteGroups.length === 0 ? (
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-600">No games found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {siteGroups.map((site) => (
            <section key={site.siteId} className="rounded-xl bg-white p-6 shadow">
              <div className="mb-5 flex items-center gap-2">
                <MapPin size={20} className="text-gray-600" />
                <h2 className="text-2xl font-semibold text-gray-900">{site.siteName}</h2>
              </div>

              {site.events.length === 0 ? (
                <p className="text-gray-500">No events found for this site.</p>
              ) : (
                <div className="space-y-6">
                  {site.events.map((event) => (
                    <div key={event.eventId} className="rounded-lg border border-gray-200 p-5">
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <FolderTree size={18} className="text-gray-500" />
                          <h3 className="text-xl font-semibold text-gray-900">{event.eventName}</h3>
                        </div>

                        <Link
                          href={`/admin/events/${event.eventId}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Open Event
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div>
                          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                            Upcoming / Current Games
                          </h4>

                          {event.upcomingGames.length === 0 ? (
                            <p className="text-sm text-gray-500">No upcoming games.</p>
                          ) : (
                            <ul className="space-y-3">
                              {event.upcomingGames.map((game) => (
                                <li
                                  key={game.id}
                                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
                                >
                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-gray-900">{game.title}</p>
                                        {game.special && (
                                          <span className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white">
                                            {game.tag ?? 'Special'}
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-sm text-gray-500">
                                        <CalendarDays className="mr-1 inline" size={14} />
                                        {formatDateTime(game.scheduledFor)}
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Season: <span className="font-medium">{game.season.name}</span>
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Host: {game.host?.name ?? 'No host assigned'}
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Join Code: <span className="font-mono">{game.joinCode}</span>
                                      </p>
                                    </div>

                                    <span
                                      className={`self-start rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                                        game.status
                                      )}`}
                                    >
                                      {game.status}
                                    </span>
                                  </div>

                                  <div className="flex gap-3">
                                    <Link
                                      href={`/admin/games/${game.id}`}
                                      className="text-sm font-medium text-blue-600 hover:underline"
                                    >
                                      View / Edit
                                    </Link>
                                    <Link
                                      href={`/admin/seasons/${game.season.id}`}
                                      className="text-sm font-medium text-gray-700 hover:underline"
                                    >
                                      Open Season
                                    </Link>
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-red-600 hover:underline"
                                      onClick={() => {
                                        void handleDeleteGame(game.id);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                            Past / Closed Games
                          </h4>

                          {event.pastGames.length === 0 ? (
                            <p className="text-sm text-gray-500">No past games.</p>
                          ) : (
                            <ul className="space-y-3">
                              {event.pastGames.map((game) => (
                                <li
                                  key={game.id}
                                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
                                >
                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-gray-900">{game.title}</p>
                                        {game.special && (
                                          <span className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white">
                                            {game.tag ?? 'Special'}
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-sm text-gray-500">
                                        <CalendarDays className="mr-1 inline" size={14} />
                                        {formatDateTime(game.scheduledFor)}
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Season: <span className="font-medium">{game.season.name}</span>
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Host: {game.host?.name ?? 'No host assigned'}
                                      </p>

                                      <p className="mt-1 text-sm text-gray-500">
                                        Join Code: <span className="font-mono">{game.joinCode}</span>
                                      </p>
                                    </div>

                                    <span
                                      className={`self-start rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                                        game.status
                                      )}`}
                                    >
                                      {game.status}
                                    </span>
                                  </div>

                                  <div className="flex gap-3">
                                    <Link
                                      href={`/admin/games/${game.id}`}
                                      className="text-sm font-medium text-blue-600 hover:underline"
                                    >
                                      View / Edit
                                    </Link>
                                    <Link
                                      href={`/admin/seasons/${game.season.id}`}
                                      className="text-sm font-medium text-gray-700 hover:underline"
                                    >
                                      Open Season
                                    </Link>
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-red-600 hover:underline"
                                      onClick={() => {
                                        void handleDeleteGame(game.id);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}