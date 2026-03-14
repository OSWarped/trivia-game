'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { TeamAnswerWithFavorite } from '../components/TeamAnswerGrid';
import type {
  GameStateExpanded,
  HostTeamStatus,
  Question,
  ReliableEmit,
} from '../types/host-play.types';

interface UseHostAnswersArgs {
  gameId: string;
  socket: Socket | null;
  reliableEmit: ReliableEmit;
  gameState: GameStateExpanded | null;
  setTeamStatus: React.Dispatch<React.SetStateAction<HostTeamStatus[]>>;
}

export function useHostAnswers({
  gameId,
  socket,
  reliableEmit,
  gameState,
  setTeamStatus,
}: UseHostAnswersArgs) {
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswerWithFavorite[]>([]);

  const favoriteMap = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};

    teamAnswers.forEach((answer) => {
      map[answer.id] = !!answer.favorite;
    });

    return map;
  }, [teamAnswers]);

  const currentQuestionRef = useRef<string | null>(null);
  const pointSystemRef = useRef<'POOL' | 'FLAT' | null>(null);
  const pointValueRef = useRef<number | null>(null);
  const questionTypeRef = useRef<Question['type'] | null>(null);

  useEffect(() => {
    currentQuestionRef.current = gameState?.currentQuestionId ?? null;

    const currentRound = gameState
      ? gameState.game.rounds.find((r) => r.id === gameState.currentRoundId)
      : null;

    pointSystemRef.current = currentRound?.pointSystem ?? null;
    pointValueRef.current = currentRound?.pointValue ?? null;

    if (currentRound && gameState?.currentQuestionId) {
      const question = currentRound.questions.find(
        (q) => q.id === gameState.currentQuestionId
      );
      questionTypeRef.current = question?.type ?? null;
    } else {
      questionTypeRef.current = null;
    }
  }, [gameState]);

  const fetchAnswers = useCallback(
    async (questionId: string, isList: boolean) => {
      const res = await fetch(
        `/api/host/games/${gameId}/answers?questionId=${questionId}`,
        { cache: 'no-store' }
      );

      if (!res.ok) return;

      const raw = (await res.json()) as TeamAnswerWithFavorite[];

      if (!isList) {
        setTeamAnswers(raw);
        return;
      }

      const withItems = raw.map((answer) => {
        let arr: string[] = [];

        try {
          arr = JSON.parse(answer.given) as string[];
        } catch {
          arr = [];
        }

        return {
          ...answer,
          items: arr.map((submitted) => ({
            submitted,
            isCorrect: null,
          })),
        };
      });

      setTeamAnswers(withItems);
    },
    [gameId]
  );

  const bootstrapAnswersForCurrentQuestion = useCallback(
    async (dto: GameStateExpanded) => {
      if (!dto.currentQuestionId) {
        setTeamAnswers([]);
        return;
      }

      const round = dto.game.rounds.find((r) => r.id === dto.currentRoundId);
      if (!round) return;

      const question = round.questions.find(
        (q) => q.id === dto.currentQuestionId
      );
      if (!question) return;

      await fetchAnswers(dto.currentQuestionId, question.type === 'LIST');
    },
    [fetchAnswers]
  );

  const handleFavorite = useCallback((answerId: string, fav: boolean) => {
    setTeamAnswers((prev) =>
      prev.map((answer) =>
        answer.id === answerId ? { ...answer, favorite: fav } : answer
      )
    );

    fetch(`/api/host/answers/${answerId}/favorite`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: fav }),
    }).catch(() => {
      setTeamAnswers((prev) =>
        prev.map((answer) =>
          answer.id === answerId ? { ...answer, favorite: !fav } : answer
        )
      );
    });
  }, []);

  const handleAnswerSubmission = useCallback(
    async ({ teamId, questionId }: { teamId: string; questionId: string }) => {
      if (questionId !== currentQuestionRef.current) return;

      const res = await fetch(
        `/api/host/answers?gameId=${gameId}&teamId=${teamId}&questionId=${questionId}`,
        { cache: 'no-store' }
      );

      if (!res.ok) return;

      const { answer: db } = (await res.json()) as {
        answer: TeamAnswerWithFavorite;
      };

      if (!db) return;

      const nextAnswer: TeamAnswerWithFavorite = { ...db };

      if (
        nextAnswer.awardedPoints === 0 &&
        pointSystemRef.current === 'FLAT' &&
        pointValueRef.current != null
      ) {
        nextAnswer.awardedPoints = pointValueRef.current;
      }

      if (questionTypeRef.current === 'LIST') {
        let arr: string[] = [];

        try {
          arr = JSON.parse(nextAnswer.given) as string[];
        } catch {
          arr = [];
        }

        nextAnswer.items = arr.map((submitted) => ({
          submitted,
          isCorrect: null,
        }));
      }

      setTeamStatus((prev) =>
        prev.map((team) =>
          team.id === teamId ? { ...team, submitted: true } : team
        )
      );

      setTeamAnswers((prev) => {
        const existingIndex = prev.findIndex((answer) => answer.id === nextAnswer.id);

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = nextAnswer;
          return next;
        }

        return [...prev, nextAnswer];
      });
    },
    [gameId, setTeamStatus]
  );

  const handleQuestionAdvanceReset = useCallback(() => {
    setTeamAnswers([]);
    setTeamStatus((prev) =>
      prev.map((team) => ({ ...team, submitted: false }))
    );
  }, [setTeamStatus]);

  const handleScore = useCallback(
    async (teamId: string, questionId: string, isCorrect: boolean) => {
      const res = await fetch('/api/host/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, teamId, questionId, isCorrect }),
      });

      if (!res.ok) return;

      const { ok, newScore } = (await res.json()) as {
        ok: boolean;
        newScore: number;
      };

      if (!ok) return;

      setTeamAnswers((prev) =>
        prev.map((answer) =>
          answer.teamId === teamId && answer.questionId === questionId
            ? { ...answer, isCorrect }
            : answer
        )
      );

      reliableEmit(
        'host:scoreUpdate',
        { gameId, teamId, newScore },
        () => {},
        (err) => {
          console.error('ScoreUpdate delivery failed', err);
        }
      );
    },
    [gameId, reliableEmit]
  );

  const handleListScore = useCallback(
    async (
      teamId: string,
      questionId: string,
      itemIndex: number,
      isCorrect: boolean
    ) => {
      const res = await fetch('/api/host/score-list-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          teamId,
          questionId,
          itemIndex,
          isCorrect,
        }),
      });

      if (!res.ok) return;

      const { ok, newScore } = (await res.json()) as {
        ok: boolean;
        newScore: number;
      };

      if (!ok) return;

      setTeamAnswers((prev) =>
        prev.map((answer) => {
          if (answer.teamId !== teamId || answer.questionId !== questionId) {
            return answer;
          }

          const items = [...(answer.items ?? [])];

          if (!items[itemIndex]) {
            return answer;
          }

          items[itemIndex] = { ...items[itemIndex], isCorrect };

          return { ...answer, items };
        })
      );

      reliableEmit(
        'host:scoreUpdate',
        { gameId, teamId, newScore },
        () => {},
        (err) => {
          console.error('ScoreUpdate delivery failed', err);
        }
      );
    },
    [gameId, reliableEmit]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('host:answerSubmission', handleAnswerSubmission);

    return () => {
      socket.off('host:answerSubmission', handleAnswerSubmission);
    };
  }, [socket, handleAnswerSubmission]);

  return {
    teamAnswers,
    setTeamAnswers,
    favoriteMap,
    fetchAnswers,
    bootstrapAnswersForCurrentQuestion,
    handleFavorite,
    handleScore,
    handleListScore,
    handleQuestionAdvanceReset,
  };
}