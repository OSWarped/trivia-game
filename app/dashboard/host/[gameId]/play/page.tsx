'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';
import type { GameState } from '@prisma/client';

/* ─────────── Types ─────────── */
interface QuestionOption { id: string; text: string; isCorrect: boolean }
interface Question {
  id: string;
  text: string;
  type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';
  options: QuestionOption[];
  sortOrder: number;
}
interface Round {
  id: string;
  name: string;
  questions: Question[];
  pointSystem: 'POOL' | 'FLAT';
  pointPool?: number[];
  pointValue?: number;
  sortOrder: number;
}
interface GameStateExpanded extends GameState {
  game: {
    rounds: Round[];
    teamGames: {
      team: { id: string; name: string };
      score?: number;
      answers: unknown[];
    }[];
  };
}
interface TeamStatus {
  id: string;
  name: string;
  score?: number;
  submitted: boolean;
}
interface TeamAnswer {
  teamId: string;
  teamName: string;
  questionId: string;
  given: string;
  isCorrect: boolean | null;
  awardedPoints: number;
  pointsUsed: number;
}

/* ─────────── Component ─────────── */
export default function HostGameInterface() {
  const { gameId } = useParams<{ gameId: string }>();

  /* socket */
  const socket = useSocket();
  useHostSocket(true, gameId ?? null);

  /* state */
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([]);
  const [gameState, setGameState] = useState<GameStateExpanded | null>(null);
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswer[]>([]);

  /* derive current round every render */
  const currentRound = useMemo(() => {
    if (!gameState) return null;
    return (
      gameState.game.rounds.find((r) => r.id === gameState.currentRoundId) ?? null
    );
  }, [gameState]);

  /* order rounds & questions the same way you build them server‑side */
  const orderedRounds = useMemo(
    () => gameState?.game.rounds.slice().sort((a, b) => a.sortOrder - b.sortOrder) || [],
    [gameState]
  );

  const flatQuestions = useMemo(() => {
    return orderedRounds.flatMap(r =>
      r.questions
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(q => ({ ...q, roundId: r.id, roundName: r.name }))
    );
  }, [orderedRounds]);

  const currentIdx = flatQuestions.findIndex(q => q.id === gameState?.currentQuestionId);
  const isLastInRound =
    currentRound &&
    currentRound.questions
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .at(-1)?.id === gameState?.currentQuestionId;

  const isFinalQuestion = currentIdx === flatQuestions.length - 1;

  const fetchAnswers = async (qId: string) => {
    const res = await fetch(
      `/api/host/games/${gameId}/answers?questionId=${qId}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      console.error('Failed to fetch answers for question', qId);
      return;
    }
    const all = (await res.json()) as TeamAnswer[];
    setTeamAnswers(all);
  };



  /* helper: refetch host state after question change */
  const refreshHostState = async () => {
    const res = await fetch(`/api/host/games/${gameId}/state`, {
      cache: 'no-store',
    });
    if (res.ok) {
      setGameState((await res.json()) as GameStateExpanded);
      // also clear submission flags + answer cards for a fresh question
      setTeamStatus((prev) => prev.map((t) => ({ ...t, submitted: false })));
      setTeamAnswers([]);

    }
  };

  

  useEffect(() => {
    if (!socket || !gameId) return;
  
    // ─────────── helper: fetch all answers for a question ───────────
    const fetchAnswers = async (qId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/answers?questionId=${qId}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        console.error('Failed to fetch answers for question', qId);
        return;
      }
      const all = (await res.json()) as TeamAnswer[];
      setTeamAnswers(all);
    };
  
    // ─────────── helper: fetch host state & then answers ───────────
    const fetchHostState = async () => {
      const res = await fetch(`/api/host/games/${gameId}/state`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as GameStateExpanded;
      setGameState(data);
      if (data.currentQuestionId) {
        await fetchAnswers(data.currentQuestionId);
      }
    };
  
    // ─────────── WS handlers ───────────
    const handleLiveTeams = async ({
      gameId: gid,
      teams,
    }: {
      gameId: string;
      teams: { id: string; name: string }[];
    }) => {
      if (gid !== gameId) return;
      // build base list
      const base = teams.map((t) => ({
        id: t.id,
        name: t.name,
        submitted: false,
        score: 0,
      }));
      // merge in real scores
      try {
        const res = await fetch(`/api/host/games/${gameId}/scores`, {
          cache: 'no-store',
        });
        const scores = (await res.json()) as { teamId: string; score: number }[];
        setTeamStatus(
          base.map((t) => ({
            ...t,
            score: scores.find((s) => s.teamId === t.id)?.score ?? 0,
          }))
        );
      } catch {
        setTeamStatus(base);
      }
    };
  
    const handleAnswerSubmission = async ({
      teamId,
      questionId,
    }: {
      teamId: string;
      questionId: string;
    }) => {
      // only care about the current question
      if (questionId !== gameState?.currentQuestionId) return;
      try {
        const res = await fetch(
          `/api/host/answers?gameId=${gameId}&teamId=${teamId}&questionId=${questionId}`
        );
        const { answer: dbAnswer } = (await res.json()) as { answer: TeamAnswer };
        if (!dbAnswer) return;
        // patch FLAT if needed
        if (
          dbAnswer.awardedPoints === 0 &&
          currentRound?.pointSystem === 'FLAT' &&
          currentRound.pointValue != null
        ) {
          dbAnswer.awardedPoints = currentRound.pointValue;
        }
        // flag submitted
        setTeamStatus((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, submitted: true } : t))
        );
        // add to cards
        setTeamAnswers((prev) => [...prev, dbAnswer]);
      } catch (err) {
        console.error(err);
      }
    };
  
    const handleScoreUpdate = ({
      teamId,
      newScore,
    }: {
      teamId: string;
      newScore: number;
    }) => {
      setTeamStatus((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, score: newScore } : t
        )
      );
    };
  
    const handleQuestionAdvance = () => {
      void fetchHostState(); // reload state & answers for the new question
    };
  
    const handleReset = () => {
      setTeamStatus((prev) => prev.map((t) => ({ ...t, submitted: false })));
      setTeamAnswers([]);
    };
  
    // ─────────── register all listeners ───────────
    socket.on('host:liveTeams', handleLiveTeams);
    socket.on('host:answerSubmission', handleAnswerSubmission);
    socket.on('score:update', handleScoreUpdate);
    socket.on('game:resetSubmissions', handleReset);
    socket.on('game:updateQuestion', handleQuestionAdvance);
  
    // ─────────── join room & request initial list ───────────
    const joinAndRequest = () => {
      socket.emit('host:join', { gameId });
      socket.emit('host:requestLiveTeams', { gameId });
    };
    if (socket.connected) {
      joinAndRequest();
    } else {
      socket.once('connect', joinAndRequest);
    }
  
    // ─────────── initial load ───────────
    void fetchHostState();
  
    // ─────────── cleanup on unmount ───────────
    return () => {
      socket.off('host:liveTeams', handleLiveTeams);
      socket.off('host:answerSubmission', handleAnswerSubmission);
      socket.off('score:update', handleScoreUpdate);
      socket.off('game:resetSubmissions', handleReset);
      socket.off('game:updateQuestion', handleQuestionAdvance);
      socket.off('connect', joinAndRequest);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, gameId]);
  


  /* ─────────── score API ─────────── */
  const handleScore = async (
    teamId: string,
    questionId: string,
    isCorrect: boolean
  ) => {
    try {
      await fetch('/api/host/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, teamId, questionId, isCorrect }),
      });
      setTeamAnswers((prev) =>
        prev.map((a) =>
          a.teamId === teamId && a.questionId === questionId
            ? { ...a, isCorrect }
            : a
        )
      );
    } catch (err) {
      console.error(err);
    }
  };


  function RevealAnswer({ question }: { question: Question | null }) {
    const [open, setOpen] = useState(false);
    if (!question) return null;

    return open ? (
      <div className="mt-4 rounded border border-yellow-300 bg-yellow-100 p-4">
        <h3 className="mb-2 font-semibold text-gray-700">Correct Answer:</h3>
        <ul className="list-inside list-disc text-gray-800">
          {question.options.filter(o => o.isCorrect).map(o => (
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
    );
  }
  const answerStyle = (ans: TeamAnswer) => {
    console.log('Teams answer:' + ans.isCorrect);
    if (ans.isCorrect === true) return 'border-green-400 bg-green-50';
    if (ans.isCorrect === false) return 'border-red-400  bg-red-50';
    return 'border-gray-200';
  };


  /* ─────────── UI ─────────── */
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-100 p-4 shadow-inner">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">👥 Teams</h2>
        <div className="space-y-3">
          {teamStatus.map((team) => (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm ${team.submitted ? 'border-green-400 ring-2 ring-green-300' : ''
                }`}
            >
              <span className="font-medium text-gray-800">
                {team.name}
                {team.submitted && (
                  <span className="ml-2 rounded bg-green-200 px-2 text-xs font-semibold text-green-800">
                    Submitted
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {team.score ?? 0} pts
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 space-y-6 p-8">
        <h1 className="mb-6 border-b pb-2 text-3xl font-bold text-gray-800">
          🎯 Host Game Dashboard
        </h1>

        {gameState && currentRound && (
          <section className="space-y-6 rounded-lg border-l-4 border-blue-500 bg-white p-6 shadow-md">
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-blue-800">
              📊 Current Game Progress
            </h2>
            <div className="flex gap-4">
              <button
                type="button"
                className="rounded bg-gray-300 px-4 py-2 font-semibold hover:bg-gray-400"
                onClick={async () => {
                  await fetch(`/api/host/games/${gameId}/prev`, { method: 'POST' });
                  socket?.emit('host:previousQuestion', { gameId }); // server will broadcast
                }}
              >
                ⬅ Prev
              </button>

              <button
                type="button"
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                onClick={async () => {
                  await fetch(`/api/host/games/${gameId}/next`, { method: 'POST' });
                  socket?.emit('host:nextQuestion', { gameId });
                }}
              >
                Next ➡
              </button>
            </div>

            {isLastInRound && !isFinalQuestion && (
              <div className="rounded bg-indigo-100 p-3 text-indigo-800 shadow">
                ⚠️ You’re on the last question of <strong>{currentRound?.name}</strong>.
              </div>
            )}

            {isFinalQuestion && (
              <div className="rounded bg-red-100 p-3 text-red-800 shadow">
                🚨 This is the <strong>final question</strong> of the game!
              </div>
            )}


            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Current Round
                </p>
                <p className="mt-1 text-lg font-bold text-blue-900">
                  {currentRound.name}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-green-50 p-4 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                  Current Question
                </p>
                <p className="mt-1 text-lg font-medium text-green-900">
                  {currentRound.questions.find(
                    (q) => q.id === gameState.currentQuestionId
                  )?.text ?? 'No active question'}
                </p>
              </div>
            </div>

            <RevealAnswer
              question={
                currentRound?.questions.find(q => q.id === gameState.currentQuestionId) || null
              }
            />

            <div>
              {isFinalQuestion && (
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/host/games/${gameId}/complete`, { method: 'PATCH' });
                    socket?.emit('host:gameCompleted', { gameId }); // you already have this in ws‑server
                  }}
                  className="mt-6 rounded bg-red-600 px-6 py-3 font-semibold text-white shadow hover:bg-red-700"
                >
                  ✅ Complete Game
                </button>
              )}

            </div>


          </section>
        )}

        {/* Answer cards */}
        {teamAnswers.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {teamAnswers.map((ans, idx) => {
              const displayPoints =
                ans.awardedPoints ||
                (currentRound?.pointSystem === 'FLAT'
                  ? currentRound.pointValue ?? 0
                  : 0);

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 rounded-lg border p-4 shadow ${answerStyle(ans)}`}
                >
                  <div className="text-lg font-semibold">{ans.teamName}</div>
                  <div className="text-gray-700">
                    Answered:{' '}
                    <span className="font-medium">{ans.given}</span>
                    {ans.isCorrect !== null && (
                      <span
                        className={`self-start rounded px-2 py-0.5 text-xs font-semibold ${ans.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                          }`}
                      >
                        {ans.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    Points: {displayPoints}
                  </div>
                  {ans.pointsUsed !== null && (
                    <div className="text-sm text-gray-500">
                      Points Used: {ans.pointsUsed ?? '—'}
                    </div>)
                  }

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                      onClick={() =>
                        handleScore(ans.teamId, ans.questionId, true)
                      }
                    >
                      Mark Correct
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                      onClick={() =>
                        handleScore(ans.teamId, ans.questionId, false)
                      }
                    >
                      Mark Incorrect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
