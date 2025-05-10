'use client'

import React from 'react'

export interface ListItem {
  submitted: string
  isCorrect: boolean | null
}

export interface TeamAnswer {
  teamId: string
  teamName: string
  questionId: string
  given: string
  isCorrect: boolean | null
  awardedPoints: number
  pointsUsed: number | null
  items?: ListItem[]
}

export interface Round {
  pointSystem: 'POOL' | 'FLAT'
  pointValue?: number
}

interface TeamAnswerGridProps {
  teamAnswers: TeamAnswer[]
  currentRound: Round | null
  handleScore: (teamId: string, questionId: string, isCorrect: boolean) => void
  handleListScore: (
    teamId: string,
    questionId: string,
    itemIndex: number,
    isCorrect: boolean
  ) => void
}

export default function TeamAnswerGrid({
  teamAnswers,
  currentRound,
  handleScore,
  handleListScore,
}: TeamAnswerGridProps) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 pb-20">
      {teamAnswers.map((ans, idx) => {
        const displayPoints =
          ans.awardedPoints ||
          (currentRound?.pointSystem === 'FLAT'
            ? currentRound.pointValue ?? 0
            : 0)

        const isList = Array.isArray(ans.items)

        return (
          <div
            key={idx}
            className={`flex flex-col gap-4 rounded-lg border p-4 shadow ${answerStyle(ans)}`}
          >
            <div className="text-lg font-semibold">{ans.teamName}</div>

            {isList ? (
              // LIST question: existing per-item UI
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Submitted Items:</p>
                {ans.items?.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between space-x-2"
                  >
                    <span className="flex-1 text-gray-800">{it.submitted}</span>
                    <button
                      onClick={() =>
                        handleListScore(ans.teamId, ans.questionId, i, true)
                      }
                      className={`text-xs px-2 py-0.5 rounded ${
                        it.isCorrect === true
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 text-green-800'
                      }`}
                      title="Mark this item correct"
                    >
                      Correct
                    </button>
                    <button
                      onClick={() =>
                        handleListScore(ans.teamId, ans.questionId, i, false)
                      }
                      className={`text-xs px-2 py-0.5 rounded ${
                        it.isCorrect === false
                          ? 'bg-red-500 text-white'
                          : 'bg-red-100 text-red-800'
                      }`}
                      title="Mark this item incorrect"
                    >
                      Incorrect
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              // SINGLE or ORDERED question: render answer or ordered list
              <div className="text-gray-700">
                <p className="font-medium">Answered:</p>
                {(() => {
                  // Try parsing a JSON array for ORDERED
                  try {
                    const arr = JSON.parse(ans.given)
                    if (Array.isArray(arr)) {
                      return (
                        <ol className="list-decimal list-inside space-y-1 ml-4 mt-2">
                          {arr.map((item: string, i: number) => (
                            <li key={i} className="text-gray-800">
                              {item}
                            </li>
                          ))}
                        </ol>
                      )
                    }
                  } catch {
                    // Not an array, fall back to plain text
                  }
                  return <span className="font-medium">{ans.given}</span>
                })()}

                {ans.isCorrect !== null && (
                  <span
                    className={`ml-2 self-start rounded px-2 py-0.5 text-xs font-semibold ${
                      ans.isCorrect
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {ans.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>
            )}

            {/* ── Points info ── */}
            {ans.pointsUsed == null ? (
              <div className="text-sm text-gray-500">Points: {displayPoints}</div>
            ) : (
              <div className="text-sm text-gray-500">
                Points Used: {ans.pointsUsed}
              </div>
            )}

            {/* ── for non‐LIST, show global score buttons ── */}
            {!isList && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                  onClick={() => handleScore(ans.teamId, ans.questionId, true)}
                >
                  Mark Correct
                </button>
                <button
                  type="button"
                  className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                  onClick={() => handleScore(ans.teamId, ans.questionId, false)}
                >
                  Mark Incorrect
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Helper for card styling
function answerStyle(ans: TeamAnswer) {
  if (ans.isCorrect === true) return 'border-green-400 bg-green-50'
  if (ans.isCorrect === false) return 'border-red-400 bg-red-50'
  return 'border-gray-200'
}
