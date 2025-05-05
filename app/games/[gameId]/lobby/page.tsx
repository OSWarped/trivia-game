'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useRouter } from 'next/navigation';

interface GameInfo {
  id: string;
  title: string;
  scheduledFor: string;
  status: string;
  event?: {
    site?: {
      name: string;
      address: string;
    } | null;
  } | null;
}




interface Team {
  id: string;
  name: string;
}

export default function LobbyPage() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;
  const teamId = typeof window !== 'undefined' ? localStorage.getItem('teamId') : null;

  const [game, setGame] = useState<GameInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGameAndTeams = async (gameId: string, setGame: Function, setTeams: Function, setLoading: Function) => {
    try {
      console.log("🔄 Fetching updated game & team data...");
      const gameRes = await fetch(`/api/games/${gameId}`, { cache: 'no-store' });
      
      if (gameRes.ok) {
        const { game } = await gameRes.json();
        setGame(game);
      }
  
     
    } catch (err) {
      console.error('❌ Failed to load lobby data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!gameId || !teamId) return;
  
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3009');
    console.log("🧠 Setting up socket and fetching lobby data");
  
    socket.emit('team:join_lobby', { gameId, teamId });
  
    // ✅ Add small delay to ensure your own team is tracked
    setTimeout(() => {
      socket.emit('team:requestLiveTeams', { gameId });
    }, 300); // 300ms delay
  
    fetchGameAndTeams(gameId, setGame, setTeams, setLoading);
  
    socket.on('team:update', () => {
      console.log("🔁 team:update received via socket");
      fetchGameAndTeams(gameId, setGame, setTeams, setLoading);
    });
  
    socket.on('game_started', () => {
      router.push(`/games/${gameId}/play`);
    });
  
    socket.on("team:liveTeams", async ({ gameId, teams }) => {
      try {
        const res = await fetch(`/api/games/${gameId}/teams`);
        const { teams: allTeams } = await res.json();
        const filteredTeams = allTeams.filter((team: { id: string }) => teams.includes(team.id));
        setTeams(filteredTeams);
      } catch (error) {
        console.error("Error loading team data from team IDs:", error);
      }
    });
  
    return () => {
      socket.emit('team:leave_lobby', { gameId, teamId });
      socket.disconnect();
    };
  }, [gameId, teamId, router]);
  

  if (!teamId) return <p className="text-red-600">❌ Missing team ID in local storage.</p>;
  if (!game) return <p className="text-gray-600">Loading game info...</p>;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-blue-100">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">🧠 Welcome to the Trivia Lobby</h1>

        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-2xl font-semibold">{game.title}</h2>

          <p className="text-gray-600">
            Location: {game.event?.site?.name || "TBD"} ({game.event?.site?.address || "Unknown"})
          </p>

          <p className="text-gray-600">
            Start Time: {game.scheduledFor ? new Date(game.scheduledFor).toLocaleString() : "TBD"}
          </p>

          <span
            className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${game.status === "LIVE"
                ? "bg-green-200 text-green-800"
                : "bg-yellow-100 text-yellow-700"
              }`}
          >
            {game.status}
          </span>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-4">👥 Teams in Lobby</h3>
          {loading ? (
            <p>Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-gray-500">No teams have joined yet.</p>
          ) : (
            <ul className="space-y-3">
              {teams.map(team => (
                <li key={team.id} className="p-3 bg-blue-50 rounded shadow-sm flex justify-between">
                  <span className="text-blue-800 font-medium">{team.name}</span>
                  <span className="text-xs text-gray-500">Ready</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-gray-500 text-sm">Waiting for the host to start the game...</p>
        </div>
      </div>
    </div>
  );
}
