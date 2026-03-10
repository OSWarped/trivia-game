'use client';

import React from 'react';
import type { TeamDisplayMode } from '../types/host-play.types';

interface MainActionBarProps {
  displayMode: TeamDisplayMode;
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  onShowQuestion: () => void | Promise<void>;
  onShowReveal: () => void | Promise<void>;
  onShowLeaderboard: () => void | Promise<void>;
  onShowLobby: () => void | Promise<void>;
  disablePrev?: boolean;
  disableNext?: boolean;
  isLastInRound: boolean;
  isFinalQuestion: boolean;
}

function getModeLabel(mode: TeamDisplayMode) {
  switch (mode) {
    case 'QUESTION':
      return 'Question';
    case 'ANSWER_REVEAL':
      return 'Answer Reveal';
    case 'LEADERBOARD':
      return 'Leaderboard';
    case 'LOBBY':
      return 'Lobby';
    default:
      return mode;
  }
}

export default function MainActionBar({
  displayMode,
  onPrev,
  onNext,
  onShowQuestion,
  onShowReveal,
  onShowLeaderboard,
  onShowLobby,
  disablePrev = false,
  disableNext = false,
  isLastInRound,
  isFinalQuestion,
}: MainActionBarProps) {
  const statusMessage = isFinalQuestion
    ? 'Final question in this game'
    : isLastInRound
      ? 'Last question in this round'
      : null;

  const statusClasses = isFinalQuestion
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  const modeButtonBase =
    'rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300';

  const modeButtonActive =
    'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';

  const modeButtonInactive =
    'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Teams currently seeing
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
            {getModeLabel(displayMode)}
          </span>
        </div>

        {statusMessage ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${statusClasses}`}
          >
            {statusMessage}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Question Navigation
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={disablePrev}
                onClick={onPrev}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                  disablePrev
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Previous Question
              </button>

              <button
                type="button"
                disabled={disableNext}
                onClick={onNext}
                className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  disableNext
                    ? 'cursor-not-allowed border-blue-100 bg-blue-100 text-blue-300'
                    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next Question
              </button>
            </div>
          </div>

          <div className="min-w-0 flex-1 xl:max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Team Display
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Use these when you want to intentionally change what team
                    devices are showing.
                  </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Active: {getModeLabel(displayMode)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onShowQuestion}
                  className={`${modeButtonBase} ${
                    displayMode === 'QUESTION'
                      ? modeButtonActive
                      : modeButtonInactive
                  }`}
                >
                  Show Question
                </button>

                <button
                  type="button"
                  onClick={onShowReveal}
                  className={`${modeButtonBase} ${
                    displayMode === 'ANSWER_REVEAL'
                      ? modeButtonActive
                      : modeButtonInactive
                  }`}
                >
                  Reveal Answer
                </button>

                <button
                  type="button"
                  onClick={onShowLeaderboard}
                  className={`${modeButtonBase} ${
                    displayMode === 'LEADERBOARD'
                      ? modeButtonActive
                      : modeButtonInactive
                  }`}
                >
                  Show Leaderboard
                </button>

                <button
                  type="button"
                  onClick={onShowLobby}
                  className={`${modeButtonBase} ${
                    displayMode === 'LOBBY'
                      ? modeButtonActive
                      : modeButtonInactive
                  }`}
                >
                  Send to Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}