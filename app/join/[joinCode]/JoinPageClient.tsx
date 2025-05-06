'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
//import { io } from 'socket.io-client';
import { getSocket } from '@/lib/socket-client';

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
  const [teamNameSuggestions, setTeamNameSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadGame() {
      const res = await fetch(`/api/games/join-code/${joinCode}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);

        // Fetch team names based on event ID
        const teamRes = await fetch(`/api/events/${data.eventId}/teams/names`);
        if (teamRes.ok) {
          const names = await teamRes.json();
          setTeamNameSuggestions(names);
        }
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
      const { teamId, gameStatus } = data;
  
      localStorage.setItem('teamId', teamId);
      localStorage.setItem('teamName', teamName);
      localStorage.setItem('gameId', gameId);
  
      const socket = getSocket();
  
      socket.emit('team:join_lobby', {
        gameId,
        teamId,
        teamName,
      });
  
      // Wait just enough to ensure server updates team list
      setTimeout(() => {
        const redirectUrl = gameStatus === 'LIVE'
          ? `/play/${gameId}`
          : `/games/${gameId}/lobby`;
        router.push(redirectUrl);
      }, 300);
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
        🗓️ <strong>Scheduled:</strong>{' '}
        {new Date(game.scheduledFor).toLocaleString()}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Team Name Autocomplete */}
        <div className="relative">
          <label className="block font-medium mb-1">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => {
              const val = e.target.value;
              setTeamName(val);
              const filtered = teamNameSuggestions.filter((name) =>
                name.toLowerCase().startsWith(val.toLowerCase())
              );
              setFilteredSuggestions(filtered);
              setShowSuggestions(filtered.length > 0);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => {
              const filtered = teamNameSuggestions.filter((name) =>
                name.toLowerCase().startsWith(teamName.toLowerCase())
              );
              setFilteredSuggestions(filtered);
              setShowSuggestions(filtered.length > 0);
            }}
            required
            className="w-full border p-2 rounded"
          />

          {showSuggestions && (
            <ul className="absolute z-10 bg-white border w-full rounded shadow max-h-40 overflow-y-auto">
              {filteredSuggestions.map((name) => (
                <li
                  key={name}
                  className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    setTeamName(name);
                    setShowSuggestions(false);
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* PIN */}
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

        {/* Error */}
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
