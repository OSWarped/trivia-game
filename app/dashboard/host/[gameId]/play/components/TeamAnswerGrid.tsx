'use client'

import React from 'react'

export interface ListItem {
  submitted: string
  isCorrect: boolean | null
}

// in components/TeamAnswerGrid.tsx (or wherever you keep TeamAnswer)
export interface TeamAnswer {
  /** The database PK of this Answer record */
  id: string

  /** ID of the team that submitted */
  teamId: string

  /** Display name of that team */
  teamName: string

  /** The question this answer belongs to */
  questionId: string

  /** Raw text the team submitted */
  given: string

  /** Whether the host marked it correct (null = unscored) */
  isCorrect: boolean | null

  /** Points awarded (can be negative for missed wagers) */
  awardedPoints: number

  /** How many points the team risked/used */
  pointsUsed: number

  /** Host’s manual “clever answer” flag */
  favorite: boolean

  /** For LIST questions, the breakdown into items */
  items?: ListItem[]
}

export interface Round {
  pointSystem: 'POOL' | 'FLAT'
  pointValue?: number
}

export interface TeamAnswerWithFavorite extends TeamAnswer {
  favorite: boolean
}

export interface TeamAnswerGridProps {
  teamAnswers: TeamAnswerWithFavorite[]
  currentRound: Round | null
  handleScore: (teamId: string, questionId: string, isCorrect: boolean) => void
  handleListScore: (
    teamId: string,
    questionId: string,
    itemIndex: number,
    isCorrect: boolean
  ) => void
  handleFavorite: (teamId: string, questionId: string, favorite: boolean) => void
}

export default function TeamAnswerGrid({
  teamAnswers,
  currentRound,
  handleScore,
  handleListScore,
  handleFavorite,
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
            className={`relative flex flex-col gap-4 rounded-lg border p-4 shadow ${answerStyle(ans)}`}
          >
            {/* Favorite toggle */}
            <button
              type="button"
              onClick={() => handleFavorite(ans.teamId, ans.questionId, !ans.favorite)}
              className="absolute top-2 right-2 p-1 focus:outline-none"
              title={ans.favorite ? 'Unmark Favorite' : 'Mark Favorite'}
            >
              {ans.favorite ? (
                <span className="text-yellow-500 text-xl">★</span>
              ) : (
                <span className="text-gray-300 text-xl">☆</span>
              )}
            </button>

            <div className="text-lg font-semibold flex items-center">
              {ans.teamName}
            </div>

            {isList ? (
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
              <div className="text-gray-700">
                <p className="font-medium">Answered:</p>
                {(() => {
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

            {ans.pointsUsed == null ? (
              <div className="text-sm text-gray-500">Points: {displayPoints}</div>
            ) : (
              <div className="text-sm text-gray-500">
                Points Used: {ans.pointsUsed}
              </div>
            )}

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

function answerStyle(ans: TeamAnswerWithFavorite) {
  if (ans.isCorrect === true) return 'border-green-400 bg-green-50'
  if (ans.isCorrect === false) return 'border-red-400 bg-red-50'
  return 'border-gray-200'
}
