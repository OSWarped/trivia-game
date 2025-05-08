'use client';

import React, { JSX, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';

type QuestionType = 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER' | 'LIST';

interface GameState {
  game: { id: string; status: string };
  round: {
    id: string;
    name: string;
    roundType: 'STANDARD' | 'WAGER' | 'LIGHTNING';
    pointSystem: 'FIXED' | 'POOL';
    pointPool: number[] | null;
    pointValue: number | null;
    wagerLimit: number | null;
  } | null;
  currentQuestion: {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
  } | null;
  team: {
    id: string;
    name?: string;
    remainingPoints: number[];
    submittedAnswer?: { answer: string; pointsUsed: number[] } | null;
    score: number;
  };
}

export default function PlayGamePage(): JSX.Element {
  /* ── params & ids ─────────────────────────────────────────────── */
  const { gameId } = useParams<{ gameId: string }>();
  const teamId   = typeof window !== 'undefined' ? localStorage.getItem('teamId')   : null;
  const teamName = typeof window !== 'undefined' ? localStorage.getItem('teamName') : null;

  /* ── socket hookup (keeps connection alive & in the room) ─────── */
  useTeamSocket(true, gameId ?? null, teamId, teamName);
  const socket = useSocket();

  /* ── local state ──────────────────────────────────────────────── */
  const [state, setState] = useState<GameState | null>(null);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);

  /* ── fetch initial/playback state ─────────────────────────────── */
  useEffect(() => {
    if (!gameId || !teamId) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/games/${gameId}/state?teamId=${teamId}`,
          { credentials: 'include', cache: 'no-store' }
        );
        if (res.ok) setState((await res.json()) as GameState);
      } catch (err) {
       
        console.error('Failed to fetch game state:', err);
      }
    })();
  }, [gameId, teamId]);

  

  /* ── live socket updates (score & next/prev question) ───────────── */
useEffect(() => {
  if (!socket || !socket.connected || !gameId || !teamId) return;

  /* score updates pushed by server */
  const handleScoreUpdate = ({
    teamId: tId,
    newScore,
  }: {
    teamId: string;
    newScore: number;
  }) => {
    if (tId === teamId) {
      setState((prev) =>
        prev ? { ...prev, team: { ...prev.team, score: newScore } } : prev
      );
    }
  };

  

  /* host advanced to next / previous question */
  const handleQuestionAdvance = async () => {
    try {
      const res = await fetch(
        `/api/games/${gameId}/state?teamId=${teamId}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const newState = (await res.json()) as GameState;
        setState(newState);

        /* reset per‑question UI */
        setSubmitted(false);
        setAnswer('');
        setSelectedPoints(null);
      }
    } catch (err) {
      
      console.error('Refetch after question advance failed:', err);
    }
  };

  socket.on('score:update', handleScoreUpdate);
  socket.on('game:updateQuestion', handleQuestionAdvance);

  return () => {
    socket.off('score:update', handleScoreUpdate);
    socket.off('game:updateQuestion', handleQuestionAdvance);
  };
}, [socket, gameId, teamId]);

/* ── helper: submit answer ─────────────────────────────────────── */
const submitAnswer = useCallback(async (): Promise<void> => {
  if (!state?.currentQuestion || !teamId || !gameId) return;

  const body = {
    gameId,
    questionId: state.currentQuestion.id,
    answer,
    pointsUsed: selectedPoints ? [selectedPoints] : [],
    teamId,
  };

  try {
    const res = await fetch('/api/play/answers', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSubmitted(true);
      socket?.emit('team:submitAnswer', body);
    } else {
      
      console.error('Failed to submit answer:', await res.json());
    }
  } catch (err) {
    
    console.error('Submit answer error:', err);
  }
}, [answer, gameId, selectedPoints, socket, state?.currentQuestion, teamId]);
  

  /* ── early exits ──────────────────────────────────────────────── */
  if (!state) return <div className="p-6">Loading question…</div>;

  /* ── helpers for UI logic ─────────────────────────────────────── */
  const isMultiple = state.currentQuestion?.type === 'MULTIPLE_CHOICE';
  const isSingle   = state.currentQuestion?.type === 'SINGLE';
  const needsPoints =
    state.round?.pointSystem === 'POOL' && selectedPoints === null;
    // inside your render:
  const isList = state.currentQuestion?.type === 'LIST';  

  /* ── render ───────────────────────────────────────────────────── */
  return (
    
    <div className="grid gap-6 p-6 md:grid-cols-12">
      {/* Sidebar */}
      <aside className="md:col-span-3 space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">
            👤 {state.team.name}
          </h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-blue-600">{state.team.score}</span>
            <span className="text-sm text-gray-500">pts</span>
          </div>
        </div>
      </aside>
  
      {/* Main */}
      <section className="md:col-span-9 space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <header className="mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-700">
              Round: <span className="text-blue-600">{state.round?.name}</span>
            </h2>
            <h3 className="mt-1 text-xl font-medium text-gray-900">
              {state.currentQuestion?.text}
            </h3>
          </header>
  
          {/* SINGLE answer */}
          {isSingle && (
            <input
              type="text"
              className="w-full rounded-md border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:ring-blue-200"
              value={typeof answer === 'string' ? answer : ''}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Type your answer…"
            />
          )}
  
          {/* MULTIPLE choice */}
          {isMultiple && (
            <div className="space-y-3">
              {state.currentQuestion?.options?.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center space-x-3 rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    value={opt}
                    checked={Array.isArray(answer) && answer.includes(opt)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAnswer((prev) => {
                        if (!Array.isArray(prev)) return checked ? [opt] : [];
                        return checked
                          ? [...prev, opt]
                          : prev.filter((a) => a !== opt);
                      });
                    }}
                    disabled={submitted}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">{opt}</span>
                </label>
              ))}
            </div>
          )}
          {/* LIST question: render as many text inputs as there are correct options */}
          {isList && state.currentQuestion?.options && (
            <div className="space-y-2">
              <p className="mb-2 font-semibold">
                Name all {state.currentQuestion.options.length} items:
              </p>
              {/* answer is managed as string[] */}
              {(state.currentQuestion.options.map((_, idx) => (
                <input
                  key={idx}
                  type="text"
                  className="w-full rounded border p-2"
                  value={Array.isArray(answer) ? answer[idx] || '' : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswer((prev) => {
                      const arr = Array.isArray(prev) ? [...prev] : Array(state.currentQuestion!.options?.length).fill('');
                      arr[idx] = val;
                      return arr;
                    });
                  }}
                  disabled={submitted}
                  placeholder={`Item ${idx + 1}`}
                />
              )))}
            </div>
          )}
  
          {/* POOL point selector */}
          {state.round?.pointSystem === 'POOL' && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-600">
                Select a Point Value
              </h4>
              <div className="flex flex-wrap gap-3">
                {state.team.remainingPoints?.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setSelectedPoints(pt)}
                    disabled={submitted}
                    className={`flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                      selectedPoints === pt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          )}
  
          <button
            type="button"
            onClick={submitAnswer}
            disabled={submitted || !answer || needsPoints}
            className={`mt-6 w-full rounded-lg px-5 py-3 text-center font-semibold transition ${
              submitted
                ? 'cursor-not-allowed bg-gray-400 text-gray-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitted ? 'Answer Submitted' : 'Submit Answer'}
          </button>
        </div>
      </section>
    </div>
  )
}
