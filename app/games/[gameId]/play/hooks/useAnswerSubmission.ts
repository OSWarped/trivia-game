'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from './usePlayBootstrap';

interface SubmitAnswerPayload {
  gameId: string;
  questionId: string;
  answer: string | string[];
  pointsUsed: number[];
  teamId: string;
}

type ReliableEmitFn = (
  event: 'team:submitAnswer',
  payload: SubmitAnswerPayload,
  onSuccess?: () => void,
  onError?: (error: unknown) => void
) => void;

interface UseAnswerSubmissionParams {
  gameId: string;
  teamId: string | null;
  state: GameState | null;
  reliableEmit: ReliableEmitFn;
}

type QuestionType = NonNullable<GameState['currentQuestion']>['type'];

function coerceStoredAnswer(
  rawAnswer: string | undefined,
  questionType: QuestionType | undefined
): string | string[] {
  if (!rawAnswer) return '';
  if (
    questionType === 'MULTIPLE_CHOICE' ||
    questionType === 'LIST' ||
    questionType === 'ORDERED'
  ) {
    try {
      const parsed = JSON.parse(rawAnswer) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === 'string')
      ) {
        return parsed;
      }
    } catch {
      return rawAnswer;
    }
  }

  return rawAnswer;
}

export function useAnswerSubmission({
  gameId,
  teamId,
  state,
  reliableEmit,
}: UseAnswerSubmissionParams) {
  const [answer, setAnswer] = useState<string | string[]>('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);

  useEffect(() => {
    const questionId = state?.currentQuestion?.id;
    const questionType = state?.currentQuestion?.type;
    const submittedAnswer = state?.team.submittedAnswer;

    if (!questionId) {
      setAnswer('');
      setSubmitted(false);
      setSelectedPoints(null);
      return;
    }

    if (submittedAnswer) {
      setSubmitted(true);
      setAnswer(
        coerceStoredAnswer(submittedAnswer.answer ?? '', questionType)
      );
      setSelectedPoints(submittedAnswer.pointsUsed?.[0] ?? null);
      return;
    }

    setSubmitted(false);
    setAnswer('');
    setSelectedPoints(null);
  }, [
    state?.currentQuestion?.id,
    state?.currentQuestion?.type,
    state?.team.submittedAnswer?.answer,
    state?.team.submittedAnswer?.pointsUsed,
  ]);

  const isWagerRound = state?.round?.roundType === 'WAGER';
  const pointSystem = state?.round?.pointSystem ?? null;
  const maxWager = state?.team.score ?? 0;

  const hasAnswer = useMemo(() => {
    if (typeof answer === 'string') {
      return answer.trim().length > 0;
    }

    if (Array.isArray(answer)) {
      return answer.some((item) => item.trim().length > 0);
    }

    return false;
  }, [answer]);

  const needsPoints = pointSystem === 'POOL' && selectedPoints === null;

  const submitDisabled =
    submitted ||
    !hasAnswer ||
    needsPoints ||
    (isWagerRound && (selectedPoints === null || selectedPoints < 0));

  const submitAnswer = useCallback(async () => {
    if (!state?.currentQuestion || !teamId || submitDisabled) return;

    const payload: SubmitAnswerPayload = {
      gameId,
      questionId: state.currentQuestion.id,
      answer,
      pointsUsed: selectedPoints !== null ? [selectedPoints] : [],
      teamId,
    };

    try {
      const res = await fetch('/api/play/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('API save failed');
      }

      reliableEmit(
        'team:submitAnswer',
        payload,
        () => setSubmitted(true),
        (err) => console.error('Answer delivery failed', err)
      );
    } catch (err) {
      console.error('Submit answer error:', err);
    }
  }, [
    state,
    teamId,
    submitDisabled,
    gameId,
    answer,
    selectedPoints,
    reliableEmit,
  ]);

  return {
    answer,
    setAnswer,
    submitted,
    selectedPoints,
    setSelectedPoints,
    submitAnswer,
    isWagerRound,
    maxWager,
    submitDisabled,
  };
}