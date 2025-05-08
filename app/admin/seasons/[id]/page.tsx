/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { useEffect, useState } from 'react';
import Link                     from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth }              from '@/context/AuthContext';
import { ChevronLeft }          from 'lucide-react';

interface GameRow {
  id: string;
  title: string;
  special: boolean;
  tag: string | null;
  status: string;
  startedAt: string | null;
}

interface Standing {
  teamId: string;
  team:   string;
  games:  number;
  points: number;
}

export default function SeasonDetail() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const { isAdmin }  = useAuth();
  const router       = useRouter();

  if (!isAdmin) { router.push('/login'); return null; }

  const [games, setGames]       = useState<GameRow[]>([]);
  const [table, setTable]       = useState<Standing[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const gRes = await fetch(`/api/admin/seasons/${seasonId}/games`);
        const sRes = await fetch(`/api/admin/seasons/${seasonId}/standings`);
        setGames(await gRes.json());
        setTable(await sRes.json());
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, [seasonId]);

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Link
        href="/admin/sites"
        className="mb-4 flex items-center text-blue-600 hover:underline"
      >
        <ChevronLeft className="mr-1" size={18}/> Back to Sites
      </Link>

      <h1 className="text-2xl font-bold mb-6">Season Leaderboard</h1>

      {/* Leaderboard */}
      <section className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Standings</h2>
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Team</th>
              <th className="p-2 border">Games</th>
              <th className="p-2 border">Points</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, idx) => (
              <tr key={row.teamId}>
                <td className="p-2 border">{idx + 1}</td>
                <td className="p-2 border">{row.team}</td>
                <td className="p-2 border">{row.games}</td>
                <td className="p-2 border">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Games list */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Games in Season</h2>
        <ul className="space-y-2">
          {games.map(g => (
            <li key={g.id} className="flex justify-between items-center">
              <span>
                {g.startedAt?.slice(0,10) ?? '—'} — {g.title}
                {g.special && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-600 text-white rounded">
                    {g.tag ?? 'Special'}
                  </span>
                )}
              </span>
              <span className="text-sm text-gray-600">{g.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
