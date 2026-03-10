'use client';

import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';

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
  displayMode?: 'QUESTION' | 'LOBBY' | 'ANSWER_REVEAL' | 'LEADERBOARD';
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
  lastKnownScreen: 'lobby' | 'play' | 'answer-reveal' | 'leaderboard';
  joinedAt: string;
  lastSeenAt: string;
}

interface StoredDeviceIdentity {
  deviceId: string;
  createdAt: string;
}

interface LeaderboardPayload {
  gameId: string;
  standings: {
    teamId: string;
    teamName: string;
    score: number;
    rank: number;
  }[];
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
      (parsed.lastKnownScreen !== 'lobby' &&
        parsed.lastKnownScreen !== 'play' &&
        parsed.lastKnownScreen !== 'answer-reveal' &&
        parsed.lastKnownScreen !== 'leaderboard') ||
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

export default function LeaderboardPage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const socket = useSocket();

  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [game, setGame] = useState<GameInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected'
  >('connected');

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
      const displayMode =
        resumeData.displayMode ??
        (resumedStatus === 'LIVE' ? 'QUESTION' : 'LOBBY');

      const lastKnownScreen =
        displayMode === 'LOBBY'
          ? 'lobby'
          : displayMode === 'ANSWER_REVEAL'
            ? 'answer-reveal'
            : displayMode === 'LEADERBOARD'
              ? 'leaderboard'
              : 'play';

      const refreshedSession: StoredTeamSession = {
        gameId,
        teamId: resumeData.teamId,
        teamName: resumedTeamName,
        sessionToken: resumeData.session.sessionToken,
        deviceId: resumeData.session.deviceId,
        lastKnownStatus: resumedStatus,
        lastKnownScreen,
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

      if (displayMode === 'QUESTION') {
        sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
        router.replace(`/games/${gameId}/play`);
        return;
      }

      if (displayMode === 'LOBBY') {
        sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
        router.replace(`/games/${gameId}/lobby`);
        return;
      }

      if (displayMode === 'ANSWER_REVEAL') {
        sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
        router.replace(`/games/${gameId}/answer-reveal`);
        return;
      }
    } catch (error) {
      console.error('Failed to initialize leaderboard page:', error);
      setLoadError('Failed to restore leaderboard session.');
    } finally {
      setIsRestoringSession(false);
      setLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => {
    void initializePage();
  }, [initializePage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !gameId) return;

    const raw = sessionStorage.getItem(`trivia:${gameId}:leaderboard`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LeaderboardPayload;
      setLeaderboard(parsed);
    } catch (err) {
      console.error('Failed to parse leaderboard payload', err);
    }
  }, [gameId]);

  useEffect(() => {
    if (!socket) return;

    const handleShowQuestion = () => {
      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      router.replace(`/games/${gameId}/play`);
    };

    const handleShowLobby = () => {
      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      router.replace(`/games/${gameId}/lobby`);
    };

    const handleShowAnswerReveal = () => {
      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      router.replace(`/games/${gameId}/answer-reveal`);
    };

    socket.on('game:showQuestion', handleShowQuestion);
    socket.on('game:showLobby', handleShowLobby);
    socket.on('game:showAnswerReveal', handleShowAnswerReveal);

    return () => {
      socket.off('game:showQuestion', handleShowQuestion);
      socket.off('game:showLobby', handleShowLobby);
      socket.off('game:showAnswerReveal', handleShowAnswerReveal);
    };
  }, [socket, router, gameId]);

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
      // no-op for now
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
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
    };
  }, [socket, gameId, teamId, teamName]);

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
            : 'Loading leaderboard...'}
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
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          🏆 Leaderboard
        </h1>

        {connectionStatus === 'disconnected' && (
          <div className="mt-4 text-center text-yellow-700">Reconnecting...</div>
        )}

        <div className="mb-6 rounded bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold">{game.title}</h2>

          <p className="text-gray-600">
            Location: {game.site?.name ?? 'TBD'} ({game.site?.address ?? 'Unknown'})
          </p>

          <p className="text-gray-600">Start Time: {scheduledDisplay}</p>

          {teamName ? (
            <p className="mt-2 text-sm text-gray-500">
              Joined as:{' '}
              <span className="font-medium text-slate-900">{teamName}</span>
            </p>
          ) : null}

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

        <div className="rounded bg-white p-8 shadow">
          <div className="text-center">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
              Current Standings
            </div>

            {leaderboard ? (
              <>
                <div className="mx-auto mt-6 max-w-2xl space-y-3 text-left">
                  {leaderboard.standings.map((entry) => {
                    const isCurrentTeam = entry.teamId === teamId;

                    return (
                      <div
                        key={entry.teamId}
                        className={`flex items-center justify-between rounded-lg border px-4 py-4 ${
                          isCurrentTeam
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 text-xl font-bold text-slate-500">
                            {entry.rank}
                          </div>

                          <div>
                            <div
                              className={`text-lg font-semibold ${
                                isCurrentTeam ? 'text-blue-900' : 'text-slate-900'
                              }`}
                            >
                              {entry.teamName}
                            </div>

                            {isCurrentTeam ? (
                              <div className="text-sm text-blue-700">
                                Your team
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">
                            {entry.score}
                          </div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Points
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-900">
                  The leaderboard is being prepared
                </h3>

                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
                  No leaderboard data is available yet.
                </p>
              </>
            )}

            <p className="mt-8 text-sm text-slate-500">
              Waiting for the host to continue…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}