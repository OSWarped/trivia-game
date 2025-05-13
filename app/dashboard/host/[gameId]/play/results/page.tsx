'use client';

import React, { JSX, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TeamResult {
  teamId: string;
  teamName: string;
  finalScore: number;
  rank: number;
  favorites: { questionId: string; yourAnswer: string }[];
}

interface HostResultsData {
  game: { id: string; title: string; date: string; status: 'DRAFT' | 'LIVE' | 'CLOSED' };
  teams: TeamResult[];
  totalTeams: number;
}

export default function HostResultsPage(): JSX.Element {
  const { gameId } = useParams() as { gameId: string };
  const router = useRouter();

  const [data, setData] = useState<HostResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/host/results?gameId=${gameId}`, { cache: 'no-store' });
        if (!res.ok) {
          console.error('Failed to load host results', await res.text());
          setLoading(false);
          return;
        }
        const json = (await res.json()) as HostResultsData;
        if (json.game.status !== 'CLOSED') {
          router.replace(`/dashboard/host/${gameId}/play`);
          return;
        }
        setData(json);
      } catch (err) {
        console.error('Error fetching host results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, router]);

  if (loading) return <div className="p-6">Loading host results…</div>;
  if (!data) return <div className="p-6 text-red-600">Host results not available.</div>;

  const { game, teams, totalTeams } = data;

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Final Results (Host): {game.title}</h1>
        <p className="text-sm text-gray-500">{new Date(game.date).toLocaleString()}</p>
        <p className="mt-2 text-lg">Total Teams: {totalTeams}</p>
      </header>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Team Standings</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1">Rank</th>
                <th className="border px-2 py-1">Team Name</th>
                <th className="border px-2 py-1">Score</th>
                <th className="border px-2 py-1">Favorites</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team.teamId} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-center">{team.rank}</td>
                  <td className="border px-2 py-1">{team.teamName}</td>
                  <td className="border px-2 py-1 text-center">{team.finalScore}</td>
                  <td className="border px-2 py-1">
                    {team.favorites.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {team.favorites.map((f, idx) => (
                          <li key={idx} className="text-sm">
                            Q{f.questionId}: <em>{f.yourAnswer}</em>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-wrap gap-4">
        <Link href="/dashboard/host" className="btn">
          Back to Dashboard
        </Link>
        <Link href={`/dashboard/host/${gameId}/play/results`} className="btn">
          Refresh
        </Link>
      </footer>
    </div>
  );
}
