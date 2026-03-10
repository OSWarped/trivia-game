'use client';

import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import AppBackground from '@/components/AppBackground';
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
      const displayMode =
        resumeData.displayMode ?? (resumedStatus === 'LIVE' ? 'QUESTION' : 'LOBBY');

      const refreshedSession: StoredTeamSession = {
        gameId,
        teamId: resumeData.teamId,
        teamName: resumedTeamName,
        sessionToken: resumeData.session.sessionToken,
        deviceId: resumeData.session.deviceId,
        lastKnownStatus: resumedStatus,
        lastKnownScreen:
          displayMode === 'LOBBY'
            ? 'lobby'
            : displayMode === 'ANSWER_REVEAL'
              ? 'answer-reveal'
              : 'play',
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
        router.replace(`/games/${gameId}/play`);
        return;
      }

      if (displayMode === 'ANSWER_REVEAL') {
        router.replace(`/games/${gameId}/answer-reveal`);
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

    const handleShowAnswerReveal = (payload: {
      gameId: string;
      reveal: {
        gameId: string;
        roundId: string;
        roundName: string;
        questionId: string;
        questionText: string;
        questionType: string;
        correctAnswers: string[];
      };
    }) => {
      if (!payload?.reveal) {
        console.error('Missing answer reveal payload');
        return;
      }

      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      sessionStorage.setItem(
        `trivia:${gameId}:answerReveal`,
        JSON.stringify(payload.reveal)
      );

      router.replace(`/games/${gameId}/answer-reveal`);
    };

    const handleShowLeaderboard = (payload: {
      gameId: string;
      leaderboard: {
        gameId: string;
        standings: {
          teamId: string;
          teamName: string;
          score: number;
          rank: number;
        }[];
      };
    }) => {
      if (!payload?.leaderboard) {
        console.error('Missing leaderboard payload');
        return;
      }

      sessionStorage.removeItem(`trivia:${gameId}:answerReveal`);
      sessionStorage.setItem(
        `trivia:${gameId}:leaderboard`,
        JSON.stringify(payload.leaderboard)
      );

      router.replace(`/games/${gameId}/leaderboard`);
    };

    socket.on('game:showQuestion', handleShowQuestion);
    socket.on('game:showLobby', handleShowLobby);
    socket.on('game:showAnswerReveal', handleShowAnswerReveal);
    socket.on('game:showLeaderboard', handleShowLeaderboard);

    return () => {
      socket.off('game:showQuestion', handleShowQuestion);
      socket.off('game:showLobby', handleShowLobby);
      socket.off('game:showAnswerReveal', handleShowAnswerReveal);
      socket.off('game:showLeaderboard', handleShowLeaderboard);
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

    const handleLiveTeams = (payload: { gameId: string; teams: Team[] }) => {
      if (payload.gameId === gameId) {
        setTeams(payload.teams);
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    socket.on('team:liveTeams', handleLiveTeams);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      socket.off('team:liveTeams', handleLiveTeams);
    };
  }, [socket, gameId, teamId, teamName, router]);

  const scheduledDisplay = useMemo(() => {
    if (!game?.scheduledFor) return 'TBD';
    return new Date(game.scheduledFor).toLocaleString();
  }, [game?.scheduledFor]);

  if (loading) {
    return (
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-slate-200">
            {isRestoringSession
              ? 'Restoring your team session...'
              : 'Loading game info...'}
          </p>
        </div>
      </AppBackground>
    );
  }

  if (loadError) {
    return (
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-red-200">{loadError}</p>
        </div>
      </AppBackground>
    );
  }

  if (!game) {
    return (
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-red-200">Game data was not found.</p>
        </div>
      </AppBackground>
    );
  }

  if (!teamId) {
    return (
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-red-200">Missing team session.</p>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Team Lobby
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {game.title}
          </h1>

          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <p>
              <span className="font-semibold text-white">Location:</span>{' '}
              {game.site?.name ?? 'TBD'}
            </p>
            <p>
              <span className="font-semibold text-white">Address:</span>{' '}
              {game.site?.address ?? 'Unknown'}
            </p>
            <p>
              <span className="font-semibold text-white">Start Time:</span>{' '}
              {scheduledDisplay}
            </p>
          </div>

          {teamName ? (
            <p className="mt-4 text-sm text-slate-300">
              Joined as:{' '}
              <span className="font-semibold text-white">{teamName}</span>
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                game.status === 'LIVE'
                  ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-blue-300/40 bg-blue-500/10 text-blue-100'
              }`}
            >
              {game.status}
            </span>

            {connectionStatus === 'disconnected' ? (
              <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-100">
                Reconnecting...
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">Teams in Lobby</h2>
          <p className="mt-1 text-sm text-slate-300">
            Waiting for the host to start the game…
          </p>

          {teams.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-900/30 p-6 text-center">
              <p className="text-sm text-slate-300">No teams have joined yet.</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/35 px-4 py-3"
                >
                  <span className="font-medium text-white">{team.name}</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
                    Ready
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppBackground>
  );
}