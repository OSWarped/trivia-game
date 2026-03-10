// File: app/dashboard/host/[gameId]/play/components/CurrentGamePanel.tsx
'use client';

import React from 'react';
import RevealAnswer from './RevealAnswer';
import MainActionBar from './MainActionBar';
import type { TeamDisplayMode } from '../types/host-play.types';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options?: QuestionOption[];
}

export interface Round {
  id: string;
  name: string;
  questions: Question[];
}

interface CurrentGamePanelProps {
  gameId: string;
  currentRound: Round | null;
  currentQuestionId: string | null;
  isLastInRound: boolean;
  isFinalQuestion: boolean;
  displayMode: TeamDisplayMode;
  disablePrev?: boolean;
  disableNext?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onShowQuestion: () => void;
  onShowReveal: () => void;
  onShowLeaderboard: () => void;
  onShowLobby: () => void;
  onComplete: () => void;
}

export default function CurrentGamePanel({
  currentRound,
  currentQuestionId,
  isLastInRound,
  isFinalQuestion,
  displayMode,
  disablePrev = false,
  disableNext = false,
  onPrev,
  onNext,
  onShowQuestion,
  onShowReveal,
  onShowLeaderboard,
  onShowLobby,
  onComplete,
}: CurrentGamePanelProps) {
  const question =
    currentRound?.questions.find((q) => q.id === currentQuestionId) || null;

  const questionIndex = currentRound?.questions.findIndex(
    (q) => q.id === currentQuestionId
  );

  const questionNumber =
    questionIndex !== undefined && questionIndex !== null && questionIndex >= 0
      ? questionIndex + 1
      : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {currentRound?.name ?? 'No active round'}
              {questionNumber ? ` · Question ${questionNumber}` : ''}
            </div>

            <div className="mt-2 text-xl font-semibold leading-7 text-slate-900">
              {question?.text ?? 'No active question'}
            </div>
          </div>

          {isFinalQuestion ? (
            <button
              type="button"
              onClick={onComplete}
              className="shrink-0 rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Complete Game
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4">
        <MainActionBar
          displayMode={displayMode}
          onPrev={onPrev}
          onNext={onNext}
          onShowQuestion={onShowQuestion}
          onShowReveal={onShowReveal}
          onShowLeaderboard={onShowLeaderboard}
          onShowLobby={onShowLobby}
          disablePrev={disablePrev}
          disableNext={disableNext}
          isLastInRound={isLastInRound}
          isFinalQuestion={isFinalQuestion}
        />
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <RevealAnswer question={question} />
      </div>
    </section>
  );
}