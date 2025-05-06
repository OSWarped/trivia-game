'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Game {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: 'DRAFT' | 'LIVE' | 'CLOSED';
}

export default function HostDashboard() {
  const { user, isHost, isAdmin } = useAuth();
  const router = useRouter();

  // Redirect non-hosts
  useEffect(() => {
    if (!user || (!isHost && !isAdmin)) {
      router.push('/login');
    }
  }, [user, isHost, isAdmin, router]);

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/host/games', { credentials: 'include' });
        const data = await res.json();
        setGames(data as Game[]);
      } catch (err) {
        console.error('Error fetching host games:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const handleResetGame = async (gameId: string) => {
    const confirmed = confirm("Are you sure you want to reset this game?");
    if (!confirmed) return;
  
    try {
      const res = await fetch('/api/host/debug/reset-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
  
      const result = await res.json();
      if (res.ok) {
        alert("Game reset successfully.");
        // Optionally refresh the page or refetch game list
      } else {
        alert(result.error || "Failed to reset game.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      alert("An error occurred while resetting the game.");
    }
  };
  


  if (loading) {
    return <div className="p-6">Loading games...</div>;
  }

  // Separate upcoming vs past
  const now = new Date();
  const upcoming = games.filter(g => g.scheduledFor && new Date(g.scheduledFor) >= now);
  const past = games.filter(g => g.scheduledFor && new Date(g.scheduledFor) < now);

  function formatDate(dt: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Host Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Games</h2>
        {upcoming.length === 0 ? (
          <p>No upcoming games scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(g => (
              <li key={g.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-medium">{g.title}</div>
                  <div className="text-sm text-gray-600">{formatDate(g.scheduledFor)}</div>
                </div>
                <div className="flex space-x-2">
                  {/* Reset Game Button */}
                  <button
                    onClick={() => handleResetGame(g.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                  >
                  Reset Game
                  </button>
                  {g.status === 'DRAFT' && (
                    <Link
                      href={`/dashboard/host/games/${g.id}/edit`}
                      className="px-3 py-1 bg-yellow-500 text-white rounded"
                    >
                      Edit
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/host/${g.id}/command`}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    {/* {g.status === 'LIVE' ? 'Manage' : 'Start'} */}
                    Launch
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Past Games</h2>
        {past.length === 0 ? (
          <p>No past games yet.</p>
        ) : (
          <ul className="space-y-2">
            {past.map(g => (
              <li key={g.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-medium">{g.title}</div>
                  <div className="text-sm text-gray-600">{formatDate(g.scheduledFor)}</div>
                </div>
                <Link
                  href={`/dashboard/host/games/${g.id}`}
                  className="px-3 py-1 bg-gray-500 text-white rounded"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
