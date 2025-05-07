'use client';

import React, { JSX, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';

type QuestionType = 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';

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
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
    pointsUsed: selectedPoints ?? null,
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
      // eslint-disable-next-line no-console
      console.error('Failed to submit answer:', await res.json());
    }
  } catch (err) {
    // eslint-disable-next-line no-console
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

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="grid gap-6 p-6 md:grid-cols-12">
      {/* Sidebar */}
      <aside className="rounded bg-white p-4 shadow md:col-span-3">
        <h3 className="mb-2 text-lg font-bold">{state.team.name}</h3>
        <p>
          <strong>Score:</strong> {state.team.score}
        </p>
        <p>
          <strong>Remaining:</strong>{' '}
          {state.team.remainingPoints?.join(', ') || '—'}
        </p>
      </aside>

      {/* Main */}
      <section className="space-y-6 md:col-span-9">
        <h2 className="text-2xl font-bold">Round: {state.round?.name}</h2>
        <h3 className="text-xl">{state.currentQuestion?.text}</h3>

        {/* SINGLE answer */}
        {isSingle && (
          <input
            type="text"
            className="w-full rounded border p-2"
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
            placeholder="Your answer"
          />
        )}

        {/* MULTIPLE choice */}
        {isMultiple && (
          <div className="space-y-2">
            {state.currentQuestion?.options?.map((opt) => (
              <label key={opt} className="flex items-center space-x-2">
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
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )}

        {/* POOL point selector */}
        {state.round?.pointSystem === 'POOL' && (
          <div>
            <h4 className="mb-2 font-semibold">Select a Point Value</h4>
            <div className="flex flex-wrap gap-3">
              {state.team.remainingPoints?.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setSelectedPoints(pt)}
                  disabled={submitted}
                  className={`rounded border px-4 py-2 ${
                    selectedPoints === pt
                      ? 'bg-blue-700 text-white'
                      : 'bg-white hover:bg-blue-100'
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
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {submitted ? 'Answer Submitted' : 'Submit Answer'}
        </button>
      </section>
    </div>
  );
}
