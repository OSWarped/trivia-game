'use client';

import { useEffect, useState } from 'react';
//import { io, Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket-client';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';


interface Team {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
  status: string;
  scheduledFor: string;
  joinCode: string;
}

interface CommandCenterClientProps {
  gameId: string;
}

export default function CommandCenterClient({ gameId }: CommandCenterClientProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const router = useRouter();


  useEffect(() => {
    async function fetchGame() {
      const res = await fetch(`/api/host/games/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);
      }
    }

    fetchGame();
  }, [gameId]);

  useEffect(() => {
  const socket = getSocket();

    // ✅ Host joins the game room
    socket.emit('host:join', { gameId });

    // ✅ Request the current list
    socket.emit('host:requestLiveTeams', { gameId });

    // ✅ Listen for team updates
    socket.on('host:liveTeams', ({ teams }) => {
      console.log('📡 Received host:liveTeams', teams);
      setTeams(teams); // no need to extract anymore
    });

    socket.on('connect', () => console.log('✅ Socket connected'));
    socket.on('disconnect', () => console.log('❌ Socket disconnected'));

    return () => {
      socket.emit('host:leave', { gameId });
      socket.disconnect();
    };
  }, [gameId]);

  if (!game) return <div>Loading...</div>;

  const joinUrl = `${window.location.origin}/join/${game.joinCode}`;

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar: Teams */}
      <aside className="w-full md:w-1/3 lg:w-1/4 bg-white shadow-lg p-4 border-r">
        <h2 className="text-xl font-semibold mb-4">👥 Teams in Lobby</h2>
        {teams.length === 0 ? (
          <p className="text-gray-500">No teams have joined yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="bg-blue-50 px-3 py-2 rounded shadow-sm text-blue-800 font-medium"
              >
                {team.name}
              </li>
            ))}
          </ul>
        )}
      </aside>
  
      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="bg-white rounded shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">🎮 Game Command Center</h1>
          <p className="text-lg">{game.title}</p>
          <p>
            Status:{' '}
            <span className={game.status === 'LIVE' ? 'text-green-600' : 'text-yellow-600'}>
              {game.status}
            </span>
          </p>
          <p>Scheduled For: {new Date(game.scheduledFor).toLocaleString()}</p>
        </div>
  
        <div className="bg-white rounded shadow p-6 mb-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">📣 Share with Players</h2>
          <QRCode value={joinUrl} className="w-64 h-64" />
          <p className="mt-4 text-sm text-gray-700">
            Join URL:{' '}
            <a href={joinUrl} className="text-blue-600 underline">
              {joinUrl}
            </a>
          </p>
        </div>
  
        <div className="text-center">
  {game.status === 'LIVE' ? (
    <button
      onClick={() => router.push(`/dashboard/host/${gameId}/play`)}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
    >
      ✅ Rejoin Live Game
    </button>
  ) : (
    <button
      onClick={async () => {
        await fetch(`/api/host/games/${gameId}/start`, { method: 'PATCH' });
        const socket = getSocket();
        // 🔌 Emit WebSocket signal to start game
       // const websocketURL = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim() || 'http://localhost:3009';

//console.log("🔌 Connecting to socket at:", websocketURL);
//const socket = io(websocketURL, { transports: ['websocket'] });

        socket.emit('host:gameStarted', { gameId });

        router.push(`/dashboard/host/${gameId}/play`);
      }}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
    >
      🚀 Start Game
    </button>
  )}
</div>

      </main>
    </div>
  );
  
}
