// File: app/dashboard/host/[gameId]/play/HostPlayWorkspace.tsx
'use client';

import React, { useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';
import { useReliableEmit } from '@/lib/reliable-handshake';
import TeamSidebar from './components/TeamSidebar';
import CurrentGamePanel from './components/CurrentGamePanel';
import TeamAnswerGrid from './components/TeamAnswerGrid';
import TeamDrawer from './components/TeamDrawer';
import { useHostGamePlayState } from './hooks/useHostGamePlayState';
import { useHostAnswers } from './hooks/useHostAnswers';
import { useHostTeamSessions } from './hooks/useHostTeamSessions';

interface HostPlayWorkspaceProps {
    gameId: string;
}

export default function HostPlayWorkspace({
    gameId,
}: HostPlayWorkspaceProps) {
    const socket = useSocket();

    useHostSocket(true, gameId ?? null);

    const reliableEmit = useReliableEmit(socket!, {
        timeoutMs: 3000,
        maxRetries: 3,
    });

    const {
        teamStatus,
        setTeamStatus,
        connectionStatus,
        revokeTeamSession,
        unlockTeamSession,
    } = useHostTeamSessions({
        gameId,
        socket,
    });

    const {
        gameState,
        setGameState,
        bootstrapGameState,
        currentRound,
        isLastInRound,
        isFinalQuestion,
        handlePrev,
        handleNext,
        handleComplete,
    } = useHostGamePlayState({
        gameId,
        socket,
        reliableEmit,
    });

    const {
        teamAnswers,
        favoriteMap,
        bootstrapAnswersForCurrentQuestion,
        handleFavorite,
        handleScore,
        handleListScore,
        handleQuestionAdvanceReset,
    } = useHostAnswers({
        gameId,
        socket,
        reliableEmit,
        gameState,
        setTeamStatus,
    });



    useEffect(() => {
        if (!socket || !gameId) return;

        const bootstrap = async () => {
            const dto = await bootstrapGameState();
            if (!dto) return;

            setGameState(dto);
            await bootstrapAnswersForCurrentQuestion(dto);
            socket.emit('host:requestLiveTeams', { gameId });
        };

        const handleQuestionAdvance = async () => {
            const dto = await bootstrapGameState();
            if (!dto) return;

            setGameState(dto);
            handleQuestionAdvanceReset();
            await bootstrapAnswersForCurrentQuestion(dto);
        };

        void bootstrap();

        socket.on('game:updateQuestion', handleQuestionAdvance);

        return () => {
            socket.off('game:updateQuestion', handleQuestionAdvance);
        };
    }, [
        socket,
        gameId,
        bootstrapGameState,
        bootstrapAnswersForCurrentQuestion,
        handleQuestionAdvanceReset,
        setGameState,
    ]);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="hidden md:block">
                <TeamSidebar
                    teamStatus={teamStatus}
                    onRequestLiveTeams={() => socket?.emit('host:requestLiveTeams', { gameId })}
                    onRevokeSession={revokeTeamSession}
                    onUnlockSession={unlockTeamSession}
                />
            </div>

            <TeamDrawer
                teamStatus={teamStatus}
                onRequestLiveTeams={() => socket?.emit('host:requestLiveTeams', { gameId })}
                onRevokeSession={revokeTeamSession}
                onUnlockSession={unlockTeamSession}
            />

            <main className="flex-1 p-6 md:p-8">
                <h1 className="mb-6 border-b pb-2 text-3xl font-bold text-gray-800">
                    🎯 Host Game Dashboard
                </h1>

                {gameState && currentRound && (
                    <CurrentGamePanel
                        gameId={gameId}
                        currentRound={currentRound}
                        currentQuestionId={gameState.currentQuestionId}
                        isLastInRound={isLastInRound}
                        isFinalQuestion={isFinalQuestion}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onComplete={handleComplete}
                    />
                )}

                <TeamAnswerGrid
                    teamAnswers={teamAnswers.map((answer) => ({
                        ...answer,
                        favorite: favoriteMap[answer.id] ?? false,
                    }))}
                    currentRound={currentRound}
                    handleScore={handleScore}
                    handleListScore={handleListScore}
                    handleFavorite={(teamId, questionId, fav) => {
                        const answer = teamAnswers.find(
                            (a) => a.teamId === teamId && a.questionId === questionId
                        );

                        if (!answer) return;
                        handleFavorite(answer.id, fav);
                    }}
                />

                {connectionStatus === 'disconnected' && (
                    <div className="mt-4 text-center text-yellow-600">Reconnecting...</div>
                )}
            </main>
        </div>
    );
}