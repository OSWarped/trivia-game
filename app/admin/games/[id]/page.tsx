'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">Loading game...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error ?? 'Unable to load game.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Link
        href={`/admin/seasons/${game.season.id}`}
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} />
        Back to Season
      </Link>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">Edit Game</p>
        <h1 className="text-3xl font-bold text-gray-900">{game.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Season: <span className="font-medium">{game.season.name}</span>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Event: <span className="font-medium">{game.season.event.name}</span>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Site: <span className="font-medium">{game.season.event.site.name}</span>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Join Code: <span className="font-mono font-medium">{game.joinCode}</span>
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block font-medium">Game Title</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Scheduled For</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-gray-300 p-2"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Status</label>
            <select
              className="w-full rounded border border-gray-300 p-2"
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
            <label className="mb-1 block font-medium">Host</label>
            <select
              className="w-full rounded border border-gray-300 p-2"
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

          <div className="flex items-center gap-2 pt-7">
            <input
              id="special"
              type="checkbox"
              checked={special}
              onChange={(e) => setSpecial(e.target.checked)}
            />
            <label htmlFor="special" className="font-medium">
              Special Game
            </label>
          </div>

          {special && (
            <div className="md:col-span-2">
              <label className="mb-1 block font-medium">Special Tag</label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 p-2"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Championship"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={`/admin/seasons/${game.season.id}`}
            className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            onClick={() => {
              void handleSaveChanges();
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}