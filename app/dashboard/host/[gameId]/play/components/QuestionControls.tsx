'use client'

import React from 'react'

interface QuestionControlsProps {
  onPrev: () => void | Promise<void>
  onNext: () => void | Promise<void>
  disablePrev?: boolean
  disableNext?: boolean
  isLastInRound: boolean
  isFinalQuestion: boolean
}

export default function QuestionControls({
  onPrev,
  onNext,
  disablePrev = false,
  disableNext = false,
  isLastInRound,
  isFinalQuestion,
}: QuestionControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          type="button"
          disabled={disablePrev}
          onClick={onPrev}
          className={`rounded px-4 py-2 font-semibold hover:bg-gray-400 focus:outline-none focus:ring ${
            disablePrev
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-300 text-gray-800'
          }`}
        >
          ⬅ Prev
        </button>

        <button
          type="button"
          disabled={disableNext}
          onClick={onNext}
          className={`rounded px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring ${
            disableNext
              ? 'bg-blue-200 text-blue-100 cursor-not-allowed'
              : 'bg-blue-600'
          }`}
        >
          Next ➡
        </button>
      </div>

      {isLastInRound && !isFinalQuestion && (
        <div className="rounded bg-indigo-100 p-3 text-indigo-800 shadow-sm">
          ⚠️ You’re on the last question of this round.
        </div>
      )}

      {isFinalQuestion && (
        <div className="rounded bg-red-100 p-3 text-red-800 shadow-sm">
          🚨 This is the <strong>final question</strong> of the game!
        </div>
      )}
    </div>
  )
}
