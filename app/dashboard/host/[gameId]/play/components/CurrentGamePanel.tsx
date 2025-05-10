'use client'

import React from 'react'
import RevealAnswer from './RevealAnswer'
import QuestionControls from './QuestionControls'

export interface QuestionOption { id: string; text: string; isCorrect: boolean }
export interface Question {
  id: string
  text: string
  options?: QuestionOption[]
}
export interface Round {
  id: string
  name: string
  questions: Question[]
}

interface CurrentGamePanelProps {
  gameId: string
  currentRound: Round | null
  currentQuestionId: string | null
  isLastInRound: boolean
  isFinalQuestion: boolean
  disablePrev?: boolean
  disableNext?: boolean
  onPrev: () => void
  onNext: () => void
  onComplete: () => void
}

export default function CurrentGamePanel({  
  currentRound,
  currentQuestionId,
  isLastInRound,
  isFinalQuestion,
  disablePrev = false,
  disableNext = false,
  onPrev,
  onNext,
  onComplete,
}: CurrentGamePanelProps) {
  const question = currentRound?.questions.find(q => q.id === currentQuestionId) || null

  return (
    <section className="space-y-6 rounded-lg bg-white p-3 shadow-md">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-blue-800">
        📊 Current Game Progress
      </h2>

      <QuestionControls
        onPrev={onPrev}
        onNext={onNext}
        disablePrev={disablePrev}
        disableNext={disableNext}
        isLastInRound={isLastInRound}
        isFinalQuestion={isFinalQuestion}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2 shadow-sm">
          <p className="mt-0 mb-0 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Current Round
          </p>
          <p className="mt-1 text-lg font-bold text-blue-900">
            {currentRound?.name}
          </p>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50 p-2 shadow-sm">
          <p className="mt-0 mb-0 text-sm font-semibold uppercase tracking-wide text-green-700">
            Current Question
          </p>
          <p className="mt-1 text-lg font-medium text-green-900">
            {question?.text ?? 'No active question'}
          </p>
        </div>
      </div>

      <RevealAnswer question={question} />

      {isFinalQuestion && (
        <div>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 rounded bg-red-600 px-6 py-3 font-semibold text-white shadow hover:bg-red-700"
          >
            ✅ Complete Game
          </button>
        </div>
      )}
    </section>
  )
}
