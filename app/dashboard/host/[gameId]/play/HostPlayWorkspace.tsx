'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';
import { useReliableEmit } from '@/lib/reliable-handshake';
import TeamSidebar from './components/TeamSidebar';
import CurrentGamePanel from './components/CurrentGamePanel';
import TeamAnswerGrid from './components/TeamAnswerGrid';
import TeamDrawer from './components/TeamDrawer';
import JoinAccessModal from './components/JoinAccessModal';
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
    const [showJoinAccess, setShowJoinAccess] = useState(false);

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
        resetTeamPin,
        setTeamTransferMode,
        approveJoinRequest,
        denyJoinRequest,
        bootTeamSession,
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
        loadingPrev,
        loadingNext,
        displayMode,
        handlePrev,
        handleNext,
        handleShowQuestion,
        handleShowReveal,
        handleShowLeaderboard,
        handleShowLobby,
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
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="flex min-h-screen">
                <div className="hidden md:block">
                    <TeamSidebar
                        teamStatus={teamStatus}
                        onRequestLiveTeams={() =>
                            socket?.emit('host:requestLiveTeams', { gameId })
                        }
                        onRevokeSession={revokeTeamSession}
                        onUnlockSession={unlockTeamSession}
                        onResetPin={resetTeamPin}
                        onSetTeamTransferMode={setTeamTransferMode}
                        onApproveJoinRequest={approveJoinRequest}
                        onDenyJoinRequest={denyJoinRequest}
                        onBootTeam={bootTeamSession}
                    />
                </div>

                <TeamDrawer
                    teamStatus={teamStatus}
                    onRequestLiveTeams={() =>
                        socket?.emit('host:requestLiveTeams', { gameId })
                    }
                    onRevokeSession={revokeTeamSession}
                    onUnlockSession={unlockTeamSession}
                    onResetPin={resetTeamPin}
                    onSetTeamTransferMode={setTeamTransferMode}
                    onApproveJoinRequest={approveJoinRequest}
                    onDenyJoinRequest={denyJoinRequest}
                    onBootTeam={bootTeamSession}
                />

                <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                    <div className="mx-auto max-w-7xl space-y-6">
                        <header className="border-b border-slate-200 pb-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                                        {gameState?.game.title ?? 'Game'}
                                    </h1>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                        {gameState?.game.scheduledFor ? (
                                            <span>
                                                {new Date(gameState.game.scheduledFor).toLocaleString()}
                                            </span>
                                        ) : null}

                                        {gameState?.game.season?.name ? (
                                            <span>Season: {gameState.game.season.name}</span>
                                        ) : null}

                                        {gameState?.game.site?.name ? (
                                            <span>Site: {gameState.game.site.name}</span>
                                        ) : null}

                                        {gameState?.game.tag ? (
                                            <span>Tag: {gameState.game.tag}</span>
                                        ) : null}
                                    </div>
                                </div>

                                {gameState?.game.joinCode ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowJoinAccess(true)}
                                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Join Access
                                    </button>
                                ) : null}
                            </div>
                        </header>

                        {connectionStatus === 'disconnected' && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                                Connection to the live game socket was interrupted. Attempting to
                                reconnect.
                            </div>
                        )}

                        {gameState && currentRound && (
                            <CurrentGamePanel
                                gameId={gameId}
                                currentRound={currentRound}
                                currentQuestionId={gameState.currentQuestionId}
                                isLastInRound={isLastInRound}
                                isFinalQuestion={isFinalQuestion}
                                displayMode={displayMode}
                                disablePrev={loadingPrev || loadingNext}
                                disableNext={loadingPrev || loadingNext}
                                onPrev={handlePrev}
                                onNext={handleNext}
                                onShowQuestion={handleShowQuestion}
                                onShowReveal={handleShowReveal}
                                onShowLeaderboard={handleShowLeaderboard}
                                onShowLobby={handleShowLobby}
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
                    </div>
                </main>
            </div>

            <JoinAccessModal
                open={showJoinAccess}
                gameTitle={gameState?.game.title ?? 'Game'}
                joinCode={gameState?.game.joinCode ?? ''}
                onClose={() => setShowJoinAccess(false)}
            />
        </div>
    );
}