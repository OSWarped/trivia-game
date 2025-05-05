'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: 'DRAFT' | 'LIVE' | 'CLOSED';
}

export default function HostGameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, isHost, isAdmin } = useAuth();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard: only HOST or ADMIN
  useEffect(() => {
    if (!user || (!isHost && !isAdmin)) {
      router.push('/login');
    }
  }, [user, isHost, isAdmin, router]);

  // Fetch game details
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setGame(data as Game);
      } catch (err) {
        console.error('Error loading game:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  if (loading) {
    return <div className="p-6">Loading game...</div>;
  }
  if (!game) {
    return <div className="p-6">Game not found.</div>;
  }

  const formattedDate = game.scheduledFor
    ? new Date(game.scheduledFor).toLocaleString()
    : '—';

  const handleStart = async () => {
    try {
      const res = await fetch(`/api/admin/games/${game.id}/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setGame({ ...game, status: 'LIVE' });
      } else {
        console.error('Failed to start game');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Link
        href="/dashboard/host"
        className="mb-4 inline-flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18} /> Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
      <p className="text-gray-600 mb-4">Scheduled for: {formattedDate}</p>
      <p className="mb-6">
        Status: <span className="font-semibold">{game.status}</span>
      </p>

      <div className="flex space-x-4 mb-8">
        {game.status === 'DRAFT' && (
          <button
            onClick={handleStart}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Start Game
          </button>
        )}
        <Link
          href={`/dashboard/host/games/${game.id}/edit`}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Edit Rounds & Questions
        </Link>
        {game.status !== 'DRAFT' && (
          <Link
            href={`/dashboard/host/games/${game.id}/manage`}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Manage Game
          </Link>
        )}
      </div>

      {/* TODO: You can render summary widgets here, e.g., question count, team count, etc. */}
    </div>
  );
}
