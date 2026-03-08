'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';
import { useReliableEmit } from '@/lib/reliable-handshake';

import TeamScoreCard from './components/TeamScoreCard';
import ConnectionBanner from './components/ConnectionBanner';
import QuestionHeader from './components/QuestionHeader';
import QuestionInputRenderer from './components/question-types/QuestionInputRenderer';
import RoundScoringControls from './components/round-controls/RoundScoringControls';
import SubmitAnswerButton from './components/SubmitAnswerButton';

import { usePlaySocketSync } from './hooks/usePlaySocketSync';
import { usePlayBootstrap } from './hooks/usePlayBootstrap';
import { useAnswerSubmission } from './hooks/useAnswerSubmission';

export default function PlayGamePage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const socket = useSocket();
  const reliableEmit = useReliableEmit(socket!, {
    timeoutMs: 3000,
    maxRetries: 3,
  });
  const prevScoreRef = useRef<number | null>(null);
  const [highlightScore, setHighlightScore] = useState(false);
  const {
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
  } = usePlayBootstrap({
    gameId,
    router,
  });
  const {
    answer,
    setAnswer,
    submitted,
    selectedPoints,
    setSelectedPoints,
    submitAnswer,
    isWagerRound,
    maxWager,
    submitDisabled,
  } = useAnswerSubmission({
    gameId,
    teamId,
    state,
    reliableEmit,
  });




  useEffect(() => {
    if (state?.team.score == null) return;

    const prev = prevScoreRef.current;
    const next = state.team.score;

    if (prev !== null && prev !== next) {
      setHighlightScore(true);
      const timeout = window.setTimeout(() => setHighlightScore(false), 1500);
      prevScoreRef.current = next;
      return () => window.clearTimeout(timeout);
    }

    prevScoreRef.current = next;
  }, [state?.team.score]);



  type OrderedOption = {
    id: string;
    text: string;
  };

  function isOrderedOption(value: unknown): value is OrderedOption {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string'
    );
  }

  const orderedOptions = useMemo<OrderedOption[]>(() => {
    if (
      !state?.currentQuestion ||
      state.currentQuestion.type !== 'ORDERED'
    ) {
      return [];
    }

    const rawOptions = state.currentQuestion.options ?? [];

    return rawOptions.flatMap((opt) => {
      if (typeof opt === 'string') {
        return [{ id: opt, text: opt }];
      }

      if (isOrderedOption(opt)) {
        return [opt];
      }

      return [];
    });
  }, [state?.currentQuestion]);

  const handleScoreUpdate = useCallback(
    ({ teamId: updatedTeamId, newScore }: { teamId: string; newScore: number }) => {
      if (updatedTeamId === teamId) {
        setState((prev) =>
          prev ? { ...prev, team: { ...prev.team, score: newScore } } : prev
        );
      }
    },
    [teamId]
  );

  const handleQuestionAdvance = useCallback(async () => {
    if (!teamId) return;

    try {
      await fetchGameState(teamId);
    } catch (err) {
      console.error('Refetch after question advance failed:', err);
    }
  }, [fetchGameState, teamId]);

  const handleGameCompleted = useCallback(() => {
    router.replace(`/games/${gameId}/play/results`);
  }, [router, gameId]);

  useTeamSocket({
    enabled: Boolean(gameId && teamId && teamName && sessionToken && deviceId),
    session:
      gameId && teamId && teamName
        ? {
          gameId,
          teamId,
          teamName,
          sessionToken,
          deviceId,
        }
        : null,
  });

  const { connectionStatus } = usePlaySocketSync({
    socket,
    gameId: gameId ?? null,
    teamId,
    teamName,
    onScoreUpdate: handleScoreUpdate,
    onQuestionAdvance: handleQuestionAdvance,
    onGameCompleted: handleGameCompleted,
  });

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          {isRestoringSession
            ? 'Restoring your team session...'
            : 'Loading question...'}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!state) {
    return <div className="p-6">Loading question…</div>;
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-12">
      <aside className="space-y-6 md:col-span-3">
        <TeamScoreCard
          teamName={state.team.name}
          score={state.team.score}
          gameTitle={gameInfo?.title ?? null}
          highlightScore={highlightScore}
        />
      </aside>

      <ConnectionBanner connectionStatus={connectionStatus} />

      <section className="space-y-6 md:col-span-9">
        <div className="rounded-lg bg-white p-6 shadow">
          <QuestionHeader
            roundName={state.round?.name ?? null}
            questionText={state.currentQuestion?.text ?? null}
          />

          <QuestionInputRenderer
            questionId={state.currentQuestion?.id}
            questionType={state.currentQuestion?.type ?? null}
            options={state.currentQuestion?.options}
            orderedOptions={orderedOptions}
            answer={answer}
            submitted={submitted}
            onAnswerChange={setAnswer}
          />

          <RoundScoringControls
            pointSystem={state.round?.pointSystem ?? null}
            isWagerRound={isWagerRound}
            remainingPoints={state.team.remainingPoints ?? []}
            selectedPoints={selectedPoints}
            maxWager={maxWager}
            submitted={submitted}
            onSelectedPointsChange={setSelectedPoints}
          />

          <SubmitAnswerButton
            onClick={submitAnswer}
            submitted={submitted}
            disabled={submitDisabled}
          />
        </div>
      </section>
    </div>
  );
}