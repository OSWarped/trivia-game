// app/dashboard/host/[gameId]/play/hooks/usePlaySocketSync.ts
'use client';

import { useEffect, useState } from 'react';

type VoidHandler = () => void;
type ScoreUpdateHandler = (payload: { teamId: string; newScore: number }) => void;
type ShowLobbyHandler = (payload: { gameId: string }) => void;
type ShowQuestionHandler = (payload: { gameId: string }) => void;
type ShowAnswerRevealHandler = (payload: {
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
}) => void;
type ShowLeaderboardHandler = (payload: {
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
}) => void;

interface PlaySocketLike {
  connected: boolean;
  on(event: 'disconnect', handler: VoidHandler): void;
  on(event: 'connect', handler: VoidHandler): void;
  on(event: 'score:update', handler: ScoreUpdateHandler): void;
  on(event: 'game:updateQuestion', handler: VoidHandler): void;
  on(event: 'game:gameCompleted', handler: VoidHandler): void;
  on(event: 'game:showLobby', handler: ShowLobbyHandler): void;
  on(event: 'game:showQuestion', handler: ShowQuestionHandler): void;
  on(event: 'game:showAnswerReveal', handler: ShowAnswerRevealHandler): void;
  on(event: 'game:showLeaderboard', handler: ShowLeaderboardHandler): void;

  off(event: 'disconnect', handler: VoidHandler): void;
  off(event: 'connect', handler: VoidHandler): void;
  off(event: 'score:update', handler: ScoreUpdateHandler): void;
  off(event: 'game:updateQuestion', handler: VoidHandler): void;
  off(event: 'game:gameCompleted', handler: VoidHandler): void;
  off(event: 'game:showLobby', handler: ShowLobbyHandler): void;
  off(event: 'game:showQuestion', handler: ShowQuestionHandler): void;
  off(event: 'game:showAnswerReveal', handler: ShowAnswerRevealHandler): void;
  off(event: 'game:showLeaderboard', handler: ShowLeaderboardHandler): void;
}

interface ScoreUpdatePayload {
  teamId: string;
  newScore: number;
}

interface AnswerRevealPayload {
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
}

interface LeaderboardPayload {
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
}

interface UsePlaySocketSyncParams {
  socket: PlaySocketLike | null;
  gameId: string | null;
  onScoreUpdate: (payload: ScoreUpdatePayload) => void;
  onQuestionAdvance: () => void | Promise<void>;
  onGameCompleted: () => void;
  onShowLobby: () => void | Promise<void>;
  onShowQuestion: () => void | Promise<void>;
  onShowAnswerReveal: (payload: AnswerRevealPayload) => void | Promise<void>;
  onShowLeaderboard: (payload: LeaderboardPayload) => void | Promise<void>;
}

export function usePlaySocketSync({
  socket,
  gameId,
  onScoreUpdate,
  onQuestionAdvance,
  onGameCompleted,
  onShowLobby,
  onShowQuestion,
  onShowAnswerReveal,
  onShowLeaderboard,
}: UsePlaySocketSyncParams) {
  const [connectionStatus, setConnectionStatus] = useState('connected');

  useEffect(() => {
    if (!socket || !gameId) return;

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnect = () => {
      setConnectionStatus('connected');
    };

    const handleScoreUpdate = (payload: ScoreUpdatePayload) => {
      onScoreUpdate(payload);
    };

    const handleQuestionAdvance = async () => {
      await onQuestionAdvance();
    };

    const handleGameCompleted = () => {
      onGameCompleted();
    };

    const handleShowLobby = async (payload: { gameId: string }) => {
      if (payload.gameId !== gameId) return;
      await onShowLobby();
    };

    const handleShowQuestion = async (payload: { gameId: string }) => {
      if (payload.gameId !== gameId) return;
      await onShowQuestion();
    };

    const handleShowAnswerReveal = async (payload: AnswerRevealPayload) => {
      if (payload.gameId !== gameId) return;
      await onShowAnswerReveal(payload);
    };

    const handleShowLeaderboard = async (payload: LeaderboardPayload) => {
      if (payload.gameId !== gameId) return;
      await onShowLeaderboard(payload);
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    socket.on('score:update', handleScoreUpdate);
    socket.on('game:updateQuestion', handleQuestionAdvance);
    socket.on('game:gameCompleted', handleGameCompleted);
    socket.on('game:showLobby', handleShowLobby);
    socket.on('game:showQuestion', handleShowQuestion);
    socket.on('game:showAnswerReveal', handleShowAnswerReveal);
    socket.on('game:showLeaderboard', handleShowLeaderboard);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      socket.off('score:update', handleScoreUpdate);
      socket.off('game:updateQuestion', handleQuestionAdvance);
      socket.off('game:gameCompleted', handleGameCompleted);
      socket.off('game:showLobby', handleShowLobby);
      socket.off('game:showQuestion', handleShowQuestion);
      socket.off('game:showAnswerReveal', handleShowAnswerReveal);
      socket.off('game:showLeaderboard', handleShowLeaderboard);
    };
  }, [
    socket,
    gameId,
    onScoreUpdate,
    onQuestionAdvance,
    onGameCompleted,
    onShowLobby,
    onShowQuestion,
    onShowAnswerReveal,
    onShowLeaderboard,
  ]);

  return {
    connectionStatus,
  };
}