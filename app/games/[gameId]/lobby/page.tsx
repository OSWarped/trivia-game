'use client';

import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';

/* ------------------------------------------------------------------ */
/* 🗄️  Types                                                          */
/* ------------------------------------------------------------------ */
interface GameInfo {
  id: string;
  eventId: string;
  title: string;
  joinCode: string;
  status: GameStatus;
  scheduledFor: string | null;           // ISO date string
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

export default function LobbyPage(): JSX.Element {
  /* essentials */
  const { gameId } = useParams<{ gameId: string }>();
  const router     = useRouter();
  const socket     = useSocket();

  const teamId   = typeof window !== 'undefined' ? localStorage.getItem('teamId')   : null;
  const teamName = typeof window !== 'undefined' ? localStorage.getItem('teamName') : null;

  /* state */
  const [game,   setGame]  = useState<GameInfo | null>(null);
  const [teams,  setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /* singleton socket join */
  useTeamSocket(true, gameId ?? null, teamId, teamName);

  /* fetch helper */
  const fetchGameAndTeams = useCallback(async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/games/${gameId}`, { cache: 'no-store' });
      if (res.ok) {
        const { game: gameData } = (await res.json()) as { game: GameInfo };
        setGame(gameData);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load lobby data:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  /* socket listeners */
  useEffect(() => {
    if (!socket || !socket.connected || !gameId || !teamId) return;

    const delay = setTimeout(() => socket.emit('team:requestLiveTeams', { gameId }), 300);
    void fetchGameAndTeams();

    const handleTeamUpdate = () => void fetchGameAndTeams();
    const handleGameStarted = () => router.push(`/games/${gameId}/play`);
    const handleLiveTeams = ({ gameId: gId, teams: t }: { gameId: string; teams: Team[] }) => {
      if (gId === gameId) setTeams(t);
    };

    socket.on('team:update', handleTeamUpdate);
    socket.on('game_started', handleGameStarted);
    socket.on('team:liveTeams', handleLiveTeams);

    return () => {
      clearTimeout(delay);
      socket.off('team:update', handleTeamUpdate);
      socket.off('game_started', handleGameStarted);
      socket.off('team:liveTeams', handleLiveTeams);
    };
  }, [socket, gameId, teamId, router, fetchGameAndTeams]);

  /* derived value — MUST run on every render */
  const scheduledDisplay = useMemo(() => {
    if (!game?.scheduledFor) return 'TBD';
    return new Date(game.scheduledFor).toLocaleString();
  }, [game?.scheduledFor]);

  /* early exits AFTER *all* hooks */
  if (!teamId)
    return <p className="text-red-600">❌ Missing team ID in local storage.</p>;
  if (!game)
    return <p className="text-gray-600">Loading game info…</p>;

  /* render */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-blue-800">
          🧠 Welcome to the Trivia Lobby
        </h1>

        {/* Game card */}
        <div className="mb-6 rounded bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold">{game.title}</h2>

          <p className="text-gray-600">
            Location:{' '}
            {game.event?.site?.name ?? 'TBD'} ({game.event?.site?.address ?? 'Unknown'})
          </p>

          <p className="text-gray-600">Start Time: {scheduledDisplay}</p>

          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-sm ${
              game.status === 'LIVE'
                ? 'bg-green-200 text-green-800'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {game.status}
          </span>
        </div>

        {/* Team list */}
        <div className="rounded bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-semibold">👥 Teams in Lobby</h3>

          {loading ? (
            <p>Loading teams…</p>
          ) : teams.length === 0 ? (
            <p className="text-gray-500">No teams have joined yet.</p>
          ) : (
            <ul className="space-y-3">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="flex justify-between rounded bg-blue-50 p-3 shadow-sm"
                >
                  <span className="font-medium text-blue-800">{team.name}</span>
                  <span className="text-xs text-gray-500">Ready</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-sm text-gray-500">
            Waiting for the host to start the game…
          </p>
        </div>
      </div>
    </div>
  );
}
