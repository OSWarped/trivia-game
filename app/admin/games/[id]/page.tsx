'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppBackground from '@/components/AppBackground';
import GameJsonImportPanel from './components/GameJsonImportPanel';

interface User {
  id: string;
  name: string;
}

interface GameDetail {
  id: string;
  title: string;
  joinCode: string;
  special: boolean;
  tag: string | null;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  host: User | null;
  season: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
      site: {
        id: string;
        name: string;
      };
    };
  };
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function EditGamePage() {
  const router = useRouter();
  const { id: gameId } = useParams<{ id: string }>();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [game, setGame] = useState<GameDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [title, setTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [hostId, setHostId] = useState('');
  const [special, setSpecial] = useState(false);
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('DRAFT');

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
  }, [authLoading, isAdmin, router]);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [gameRes, usersRes] = await Promise.all([
        fetch(`/api/admin/games/${gameId}`, { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!gameRes.ok) {
        const data = (await gameRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load game.');
      }

      if (!usersRes.ok) {
        const data = (await usersRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load users.');
      }

      const gameData = (await gameRes.json()) as GameDetail;
      const usersData = (await usersRes.json()) as User[];

      setGame(gameData);
      setUsers(usersData);

      setTitle(gameData.title);
      setScheduledFor(toDateTimeLocal(gameData.scheduledFor));
      setHostId(gameData.host?.id ?? '');
      setSpecial(gameData.special);
      setTag(gameData.tag ?? '');
      setStatus(gameData.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!authChecked) return;
    void loadPage();
  }, [authChecked, loadPage]);

  async function handleSaveChanges(): Promise<void> {
    if (!title.trim()) {
      window.alert('Game title is required.');
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          scheduledFor: scheduledFor || null,
          hostId: hostId || null,
          special,
          tag: special ? tag.trim() || null : null,
          status,
        }),
      });

      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to update game.');
      }

      router.push(`/admin/games/${data.id ?? gameId}`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading game...
          </div>
        </div>
      </AppBackground>
    );
  }

  if (error || !game) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              {error ?? 'Unable to load game.'}
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
              href={`/admin/seasons/${game.season.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Season
            </Link>
          </div>

          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Game Management
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {game.title}
                </h1>

                <p className="mt-2 text-sm text-slate-600">
                  Season: <span className="font-medium text-slate-800">{game.season.name}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Event: <span className="font-medium text-slate-800">{game.season.event.name}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Site: <span className="font-medium text-slate-800">{game.season.event.site.name}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Join Code:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {game.joinCode}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/admin/games/${game.id}/editor`}
                  className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Open Rounds / Questions Editor
                </Link>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Edit Game Details</h2>
              <p className="mt-1 text-sm text-slate-600">
                Update scheduling, status, host assignment, and special game settings.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Game Title
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Scheduled For
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="LIVE">LIVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Host
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                >
                  <option value="">No Host Assigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-7">
                <input
                  id="special"
                  type="checkbox"
                  checked={special}
                  onChange={(e) => setSpecial(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <label htmlFor="special" className="text-sm font-medium text-slate-700">
                  Special Game
                </label>
              </div>

              {special ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Special Tag
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Championship"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Link
                href={`/admin/seasons/${game.season.id}`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void handleSaveChanges();
                }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Game Content Import</h2>
              <p className="mt-1 text-sm text-slate-600">
                Import structured game content into this game.
              </p>
            </div>

            <GameJsonImportPanel gameId={gameId} />
          </section>
        </div>
      </div>
    </AppBackground>
  );
}