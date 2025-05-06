'use client';

import React, { JSX, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';

interface Team { id: string; name: string }
interface Game {
  id: string;
  title: string;
  status: string;
  scheduledFor: string;
  joinCode: string;
}

interface Props { gameId: string }   // passed by parent server page

export default function CommandCenterClient({ gameId }: Props): JSX.Element {
  const router = useRouter();
  const socket = useSocket();

  /* keep host in the room while this page is mounted */
  useHostSocket(true, gameId);

  const [game, setGame]   = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  /* ---- fetch game meta once ------------------------------------------------ */
  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/host/games/${gameId}`, { cache: 'no-store' });
      if (res.ok) setGame((await res.json()) as Game);
    })();
  }, [gameId]);

  /* ---- socket listeners ---------------------------------------------------- */
useEffect(() => {
  if (!socket) return;

  const handleLiveTeams = ({ teams: t }: { teams: Team[] }): void => {
    setTeams(t);
  };

  socket.on('host:liveTeams', handleLiveTeams);

  // ✅ cleanup – call off(), then return void
  return () => {
    socket.off('host:liveTeams', handleLiveTeams);
  };
}, [socket]);


  /* ------------------------------------------------------------------------- */
  if (!game) return <div>Loading…</div>;

  const joinUrl = `${window.location.origin}/join/${game.joinCode}`;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ── Sidebar: teams ───────────────────────────────────────── */}
      <aside className="w-full border-r bg-white p-4 shadow-lg md:w-1/3 lg:w-1/4">
        <h2 className="mb-4 text-xl font-semibold">👥 Teams in Lobby</h2>
        {teams.length === 0 ? (
          <p className="text-gray-500">No teams have joined yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="rounded bg-blue-50 px-3 py-2 font-medium text-blue-800 shadow-sm"
              >
                {team.name}
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        {/* Game card */}
        <div className="mb-6 rounded bg-white p-6 shadow">
          <h1 className="mb-2 text-2xl font-bold">🎮 Game Command Center</h1>
          <p className="text-lg">{game.title}</p>
          <p>
            Status:{' '}
            <span
              className={
                game.status === 'LIVE' ? 'text-green-600' : 'text-yellow-600'
              }
            >
              {game.status}
            </span>
          </p>
          <p>Scheduled For: {new Date(game.scheduledFor).toLocaleString()}</p>
        </div>

        {/* QR share */}
        <div className="mb-6 flex flex-col items-center rounded bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">📣 Share with Players</h2>
          <QRCode value={joinUrl} className="h-64 w-64" />
          <p className="mt-4 text-sm text-gray-700">
            Join URL:{' '}
            <a href={joinUrl} className="text-blue-600 underline">
              {joinUrl}
            </a>
          </p>
        </div>

        {/* Start / Rejoin buttons */}
        <div className="text-center">
          {game.status === 'LIVE' ? (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/host/${gameId}/play`)}
              className="rounded bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              ✅ Rejoin Live Game
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/host/games/${gameId}/start`, { method: 'PATCH' });
                socket?.emit('host:gameStarted', { gameId });
                router.push(`/dashboard/host/${gameId}/play`);
              }}
              className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              🚀 Start Game
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
