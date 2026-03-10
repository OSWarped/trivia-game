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

  useEffect(() => {
    if (!socket) return;

    const handleShowQuestion = () => {
      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      router.replace(`/games/${gameId}/play`);
    };

    const handleShowLobby = () => {
      sessionStorage.removeItem(`trivia:${gameId}:leaderboard`);
      router.replace(`/games/${gameId}/lobby`);
    };

    const handleShowAnswerReveal = (payload: {
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
    };

    const handleShowLeaderboard = (payload: {
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
    };

    socket.on('game:showQuestion', handleShowQuestion);
    socket.on('game:showLobby', handleShowLobby);
    socket.on('game:showAnswerReveal', handleShowAnswerReveal);
    socket.on('game:showLeaderboard', handleShowLeaderboard);

    return () => {
      socket.off('game:showQuestion', handleShowQuestion);
      socket.off('game:showLobby', handleShowLobby);
      socket.off('game:showAnswerReveal', handleShowAnswerReveal);
      socket.off('game:showLeaderboard', handleShowLeaderboard);
    };
  }, [socket, router, gameId]);

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
    if (!state?.currentQuestion || state.currentQuestion.type !== 'ORDERED') {
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
    <AppBackground variant="hero" className="min-h-screen px-6 py-8 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Team Play
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {gameInfo?.title ?? 'Trivia Game'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Playing as <span className="font-semibold text-white">{state.team.name}</span>
          </p>
        </header>

        <ConnectionBanner connectionStatus={connectionStatus} />

        <div className="grid gap-6 md:grid-cols-12">
          <aside className="space-y-6 md:col-span-4 xl:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
              <TeamScoreCard
                teamName={state.team.name}
                score={state.team.score}
                gameTitle={gameInfo?.title ?? null}
                highlightScore={highlightScore}
              />
            </div>
          </aside>

          <section className="space-y-6 md:col-span-8 xl:col-span-9">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
              <QuestionHeader
                roundName={state.round?.name ?? null}
                questionText={state.currentQuestion?.text ?? null}
              />

              <div className="mt-6">
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

              <div className="mt-6">
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

              <div className="mt-6">
                <SubmitAnswerButton
                  onClick={submitAnswer}
                  submitted={submitted}
                  disabled={submitDisabled}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppBackground>
  );
}