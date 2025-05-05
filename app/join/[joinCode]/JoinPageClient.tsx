'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Site } from '@prisma/client';

interface Game {
  id: string;
  title: string;
  status: string;
  eventId: string;
  scheduledFor: string;
  hostingSite?: {
    id: string;
    name: string;
    address?: string;
  };
}
export default function JoinPageClient({ joinCode }: { joinCode: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [teamName, setTeamName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();


  useEffect(() => {
    async function loadGame() {
      const res = await fetch(`/api/games/join-code/${joinCode}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);
      }
    }
    loadGame();
  }, [joinCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await fetch(`/api/games/join-code/${joinCode}`);
    const game = await result.json();
    const gameId = game.id;

    const res = await fetch(`/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinCode, teamName, pin }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('teamId', data.teamId);
      localStorage.setItem('gameId', data.gameId);

      console.log("RECEVIED GAME DATA: " + JSON.stringify(data));
    
      if (data.gameStatus === 'LIVE') {
        router.push(`/play/${data.gameId}`); // ✅ Send to new play page
      } else {
        //const redirect = game?.status === 'LIVE' ? 'play' : 'lobby';
      //router.push(`/games/${data.gameId}/${redirect}`);
        router.push(`/games/${data.gameId}/lobby`);
      }
    } else {
      const { error } = await res.json();
      setError(error || 'Failed to join game');
    }
    
  };

  if (!game) return <div>Loading game info...</div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Join {game.title}</h1>
      <p className="text-sm text-gray-600 mb-2">
        📍 <strong>Location:</strong> {game.hostingSite?.name ?? 'Unknown'}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        🗓️ <strong>Scheduled:</strong> {new Date(game.scheduledFor).toLocaleString()}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Team PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          Join Game
        </button>
      </form>
    </div>
  );
}
