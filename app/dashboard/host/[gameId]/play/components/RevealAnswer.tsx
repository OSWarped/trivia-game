'use client'

import React, { useState } from 'react'

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface Question {
  id: string
  text: string
  options?: QuestionOption[]
}

interface RevealAnswerProps {
  question: Question | null
}

export default function RevealAnswer({ question }: RevealAnswerProps) {
  const [open, setOpen] = useState(false)
  if (!question) return null

  const opts = question.options ?? []

  return open ? (
    <div className="mt-4 rounded border border-yellow-300 bg-yellow-100 p-4">
      <h3 className="mb-2 font-semibold text-gray-700">Correct Answer:</h3>
      <ul className="list-inside list-disc text-gray-800">
        {opts.filter(o => o.isCorrect).map(o => (
          <li key={o.id}>{o.text}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 text-sm text-blue-700 hover:underline"
      >
        Hide Answer
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-4 rounded bg-yellow-400 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-500"
    >
      Reveal Correct Answer
    </button>
  )
}
