'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameStatus } from '@prisma/client';
import {
    clearStoredGameSession,
    getStoredDeviceIdentity,
    getStoredGameSession,
    persistSession,
    type StoredTeamSession,
} from '../lib/play-session-storage';

export type QuestionOptionObject = {
    id: string;
    text: string;
};

export type QuestionOption = string | QuestionOptionObject;

type QuestionType =
    | 'SINGLE'
    | 'MULTIPLE_CHOICE'
    | 'ORDERED'
    | 'WAGER'
    | 'LIST';

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
    route?: string;
    redirectTo?: string;
    session?: ResumeSessionPayload;
    error?: string;
    code?: string;
    clearStoredSession?: boolean;
    displayMode?: 'QUESTION' | 'LOBBY' | 'ANSWER_REVEAL' | 'LEADERBOARD';
}

export interface GameState {
    game: { id: string; status: string };
    round: {
        id: string;
        name: string;
        roundType: 'STANDARD' | 'WAGER' | 'LIGHTNING';
        pointSystem: 'FIXED' | 'POOL';
        pointPool: number[] | null;
        pointValue: number | null;
        wagerLimit: number | null;
    } | null;
    currentQuestion: {
        id: string;
        text: string;
        type: QuestionType;
        options?: QuestionOption[];
    } | null;
    team: {
        id: string;
        name?: string;
        remainingPoints: number[];
        submittedAnswer?: { answer: string; pointsUsed: number[] } | null;
        score: number;
    };
}

interface UsePlayBootstrapParams {
    gameId: string;
    router: {
        replace: (href: string) => void;
    };
}

export function usePlayBootstrap({
    gameId,
    router,
}: UsePlayBootstrapParams) {
    const [teamId, setTeamId] = useState<string | null>(null);
    const [teamName, setTeamName] = useState<string | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
    const [state, setState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRestoringSession, setIsRestoringSession] = useState(true);
    const [loadError, setLoadError] = useState('');

    const fetchGameState = useCallback(
        async (resolvedTeamId: string) => {
            const res = await fetch(`/api/games/${gameId}/state?teamId=${resolvedTeamId}`, {
                credentials: 'include',
                cache: 'no-store',
            });

            if (!res.ok) {
                throw new Error('Failed to load game state.');
            }

            const gameState = (await res.json()) as GameState;
            setState(gameState);

            return gameState;
        },
        [gameId]
    );



    const initializePage = useCallback(async () => {
        if (!gameId) return;

        setLoading(true);
        setIsRestoringSession(true);
        setLoadError('');
        setSessionToken(null);
        setDeviceId(null);

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

            setGameInfo(resolvedGame);

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
            const displayMode = resumeData.displayMode ?? (resumedStatus === 'LIVE' ? 'QUESTION' : 'LOBBY');

            const refreshedSession: StoredTeamSession = {
                gameId,
                teamId: resumeData.teamId,
                teamName: resumedTeamName,
                sessionToken: resumeData.session.sessionToken,
                deviceId: resumeData.session.deviceId,
                lastKnownStatus: resumedStatus,
                lastKnownScreen: displayMode === 'LOBBY' ? 'lobby' : 'play',
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
            setSessionToken(refreshedSession.sessionToken);
            setDeviceId(refreshedSession.deviceId);

            if (displayMode === 'LOBBY') {
                router.replace(`/games/${gameId}/lobby`);
                return;
            }

            if (displayMode === 'ANSWER_REVEAL') {
                router.replace(`/games/${gameId}/answer-reveal`);
                return;
            }

            await fetchGameState(refreshedSession.teamId);
        } catch (error) {
            console.error('Failed to initialize play page:', error);
            setLoadError('Failed to restore game session.');
        } finally {
            setIsRestoringSession(false);
            setLoading(false);
        }
    }, [fetchGameState, gameId, router]);

    useEffect(() => {
        void initializePage();
    }, [initializePage]);

    return {
        teamId,
        teamName,
        sessionToken,
        deviceId,
        gameInfo,
        state,
        setState,
        loading,
        isRestoringSession,
        loadError,
        fetchGameState,
    };
}