'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  recurring: boolean;
}

interface GameRow {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: string;
}

export default function EventSeasons() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [gameLoading, setGameLoading] = useState(false);

  // ✅ Auth check & redirect
  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
    } else {
      setAuthChecked(true);
    }
  }, [authLoading, isAdmin, router]);

  // ✅ Fetch once auth is confirmed
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      const res = await fetch(`/api/admin/events/${eventId}/seasons`);
      const data = await res.json();
      setSeasons(data as Season[]);

      const gRes = await fetch(`/api/admin/events/${eventId}/games`);
      const gData = await gRes.json();
      setGames(gData as GameRow[]);
    })();
  }, [authChecked, eventId]);

  if (!authChecked) return null;

  const toggleActive = async (id: string, value: boolean) => {
    setSeasons(arr => arr.map(s => (s.id === id ? { ...s, active: value } : s)));
    await fetch(`/api/admin/seasons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: value }),
    });
  };

  const deleteSeason = async (id: string) => {
    if (!confirm('Delete this season?')) return;
    const res = await fetch(`/api/admin/seasons/${id}`, { method: 'DELETE' });
    if (res.ok) setSeasons(arr => arr.filter(s => s.id !== id));
  };

  const createGame = async () => {
    if (!newTitle) return alert('Game title required');
    setGameLoading(true);
    const res = await fetch(`/api/admin/events/${eventId}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, scheduledFor }),
    });
    if (res.ok) {
      const created: GameRow = await res.json();
      setGames(g => [...g, created]);
      setNewTitle('');
    } else {
      alert('Failed to draft game');
    }
    setGameLoading(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Link
        href="/admin/sites"
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} /> Back to Sites
      </Link>

      <h1 className="text-2xl font-bold mb-6">Seasons & Games</h1>

      {/* Seasons List */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Existing Seasons</h2>
        <ul className="space-y-2">
          {seasons.map(se => (
            <li key={se.id} className="bg-white p-3 rounded shadow flex justify-between">
              <div>
                <Link href={`/admin/seasons/${se.id}`} className="font-medium hover:underline">
                  {se.name}
                </Link>
                <span className="text-gray-600 ml-2">
                  ({se.startsAt.slice(0, 10)} – {se.endsAt ? se.endsAt.slice(0, 10) : 'ongoing'})
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={se.active}
                    onChange={() => toggleActive(se.id, !se.active)}
                    className="mr-1"
                  />
                  active
                </label>
                <button
                  className="text-red-600 hover:underline text-sm"
                  onClick={() => deleteSeason(se.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Games Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Game title"
            className="border p-2 rounded col-span-1 md:col-span-2"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <input
            type="datetime-local"
            className="border p-2 rounded"
            value={scheduledFor}
            onChange={e => setScheduledFor(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 col-span-1 md:col-span-1"
            onClick={createGame}
            disabled={gameLoading || !newTitle || !scheduledFor}
          >
            Draft Game
          </button>
        </div>
        <ul className="space-y-2">
          {games.map(g => (
            <li key={g.id} className="bg-white p-3 rounded shadow flex justify-between">
              <span>
                {g.scheduledFor ? g.scheduledFor.slice(0, 16).replace('T', ' ') : '—'} — {g.title}
              </span>
              <span className="text-sm text-gray-600">{g.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
