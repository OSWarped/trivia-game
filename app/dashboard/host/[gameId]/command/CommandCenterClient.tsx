'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

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
    async function fetchData() {
      const gameRes = await fetch(`/api/host/games/${gameId}`);
      const teamRes = await fetch(`/api/host/games/${gameId}/teams`);
      if (gameRes.ok) setGame(await gameRes.json());
      if (teamRes.ok) setTeams(await teamRes.json());
    }
    fetchData();
  }, [gameId]);

  if (!game) return <div>Loading...</div>;

  const joinUrl = `${window.location.origin}/join/${game.joinCode}`;

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-2">🎮 Game Command Center</h1>
      <p className="text-lg">{game.title}</p>
      <p>Status: <span className={game.status === 'LIVE' ? 'text-green-600' : 'text-yellow-600'}>{game.status}</span></p>
      <p>Scheduled For: {new Date(game.scheduledFor).toLocaleString()}</p>

      <div className="my-4">
        <h2 className="text-xl font-semibold mb-2">📣 Share with Players</h2>
        <QRCode value={joinUrl} className="w-32 h-32" />
        <p className="mt-2">Join URL: <a href={joinUrl} className="text-blue-600 underline">{joinUrl}</a></p>
      </div>

      <div className="my-4">
        <h2 className="text-xl font-semibold mb-2">👥 Teams in Lobby</h2>
        {teams.length === 0 ? (
          <p>No teams have joined yet.</p>
        ) : (
          <ul className="list-disc list-inside">
            {teams.map(team => (
              <li key={team.id}>{team.name}</li>
            ))}
          </ul>
        )}
      </div>

      {game.status === 'LIVE' ? (
  <button
    onClick={() => router.push(`/dashboard/host/${gameId}/play`)}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
  >
    ✅ Rejoin Live Game
  </button>
) : (
  <button
    onClick={async () => {
      await fetch(`/api/host/games/${gameId}/start`, { method: "PATCH" });
      router.push(`/dashboard/host/${gameId}/play`);
    }}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
  >
    🚀 Start Game
  </button>
)}
    </div>
  );
}
