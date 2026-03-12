'use client';

import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import AppBackground from '@/components/AppBackground';
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

            const raw = sessionStorage.getItem(`trivia:${gameId}:leaderboard`);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw) as LeaderboardPayload;
                    setLeaderboard(parsed);
                } catch (err) {
                    console.error('Failed to parse leaderboard payload', err);
                }
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
            router.replace(`/games/${gameId}/answer-reveal`);
        };

        const handleShowLeaderboard = (payload: {
            gameId: string;
            leaderboard: LeaderboardPayload;
        }) => {
            if (!payload?.leaderboard) return;

            sessionStorage.setItem(
                `trivia:${gameId}:leaderboard`,
                JSON.stringify(payload.leaderboard)
            );
            setLeaderboard(payload.leaderboard);
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
        onAuthenticated: () => { },
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

    const rankedStandings = useMemo(() => {
        if (!leaderboard) return [];

        const sorted = [...leaderboard.standings].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.teamName.localeCompare(b.teamName);
        });

        const scoreCounts = new Map<number, number>();
        for (const entry of sorted) {
            scoreCounts.set(entry.score, (scoreCounts.get(entry.score) ?? 0) + 1);
        }

        let lastScore: number | null = null;
        let lastRank = 0;

        return sorted.map((entry, index) => {
            const position = index + 1;

            if (lastScore === null || entry.score !== lastScore) {
                lastRank = position;
            }

            const rankedEntry = {
                ...entry,
                displayRank: lastRank,
                isTied: (scoreCounts.get(entry.score) ?? 0) > 1,
            };

            lastScore = entry.score;
            return rankedEntry;
        });
    }, [leaderboard]);


    if (loading) {
        return (
            <AppBackground
                variant="hero"
                className="flex min-h-screen items-center justify-center px-6 py-12"
            >
                <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <p className="text-sm text-slate-200">
                        {isRestoringSession
                            ? 'Restoring your team session...'
                            : 'Loading leaderboard...'}
                    </p>
                </div>
            </AppBackground>
        );
    }

    if (loadError) {
        return (
            <AppBackground
                variant="hero"
                className="flex min-h-screen items-center justify-center px-6 py-12"
            >
                <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <p className="text-sm text-red-200">{loadError}</p>
                </div>
            </AppBackground>
        );
    }

    if (!game) {
        return (
            <AppBackground
                variant="hero"
                className="flex min-h-screen items-center justify-center px-6 py-12"
            >
                <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <p className="text-sm text-red-200">Game data was not found.</p>
                </div>
            </AppBackground>
        );
    }

    if (!teamId) {
        return (
            <AppBackground
                variant="hero"
                className="flex min-h-screen items-center justify-center px-6 py-12"
            >
                <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <p className="text-sm text-red-200">Missing team session.</p>
                </div>
            </AppBackground>
        );
    }

    return (
        <AppBackground variant="hero" className="min-h-screen px-6 py-8 md:py-12">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                        Leaderboard
                    </div>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        {game.title}
                    </h1>

                    <div className="mt-4 space-y-2 text-sm text-slate-200">
                        <p>
                            <span className="font-semibold text-white">Location:</span>{' '}
                            {game.site?.name ?? 'TBD'}
                        </p>

                    </div>

                    {teamName ? (
                        <p className="mt-4 text-sm text-slate-300">
                            Team:{' '}
                            <span className="font-semibold text-white">{teamName}</span>
                        </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span
                            className={`rounded-full border px-3 py-1 text-sm font-medium ${game.status === 'LIVE'
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
                </header>

                <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <div className="text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                            Current Standings
                        </div>

                        {leaderboard ? (
                            <div className="mx-auto mt-6 max-w-2xl space-y-3 text-left">
                                {rankedStandings.map((entry) => {
                                    const isCurrentTeam = entry.teamId === teamId;

                                    return (
                                        <div
                                            key={entry.teamId}
                                            className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${isCurrentTeam
                                                ? 'border-blue-300/30 bg-blue-500/10'
                                                : 'border-white/10 bg-slate-900/30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 text-xl font-bold text-slate-300">
                                                    {entry.displayRank}
                                                </div>

                                                <div>
                                                    <div
                                                        className={`text-lg font-semibold ${isCurrentTeam ? 'text-blue-100' : 'text-white'
                                                            }`}
                                                    >
                                                        {entry.teamName}
                                                    </div>

                                                    {isCurrentTeam ? (
                                                        <div className="text-sm text-blue-200">Your team</div>
                                                    ) : null}

                                                    {entry.isTied ? (
                                                        <div className="text-xs text-amber-200">Tied</div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-white">
                                                    {entry.score}
                                                </div>
                                                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                                                    Points
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                                    The leaderboard is being prepared
                                </h2>

                                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
                                    No leaderboard data is available yet.
                                </p>
                            </>
                        )}

                        <p className="mt-8 text-sm text-slate-400">
                            Waiting for the host to continue…
                        </p>
                    </div>
                </section>
            </div>
        </AppBackground>
    );
}