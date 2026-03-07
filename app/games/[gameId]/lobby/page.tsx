'use client';

import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface GameInfo {
  id: string;
  title: string;
  joinCode: string;
  status: GameStatus;
  scheduledFor: string | null;
  site?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
}

interface ResumeSessionPayload {
  sessionToken: string;
  deviceId: string;
  status: string;
  joinedAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface ResumeApiResponse {
  ok?: boolean;
  teamId?: string;
  teamName?: string;
  gameId?: string;
  gameStatus?: string;
  route?: string;
  redirectTo?: string;
  session?: ResumeSessionPayload;
  error?: string;
  code?: string;
  clearStoredSession?: boolean;
}

interface StoredTeamSession {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionToken: string;
  deviceId: string;
  lastKnownStatus: string;
  lastKnownScreen: 'lobby' | 'play';
  joinedAt: string;
  lastSeenAt: string;
}

interface StoredDeviceIdentity {
  deviceId: string;
  createdAt: string;
}

const STORAGE_PREFIX = 'trivia';

function getStoredGameSession(gameId: string): StoredTeamSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${gameId}:session`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredTeamSession>;

    if (
      typeof parsed.gameId !== 'string' ||
      typeof parsed.teamId !== 'string' ||
      typeof parsed.teamName !== 'string' ||
      typeof parsed.sessionToken !== 'string' ||
      typeof parsed.deviceId !== 'string' ||
      typeof parsed.lastKnownStatus !== 'string' ||
      (parsed.lastKnownScreen !== 'lobby' && parsed.lastKnownScreen !== 'play') ||
      typeof parsed.joinedAt !== 'string' ||
      typeof parsed.lastSeenAt !== 'string'
    ) {
      return null;
    }

    return {
      gameId: parsed.gameId,
      teamId: parsed.teamId,
      teamName: parsed.teamName,
      sessionToken: parsed.sessionToken,
      deviceId: parsed.deviceId,
      lastKnownStatus: parsed.lastKnownStatus,
      lastKnownScreen: parsed.lastKnownScreen,
      joinedAt: parsed.joinedAt,
      lastSeenAt: parsed.lastSeenAt,
    };
  } catch {
    return null;
  }
}

function getStoredDeviceIdentity(): StoredDeviceIdentity | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:device`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDeviceIdentity>;

    if (!parsed.deviceId || typeof parsed.deviceId !== 'string') {
      return null;
    }

    return {
      deviceId: parsed.deviceId,
      createdAt:
        typeof parsed.createdAt === 'string'
          ? parsed.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function clearStoredGameSession(gameId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:session`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:teamId`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:teamName`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:gameId`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:joinCode`);

  try {
    const lastSessionRaw = localStorage.getItem(`${STORAGE_PREFIX}:lastSession`);
    if (lastSessionRaw) {
      const parsed = JSON.parse(lastSessionRaw) as { gameId?: string };
      if (parsed.gameId === gameId) {
        localStorage.removeItem(`${STORAGE_PREFIX}:lastSession`);
      }
    }
  } catch {
    localStorage.removeItem(`${STORAGE_PREFIX}:lastSession`);
  }

  if (localStorage.getItem('gameId') === gameId) {
    localStorage.removeItem('teamId');
    localStorage.removeItem('teamName');
    localStorage.removeItem('gameId');
    localStorage.removeItem('teamSession');
  }
}

function persistSession(
  gameId: string,
  joinCode: string,
  storedSession: StoredTeamSession,
  deviceCreatedAt?: string
): void {
  if (typeof window === 'undefined') return;

  const createdAt = deviceCreatedAt ?? new Date().toISOString();

  localStorage.setItem(
    `${STORAGE_PREFIX}:${gameId}:session`,
    JSON.stringify(storedSession)
  );

  localStorage.setItem(
    `${STORAGE_PREFIX}:device`,
    JSON.stringify({
      deviceId: storedSession.deviceId,
      createdAt,
    } as StoredDeviceIdentity)
  );

  localStorage.setItem(
    `${STORAGE_PREFIX}:lastSession`,
    JSON.stringify({
      gameId,
      updatedAt: new Date().toISOString(),
    })
  );

  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:teamId`, storedSession.teamId);
  localStorage.setItem(
    `${STORAGE_PREFIX}:${gameId}:teamName`,
    storedSession.teamName
  );
  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:gameId`, gameId);
  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:joinCode`, joinCode);

  // Legacy compatibility while the rest of the app is still being updated.
  localStorage.setItem('teamId', storedSession.teamId);
  localStorage.setItem('teamName', storedSession.teamName);
  localStorage.setItem('gameId', gameId);
  localStorage.setItem(
    'teamSession',
    JSON.stringify({
      gameId,
      teamId: storedSession.teamId,
      teamName: storedSession.teamName,
    })
  );
}

export default function LobbyPage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const socket = useSocket();

  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  const [game, setGame] = useState<GameInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  const initializePage = useCallback(async () => {
    if (!gameId) return;

    setLoading(true);
    setIsRestoringSession(true);
    setLoadError('');

    try {
      const gameRes = await fetch(`/api/games/${gameId}`, { cache: 'no-store' });
      const gameData = await gameRes.json();

      if (!gameRes.ok) {
        setLoadError(gameData?.error || 'Failed to load game.');
        return;
      }

      const resolvedGame: GameInfo | null = gameData?.game ?? gameData ?? null;

      if (!resolvedGame) {
        setLoadError('Game payload was empty.');
        return;
      }

      setGame(resolvedGame);

      if (typeof window === 'undefined') {
        return;
      }

      const storedSession = getStoredGameSession(gameId);

      if (!storedSession) {
        setLoadError('No saved team session was found for this game.');
        router.replace(`/join/${resolvedGame.joinCode}`);
        return;
      }

      const resumeRes = await fetch(`/api/games/${gameId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          teamId: storedSession.teamId,
          sessionToken: storedSession.sessionToken,
          deviceId: storedSession.deviceId,
        }),
      });

      const resumeData = (await resumeRes.json()) as ResumeApiResponse;

      if (
        !resumeRes.ok ||
        !resumeData.teamId ||
        !resumeData.session?.sessionToken ||
        !resumeData.session.deviceId
      ) {
        if (resumeData.clearStoredSession) {
          clearStoredGameSession(gameId);
        }

        setLoadError(
          resumeData.error || 'We could not restore your team session.'
        );
        router.replace(`/join/${resolvedGame.joinCode}`);
        return;
      }

      const resumedStatus = resumeData.gameStatus ?? resolvedGame.status;
      const resumedTeamName = resumeData.teamName ?? storedSession.teamName;

      const refreshedSession: StoredTeamSession = {
        gameId,
        teamId: resumeData.teamId,
        teamName: resumedTeamName,
        sessionToken: resumeData.session.sessionToken,
        deviceId: resumeData.session.deviceId,
        lastKnownStatus: resumedStatus,
        lastKnownScreen: resumedStatus === 'LIVE' ? 'play' : 'lobby',
        joinedAt: resumeData.session.joinedAt,
        lastSeenAt: resumeData.session.lastSeenAt,
      };

      persistSession(
        gameId,
        resolvedGame.joinCode,
        refreshedSession,
        getStoredDeviceIdentity()?.createdAt
      );

      setTeamId(refreshedSession.teamId);
      setTeamName(refreshedSession.teamName);

      if (resumedStatus === 'LIVE') {
        router.replace(`/games/${gameId}/play`);
        return;
      }
    } catch (error) {
      console.error('Failed to initialize lobby page:', error);
      setLoadError('Failed to restore lobby session.');
    } finally {
      setIsRestoringSession(false);
      setLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => {
    void initializePage();
  }, [initializePage]);

  useTeamSocket({
    enabled: Boolean(gameId && teamId && teamName),
    session:
      gameId && teamId && teamName
        ? {
          gameId,
          teamId,
          teamName,
          sessionToken: getStoredGameSession(gameId)?.sessionToken ?? null,
          deviceId: getStoredGameSession(gameId)?.deviceId ?? null,
        }
        : null,
    onAuthenticated: () => {
      socket?.emit('team:requestLiveTeams', { gameId });
    },
    onInvalidSession: (ack) => {
      if (ack.clearStoredSession && gameId) {
        clearStoredGameSession(gameId);
      }

      if (game?.joinCode) {
        router.replace(`/join/${game.joinCode}`);
      }
    },
  });

  useEffect(() => {
  if (!socket || !gameId || !teamId || !teamName) return;

  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
  };

  const handleConnect = () => {
    setConnectionStatus('connected');
    socket.emit('team:requestLiveTeams', { gameId });
  };

  const handleGameStarted = () => {
    router.push(`/games/${gameId}/play`);
  };

  const handleLiveTeams = (payload: { gameId: string; teams: Team[] }) => {
    if (payload.gameId === gameId) {
      setTeams(payload.teams);
    }
  };

  socket.on('disconnect', handleDisconnect);
  socket.on('connect', handleConnect);
  socket.on('game_started', handleGameStarted);
  socket.on('team:liveTeams', handleLiveTeams);

  if (socket.connected) {
    handleConnect();
  }

  return () => {
    socket.off('disconnect', handleDisconnect);
    socket.off('connect', handleConnect);
    socket.off('game_started', handleGameStarted);
    socket.off('team:liveTeams', handleLiveTeams);
  };
}, [socket, gameId, teamId, teamName, router]);

  const scheduledDisplay = useMemo(() => {
    if (!game?.scheduledFor) return 'TBD';
    return new Date(game.scheduledFor).toLocaleString();
  }, [game?.scheduledFor]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          {isRestoringSession
            ? 'Restoring your team session...'
            : 'Loading game info...'}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6">
        <p className="text-red-600">Game data was not found.</p>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="p-6">
        <p className="text-red-600">❌ Missing team session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-blue-800">
          🧠 Welcome to the Trivia Lobby
        </h1>

        {connectionStatus === 'disconnected' && (
          <div className="mt-4 text-center text-yellow-600">
            Reconnecting...
          </div>
        )}

        <div className="mb-6 rounded bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold">{game.title}</h2>

          <p className="text-gray-600">
            Location: {game.site?.name ?? 'TBD'} ({game.site?.address ?? 'Unknown'})
          </p>

          <p className="text-gray-600">Start Time: {scheduledDisplay}</p>

          {teamName ? (
            <p className="mt-2 text-sm text-gray-500">
              Joined as: <span className="font-medium text-blue-800">{teamName}</span>
            </p>
          ) : null}

          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-sm ${game.status === 'LIVE'
              ? 'bg-green-200 text-green-800'
              : 'bg-yellow-100 text-yellow-700'
              }`}
          >
            {game.status}
          </span>
        </div>

        <div className="rounded bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-semibold">👥 Teams in Lobby</h3>

          {teams.length === 0 ? (
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