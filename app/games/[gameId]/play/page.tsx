'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppBackground from '@/components/AppBackground';
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

export default function PlayGamePage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const socket = useSocket();
  const reliableEmit = useReliableEmit(socket!, {
    timeoutMs: 3000,
    maxRetries: 3,
  });

  const prevScoreRef = useRef<number | null>(null);
  const scoreHighlightStartRef = useRef<number | null>(null);
  const scoreHighlightEndRef = useRef<number | null>(null);

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
      if (scoreHighlightStartRef.current !== null) {
        window.clearTimeout(scoreHighlightStartRef.current);
        scoreHighlightStartRef.current = null;
      }

      if (scoreHighlightEndRef.current !== null) {
        window.clearTimeout(scoreHighlightEndRef.current);
        scoreHighlightEndRef.current = null;
      }

      scoreHighlightStartRef.current = window.setTimeout(() => {
        setHighlightScore(true);

        scoreHighlightEndRef.current = window.setTimeout(() => {
          setHighlightScore(false);
          scoreHighlightEndRef.current = null;
        }, 1500);

        scoreHighlightStartRef.current = null;
      }, 0);
    }

    prevScoreRef.current = next;

    return () => {
      if (scoreHighlightStartRef.current !== null) {
        window.clearTimeout(scoreHighlightStartRef.current);
        scoreHighlightStartRef.current = null;
      }

      if (scoreHighlightEndRef.current !== null) {
        window.clearTimeout(scoreHighlightEndRef.current);
        scoreHighlightEndRef.current = null;
      }
    };
  }, [state?.team.score]);

  const orderedOptions: OrderedOption[] =
    state?.currentQuestion?.type === 'ORDERED'
      ? (state.currentQuestion.options ?? []).flatMap((opt) => {
        if (typeof opt === 'string') {
          return [{ id: opt, text: opt }];
        }

        if (isOrderedOption(opt)) {
          return [opt];
        }

        return [];
      })
      : [];

  const handleScoreUpdate = useCallback(
    ({
      teamId: updatedTeamId,
      newScore,
    }: {
      teamId: string;
      newScore: number;
    }) => {
      if (updatedTeamId === teamId) {
        setState((prev) =>
          prev ? { ...prev, team: { ...prev.team, score: newScore } } : prev
        );
      }
    },
    [teamId, setState]
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

  const handleShowLobby = useCallback(async () => {
    sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
    sessionStorage.removeItem(`trivia:${gameId}:answerReveal`);
    router.replace(`/games/${gameId}/lobby`);
  }, [router, gameId]);

  const handleShowQuestion = useCallback(async () => {
    sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
    sessionStorage.removeItem(`trivia:${gameId}:answerReveal`);
    router.replace(`/games/${gameId}/play`);
  }, [router, gameId]);

  const handleShowAnswerReveal = useCallback(
    async (payload: {
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
    }) => {
      if (!payload?.reveal) {
        console.error('Missing answer reveal payload');
        return;
      }

      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      sessionStorage.setItem(
        `trivia:${gameId}:answerReveal`,
        JSON.stringify(payload.reveal)
      );

      router.replace(`/games/${gameId}/answer-reveal`);
    },
    [router, gameId]
  );

  const handleShowLeaderboard = useCallback(
    async (payload: {
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
    }) => {
      if (!payload?.leaderboard) {
        console.error('Missing leaderboard payload');
        return;
      }

      sessionStorage.removeItem(`trivia:${gameId}:answerReveal`);
      sessionStorage.setItem(
        `trivia:${gameId}:leaderboard`,
        JSON.stringify(payload.leaderboard)
      );

      router.replace(`/games/${gameId}/leaderboard`);
    },
    [router, gameId]
  );

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
    onScoreUpdate: handleScoreUpdate,
    onQuestionAdvance: handleQuestionAdvance,
    onGameCompleted: handleGameCompleted,
    onShowLobby: handleShowLobby,
    onShowQuestion: handleShowQuestion,
    onShowAnswerReveal: handleShowAnswerReveal,
    onShowLeaderboard: handleShowLeaderboard,
  });

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
              : 'Loading question...'}
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

  if (!state) {
    return (
      <AppBackground
        variant="hero"
        className="flex min-h-screen items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-slate-200">Loading question…</p>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="hero" className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-xs">
                Team Play
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {gameInfo?.title ?? 'Trivia Game'}
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Playing as{' '}
                <span className="font-semibold text-white">{state.team.name}</span>
              </p>
            </div>

            <div className="md:shrink-0">
              <TeamScoreCard
                teamName={state.team.name}
                score={state.team.score}
                highlightScore={highlightScore}
              />
            </div>
          </div>
        </header>

        <ConnectionBanner connectionStatus={connectionStatus} />

        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
            <QuestionHeader
              roundName={state.round?.name ?? null}
              questionText={state.currentQuestion?.text ?? null}
            />

            <div className="mt-5 sm:mt-6">
              <QuestionInputRenderer
                questionId={state.currentQuestion?.id}
                questionType={state.currentQuestion?.type ?? null}
                options={state.currentQuestion?.options}
                orderedOptions={orderedOptions}
                answer={answer}
                submitted={submitted}
                onAnswerChange={setAnswer}
              />
            </div>

            <div className="mt-5 sm:mt-6">
              <RoundScoringControls
                pointSystem={state.round?.pointSystem ?? null}
                isWagerRound={isWagerRound}
                remainingPoints={state.team.remainingPoints ?? []}
                selectedPoints={selectedPoints}
                maxWager={maxWager}
                submitted={submitted}
                onSelectedPointsChange={setSelectedPoints}
              />
            </div>

            <div className="mt-5 sm:mt-6">
              <SubmitAnswerButton
                onClick={submitAnswer}
                submitted={submitted}
                disabled={submitDisabled}
              />
            </div>
          </div>
        </section>
      </div>
    </AppBackground>
  );
}