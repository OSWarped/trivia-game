'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
}

export default function TeamSelection({ params }: { params: Promise<{ siteId: string; gameId: string }> }) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTeams() {
      try {
        const { siteId, gameId } = await params; // Await the dynamic params
        const res = await fetch(`/api/teams?siteId=${siteId}&gameId=${gameId}`);
        const data = await res.json();
        setTeams(data);
      } catch (err) {
        console.error('Failed to load teams:', err);
        setError('Failed to load teams.');
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, [params]);

  if (loading) return <div>Loading teams...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h1>Select a Team</h1>
      <ul>
        {teams.map((team) => (
          <li key={team.id}>
            <button
              onClick={() => router.push(`/teams/${team.id}/join`)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Join {team.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
