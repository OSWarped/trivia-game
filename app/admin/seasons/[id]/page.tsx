'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CalendarDays, Trophy, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading season...</div>
      </div>
    );
  }

  if (error || !season) {
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
          {error ?? 'Unable to load season.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Link
        href={`/admin/events/${season.event.id}`}
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Event
      </Link>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500">Season</p>
            <h1 className="text-3xl font-bold text-gray-900">{season.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Event: <span className="font-medium">{season.event.name}</span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Site: <span className="font-medium">{season.event.site.name}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
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
        </div>
      </div>

      <section className="mb-8 rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <PlusCircle size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Draft Game in This Season</h2>
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

      <section className="mb-8 rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Standings</h2>
        </div>

        {table.length === 0 ? (
          <p className="text-gray-500">No standings yet for this season.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">#</th>
                  <th className="border p-2">Team</th>
                  <th className="border p-2">Games</th>
                  <th className="border p-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, idx) => (
                  <tr key={row.teamId}>
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2">{row.team}</td>
                    <td className="border p-2">{row.games}</td>
                    <td className="border p-2">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Games in Season</h2>

        {games.length === 0 ? (
          <p className="text-gray-500">No games have been created for this season yet.</p>
        ) : (
          <ul className="space-y-3">
            {games.map((game) => (
              <li
                key={game.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
              >
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
                    Scheduled: {formatDateTime(game.scheduledFor)}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Join Code: <span className="font-mono">{game.joinCode}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                      game.status
                    )}`}
                  >
                    {game.status}
                  </span>

                  <Link
                    href={`/admin/games/${game.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Game
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}