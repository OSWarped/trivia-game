// File: app/dashboard/host/[gameId]/play/hooks/useHostGamePlayState.ts
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import type {
  FlatQuestion,
  GameStateExpanded,
  Round,
  ReliableEmit
} from '../types/host-play.types';

interface UseHostGamePlayStateArgs {
  gameId: string;
  socket: Socket | null;
  reliableEmit: ReliableEmit;
}

export function useHostGamePlayState({
  gameId,
  socket,
  reliableEmit,
}: UseHostGamePlayStateArgs) {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameStateExpanded | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);

  const bootstrapGameState = useCallback(async () => {
    const res = await fetch(`/api/host/games/${gameId}/state`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const dto = (await res.json()) as GameStateExpanded;
    setGameState(dto);
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

  const handlePrev = useCallback(async () => {
    setLoadingPrev(true);

    try {
      await fetch(`/api/host/games/${gameId}/prev`, { method: 'POST' });

      reliableEmit(
        'host:previousQuestion',
        { gameId },
        () => setLoadingPrev(false),
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
        () => setLoadingNext(false),
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
    handlePrev,
    handleNext,
    handleComplete,
  };
}