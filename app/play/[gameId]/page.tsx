'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type QuestionType = 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
}

interface GameState {
    game: {
      id: string;
      status: string;
    };
    round: {
      id: string;
      name: string;
      roundType: 'STANDARD' | 'WAGER' | 'LIGHTNING'; // adjust based on your enum
      pointSystem: 'FIXED' | 'POOL'; // adjust based on your enum
      pointPool: number[] | null;
      pointValue: number | null;
      wagerLimit: number | null;
    } | null;
    currentQuestion: {
      id: string;
      text: string;
      type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';
      options?: string[];
    } | null;
    team: {
      id: string;
      name?: string; // if you're including this later
      remainingPoints: number[];
      submittedAnswer?: {
        answer: string;
        pointsUsed: number[];
      } | null;
      score: number;
    };
  }
  
export default function PlayGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();

  const [state, setState] = useState<GameState | null>(null);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [submitted, setSubmitted] = useState(false);
  const teamId = localStorage.getItem('teamId');
  
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/games/${gameId}/state?teamId=${teamId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      } else {
        console.error('Failed to fetch game state', await res.json());
      }
    })();
  }, [gameId]);

  async function submitAnswer() {
    const res = await fetch('/api/play/answers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        questionId: state?.currentQuestion?.id,
        answer,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      console.error('Failed to submit answer', await res.json());
    }
  }

  if (!state) return <div className="p-6">Loading question...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
      {/* Sidebar */}
      <div className="md:col-span-3 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold mb-2">{state.team.name}</h3>
        <p><strong>Score:</strong> {state.team.score}</p>
        <p><strong>Remaining:</strong> {state.team.remainingPoints?.join(', ') || '—'}</p>
      </div>
  
      {/* Main content */}
      <div className="md:col-span-9 space-y-6">
        <h2 className="text-2xl font-bold">Round: {state?.round?.name}</h2>
        <h3 className="text-xl">{state.currentQuestion?.text}</h3>
  
        {state.currentQuestion?.type === 'SINGLE' && (
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
          />
        )}
  
        {state.currentQuestion?.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {state.currentQuestion.options?.map((opt) => (
              <label key={opt} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={opt}
                  checked={Array.isArray(answer) && answer.includes(opt)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const val = e.target.value;
                    setAnswer((prev) => {
                      if (!Array.isArray(prev)) return checked ? [val] : [];
                      return checked
                        ? [...prev, val]
                        : prev.filter((a) => a !== val);
                    });
                  }}
                  disabled={submitted}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )}
  
        <button
          onClick={submitAnswer}
          disabled={submitted}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {submitted ? 'Answer Submitted' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
  
}
