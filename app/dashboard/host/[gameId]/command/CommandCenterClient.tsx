'use client';

import React, { JSX, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';

interface Team {
  id: string;
  name: string;
  status?: 'ACTIVE' | 'RECONNECTING' | 'OFFLINE';
  lastSeenAt?: string;
}

interface Game {
  id: string;
  title: string;
  status: string;
  scheduledFor: string;
  joinCode: string;
}

interface Props {
  gameId: string;
}

function getStatusBadgeClass(status?: Team['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'RECONNECTING':
      return 'bg-yellow-100 text-yellow-800';
    case 'OFFLINE':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-blue-50 text-blue-800';
  }
}

function getStatusLabel(status?: Team['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Online';
    case 'RECONNECTING':
      return 'Reconnecting';
    case 'OFFLINE':
      return 'Offline';
    default:
      return 'Connected';
  }
}

export default function CommandCenterClient({ gameId }: Props): JSX.Element {
  const router = useRouter();
  const socket = useSocket();

  useHostSocket(true, gameId);

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}`, { cache: 'no-store' });
        if (res.ok) {
          setGame((await res.json()) as Game);
        }
      } catch (error) {
        console.error('Failed to load game metadata:', error);
      }
    })();
  }, [gameId]);

  useEffect(() => {
    if (!socket || !gameId) return;

    const requestRoster = () => {
      socket.emit('host:requestLiveTeams', { gameId });
    };

    const handleConnect = () => {
      setConnectionStatus('connected');
      requestRoster();
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleLiveTeams = ({
      gameId: incomingGameId,
      teams: incomingTeams,
    }: {
      gameId: string;
      teams: Team[];
    }): void => {
      if (incomingGameId === gameId) {
        setTeams(incomingTeams);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('host:liveTeams', handleLiveTeams);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('host:liveTeams', handleLiveTeams);
    };
  }, [socket, gameId]);

  if (!game) {
    return <div>Loading…</div>;
  }

  const joinUrl = `${window.location.origin}/join/${game.joinCode}`;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-full border-r bg-white p-4 shadow-lg md:w-1/3 lg:w-1/4">
        <h2 className="mb-4 text-xl font-semibold">👥 Teams in Lobby</h2>

        {connectionStatus === 'disconnected' && (
          <p className="mb-3 text-sm text-yellow-600">Reconnecting to live roster…</p>
        )}

        {teams.length === 0 ? (
          <p className="text-gray-500">No teams have joined yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="rounded bg-blue-50 px-3 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-blue-800">{team.name}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(team.status)}`}
                  >
                    {getStatusLabel(team.status)}
                  </span>
                </div>

                {team.lastSeenAt ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Last seen: {new Date(team.lastSeenAt).toLocaleTimeString()}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="flex-1 p-6">
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