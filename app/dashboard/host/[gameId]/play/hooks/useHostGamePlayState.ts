// File: app/dashboard/host/[gameId]/play/hooks/useHostGamePlayState.ts
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import type {
  FlatQuestion,
  GameStateExpanded,
  Round,
  ReliableEmit,
  TeamDisplayMode,
} from '../types/host-play.types';

interface UseHostGamePlayStateArgs {
  gameId: string;
  socket: Socket | null;
  reliableEmit: ReliableEmit;
}

interface AnswerRevealPayload {
  gameId: string;
  roundId: string;
  roundName: string;
  questionId: string;
  questionText: string;
  questionType: string;
  correctAnswers: string[];
}

type LeaderboardPayload = {
  gameId: string;
  standings: {
    teamId: string;
    teamName: string;
    score: number;
    rank: number;
  }[];
};

export function useHostGamePlayState({
  gameId,
  socket,
  reliableEmit,
}: UseHostGamePlayStateArgs) {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameStateExpanded | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [displayMode, setDisplayMode] = useState<TeamDisplayMode>('QUESTION');

  const bootstrapGameState = useCallback(async () => {
    const res = await fetch(`/api/host/games/${gameId}/state`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const dto = (await res.json()) as GameStateExpanded;
    setGameState(dto);
    setDisplayMode(dto.game.displayMode ?? 'QUESTION');
    return dto;
  }, [gameId]);

  const orderedRounds = useMemo(
    () =>
      gameState?.game.rounds
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [gameState]
  );

  const flatQuestions = useMemo<FlatQuestion[]>(
    () =>
      orderedRounds.flatMap((round) =>
        round.questions
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((question) => ({
            ...question,
            roundId: round.id,
            roundName: round.name,
          }))
      ),
    [orderedRounds]
  );

  const currentIdx = flatQuestions.findIndex(
    (q) => q.id === gameState?.currentQuestionId
  );

  const currentRound = useMemo<Round | null>(() => {
    if (!gameState) return null;
    return (
      gameState.game.rounds.find((r) => r.id === gameState.currentRoundId) ??
      null
    );
  }, [gameState]);

  const isLastInRound = useMemo(() => {
    if (!currentRound || !gameState?.currentQuestionId) return false;
    const sortedQuestions = currentRound.questions
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return sortedQuestions.at(-1)?.id === gameState.currentQuestionId;
  }, [currentRound, gameState]);

  const isFinalQuestion = currentIdx === flatQuestions.length - 1;

  const buildAnswerRevealPayload = useCallback((): AnswerRevealPayload | null => {
    if (!gameState || !currentRound || !gameState.currentQuestionId) {
      return null;
    }

    const question =
      currentRound.questions.find(
        (q) => q.id === gameState.currentQuestionId
      ) ?? null;

    if (!question) {
      return null;
    }

    return {
      gameId: gameState.gameId,
      roundId: currentRound.id,
      roundName: currentRound.name,
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      correctAnswers: (question.options ?? [])
        .filter((option) => option.isCorrect)
        .map((option) => option.text),
    };
  }, [gameState, currentRound]);

  const buildLeaderboardPayload = useCallback((): LeaderboardPayload | null => {
  if (!gameState) return null;

  const standings = [...gameState.game.teamGames]
    .map((tg) => ({
      teamId: tg.team.id,
      teamName: tg.team.name,
      score: tg.score ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));

  return {
    gameId: gameState.gameId,
    standings,
  };
}, [gameState]);

  const handlePrev = useCallback(async () => {
    setLoadingPrev(true);

    try {
      await fetch(`/api/host/games/${gameId}/prev`, { method: 'POST' });

      reliableEmit(
        'host:previousQuestion',
        { gameId },
        () => {
          setDisplayMode('QUESTION');
          setLoadingPrev(false);
        },
        (err) => {
          console.error('Prev delivery failed', err);
          setLoadingPrev(false);
        }
      );
    } catch (err) {
      console.error('Prev failed', err);
      setLoadingPrev(false);
    }
  }, [gameId, reliableEmit]);

  const handleNext = useCallback(async () => {
    setLoadingNext(true);

    try {
      await fetch(`/api/host/games/${gameId}/next`, { method: 'POST' });

      reliableEmit(
        'host:nextQuestion',
        { gameId },
        () => {
          setDisplayMode('QUESTION');
          setLoadingNext(false);
        },
        (err) => {
          console.error('Next delivery failed', err);
          setLoadingNext(false);
        }
      );
    } catch (err) {
      console.error('Next failed', err);
      setLoadingNext(false);
    }
  }, [gameId, reliableEmit]);

  const handleShowQuestion = useCallback(async () => {
    try {
      await fetch(`/api/host/games/${gameId}/display-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayMode: 'QUESTION' }),
      });

      setDisplayMode('QUESTION');
      socket?.emit('host:showQuestion', { gameId });
    } catch (err) {
      console.error('Failed to switch to question mode', err);
    }
  }, [gameId, socket]);

  const handleShowLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/games/${gameId}/display-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayMode: 'LOBBY' }),
      });

      const data = await res.json();
      console.log('SET LOBBY MODE RESPONSE', { ok: res.ok, data });

      if (!res.ok) {
        console.error('Failed to persist lobby mode', data);
        return;
      }

      setDisplayMode('LOBBY');
      socket?.emit('host:showLobby', { gameId });
    } catch (err) {
      console.error('Failed to switch to lobby mode', err);
    }
  }, [gameId, socket]);

  const handleShowReveal = useCallback(async () => {
    try {
      const revealPayload = buildAnswerRevealPayload();

      if (!revealPayload) {
        console.error('Could not build answer reveal payload');
        return;
      }

      const res = await fetch(`/api/host/games/${gameId}/display-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayMode: 'ANSWER_REVEAL' }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to switch to answer reveal mode', data);
        return;
      }

      setDisplayMode('ANSWER_REVEAL');
      socket?.emit('host:showAnswerReveal', {
        gameId,
        reveal: revealPayload,
      });
    } catch (err) {
      console.error('Failed to switch to answer reveal mode', err);
    }
  }, [gameId, socket, buildAnswerRevealPayload]);

  

  const handleShowLeaderboard = useCallback(async () => {
  try {
    const leaderboardPayload = buildLeaderboardPayload();

    if (!leaderboardPayload) {
      console.error('Could not build leaderboard payload');
      return;
    }

    const res = await fetch(`/api/host/games/${gameId}/display-mode`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayMode: 'LEADERBOARD' }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Failed to switch to leaderboard mode', data);
      return;
    }

    setDisplayMode('LEADERBOARD');
    socket?.emit('host:showLeaderboard', {
      gameId,
      leaderboard: leaderboardPayload,
    });
  } catch (err) {
    console.error('Failed to switch to leaderboard mode', err);
  }
}, [gameId, socket, buildLeaderboardPayload]);

  const handleComplete = useCallback(async () => {
    await fetch(`/api/host/games/${gameId}/complete`, { method: 'PATCH' });
    socket?.emit('host:gameCompleted', { gameId });
    router.push(`/dashboard/host/${gameId}/play/results`);
  }, [gameId, router, socket]);

  return {
    gameState,
    setGameState,
    bootstrapGameState,
    orderedRounds,
    flatQuestions,
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
  };
}