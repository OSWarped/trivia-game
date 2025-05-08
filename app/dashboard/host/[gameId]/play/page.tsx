/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSocket } from '@/components/SocketProvider'
import { useHostSocket } from '@/app/hooks/useHostSocket'
import type { GameState } from '@prisma/client'

interface QuestionOption { id: string; text: string; isCorrect: boolean }
interface Question {
  id: string
  text: string
  type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER' | 'LIST'
  options?: QuestionOption[]
  sortOrder: number
}
interface Round {
  id: string
  name: string
  questions: Question[]
  pointSystem: 'POOL' | 'FLAT'
  pointPool?: number[]
  pointValue?: number
  sortOrder: number
}
interface GameStateExpanded extends GameState {
  game: {
    rounds: Round[]
    teamGames: {
      team: { id: string; name: string }
      score?: number
      answers: unknown[]
    }[]
  }
}
interface TeamStatus {
  id: string
  name: string
  score?: number
  submitted: boolean
}
interface ListItem {
  submitted: string
  isCorrect: boolean | null
}
interface TeamAnswer {
  teamId: string
  teamName: string
  questionId: string
  given: string
  isCorrect: boolean | null
  awardedPoints: number
  pointsUsed: number | null
  // list‐only:
  items?: ListItem[]
}

export default function HostGameInterface() {
  const { gameId } = useParams<{ gameId: string }>()
  const socket = useSocket()
  useHostSocket(true, gameId ?? null)

  const [gameState,  setGameState]  = useState<GameStateExpanded | null>(null)
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([])
  const [teamAnswers,setTeamAnswers]= useState<TeamAnswer[]>([])

  // ── Refs for latest question & round info ───────────────────────────
  const currentQuestionRef = useRef<string | null>(null)
  const pointSystemRef     = useRef<'POOL'|'FLAT'|null>(null)
  const pointValueRef      = useRef<number|null>(null)
  const questionTypeRef    = useRef<Question['type']|null>(null)

  // ── Keep refs in sync with real gameState ────────────────────────────
  useEffect(() => {
    currentQuestionRef.current = gameState?.currentQuestionId ?? null
    const cr = gameState
      ? gameState.game.rounds.find(r => r.id === gameState.currentRoundId)
      : null
    pointSystemRef.current = cr?.pointSystem ?? null
    pointValueRef.current  = cr?.pointValue  ?? null
    if (cr && gameState?.currentQuestionId) {
      const q = cr.questions.find(q => q.id === gameState.currentQuestionId)
      questionTypeRef.current = q?.type ?? null
    } else {
      questionTypeRef.current = null
    }
  }, [gameState])

  // ── Bootstrapping & WS handlers ──────────────────────────────────────
  useEffect(() => {
    if (!socket || !gameId) return

    // ○ Fetch gameState + answers
    const bootstrap = async () => {
      const st = await fetch(`/api/host/games/${gameId}/state`, { cache:'no-store' })
      if (!st.ok) return
      const dto = (await st.json()) as GameStateExpanded
      setGameState(dto)
      // setTeamStatus(
      //   dto.game.teamGames.map(tg => ({
      //     id: tg.team.id,
      //     name: tg.team.name,
      //     score: tg.score ?? 0,
      //     submitted: false,
      //   }))
      // )
      // fetch answers for the current question if there is one
    if (dto.currentQuestionId) {
      const round    = dto.game.rounds.find(r => r.id === dto.currentRoundId)!;
      const question = round.questions.find(q => q.id === dto.currentQuestionId)!;
      await fetchAnswers(dto.currentQuestionId, question.type === 'LIST');
    }

    // ⚡️ Immediately ask for the live‐teams list
    socket.emit('host:requestLiveTeams', { gameId });
    }

    const handleLiveTeams = async ({ gameId: gid, teams }: { gameId: string; teams: { id: string; name: string }[] }) => {
      if (gid !== gameId) return;
  
      // pull their current scores
      const sc = await fetch(`/api/host/games/${gameId}/scores`, { cache: 'no-store' });
      const scores = sc.ok ? (await sc.json()) as { teamId: string; score: number }[] : [];
  
      setTeamStatus(
        teams.map(t => ({
          id:        t.id,
          name:      t.name,
          score:     scores.find(s => s.teamId === t.id)?.score ?? 0,
          submitted: false,
        }))
      );
    };

    socket.on('host:liveTeams', handleLiveTeams);

    // ○ Handle single‐team submission
    const handleAnswerSubmission = async ({ teamId, questionId }: { teamId:string; questionId:string }) => {
      if (questionId !== currentQuestionRef.current) return
      const res = await fetch(
        `/api/host/answers?gameId=${gameId}&teamId=${teamId}&questionId=${questionId}`
      )
      const { answer: db } = await res.json() as { answer: TeamAnswer }
      if (!db) return

      // ○ FLAT fallback
      if (
        db.awardedPoints === 0 &&
        pointSystemRef.current === 'FLAT' &&
        pointValueRef.current != null
      ) {
        db.awardedPoints = pointValueRef.current!
      }

      // ○ LIST parsing
      if (questionTypeRef.current === 'LIST') {
        let arr: string[] = []
        try { arr = JSON.parse(db.given) } catch { arr = [] }
        db.items = arr.map(sub => ({ submitted: sub, isCorrect: null }))
      }

      setTeamStatus(ts =>
        ts.map(t => t.id === teamId ? { ...t, submitted: true } : t)
      )
      setTeamAnswers(a => [...a, db])
    }

    // ○ Live score updates
    const handleScoreUpdate = ({ teamId, newScore }: { teamId:string; newScore:number }) => {
      setTeamStatus(ts =>
        ts.map(t => t.id === teamId ? { ...t, score: newScore } : t)
      )
    }

    // ○ Question nav
    const handleQuestionAdvance = async () => {
      await bootstrap()
      setTeamAnswers([])
      setTeamStatus(ts => ts.map(t => ({ ...t, submitted: false })))
    }

    // register
    socket.on('host:answerSubmission', handleAnswerSubmission)
    socket.on('score:update',           handleScoreUpdate)
    socket.on('game:updateQuestion',    handleQuestionAdvance)

    // join + initial
    const joinRoom = () => {
    socket.emit('host:join',             { gameId });
    socket.emit('host:requestLiveTeams', { gameId });
  };
  if (socket.connected) joinRoom();
  else               socket.once('connect', joinRoom);

  void bootstrap();

  return () => {
    socket.off('host:liveTeams',       handleLiveTeams);
    socket.off('host:answerSubmission', handleAnswerSubmission);
    socket.off('score:update',          handleScoreUpdate);
    socket.off('game:updateQuestion',   handleQuestionAdvance);
    socket.off('connect',               joinRoom);
    }
  }, [socket, gameId])


  // ── Derive currentRound & currentQuestion ─────────────────────────
  const currentRound    = useMemo(()=>{
    if (!gameState) return null
    return gameState.game.rounds.find(r => r.id === gameState.currentRoundId) || null
  },[gameState])

  // const currentQuestion = useMemo(()=>{
  //   if (!currentRound||!gameState) return null
  //   return currentRound.questions.find(q=>q.id===gameState.currentQuestionId) || null
  // },[currentRound, gameState])

  // ── Fetch answers helper (LIST vs. single) ─────────────────────────
  const fetchAnswers = async (questionId: string, isList: boolean) => {
    const res = await fetch(
      `/api/host/games/${gameId}/answers?questionId=${questionId}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return
    const raw = await res.json() as TeamAnswer[]
    if (!isList) {
      setTeamAnswers(raw)
      return
    }
    const withItems = raw.map(a => {
      let arr: string[] = []
      try { arr = JSON.parse(a.given) } catch {}
      return {
        ...a,
        items: arr.map(sub => ({ submitted: sub, isCorrect: null }))
      }
    })
    setTeamAnswers(withItems)
  }

  // ── Navigation helpers ────────────────────────────────────────────
  const orderedRounds = useMemo(
    () => gameState?.game.rounds.slice().sort((a,b)=>a.sortOrder-b.sortOrder)||[],
    [gameState]
  )
  const flatQuestions = useMemo(()=>
    orderedRounds.flatMap(r=>r.questions.slice().sort((a,b)=>a.sortOrder-b.sortOrder)
      .map(q=>({...q,roundId:r.id,roundName:r.name}))
    ),[orderedRounds]
  )
  const currentIdx   = flatQuestions.findIndex(q=>q.id===gameState?.currentQuestionId)
  const isLastInRound= !!currentRound &&
    currentRound.questions.slice().sort((a,b)=>a.sortOrder-b.sortOrder).at(-1)?.id===gameState?.currentQuestionId
  const isFinalQuestion = currentIdx === flatQuestions.length-1

  // ── Score handlers ────────────────────────────────────────────────
  const handleScore = async (teamId:string, questionId:string, isCorrect:boolean) => {
    await fetch('/api/host/score-answer',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({gameId,teamId,questionId,isCorrect})
    })
    setTeamAnswers(prev=>
      prev.map(a=>
        a.teamId===teamId&&a.questionId===questionId
          ? {...a,isCorrect}
          : a
      )
    )
  }

  const handleListScore = async (
    teamId:string,
    questionId:string,
    itemIndex:number,
    isCorrect:boolean
  ) => {
    await fetch('/api/host/score-list-answer',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({gameId,teamId,questionId,itemIndex,isCorrect})
    })
    setTeamAnswers(ans=>
      ans.map(a=>{
        if(a.teamId!==teamId||a.questionId!==questionId) return a
        const items = [...(a.items||[])]
        items[itemIndex] = {...items[itemIndex],isCorrect}
        return {...a,items}
      })
    )
  }


  function RevealAnswer({ question }: { question: Question | null }) {
    const [open, setOpen] = useState(false);
    if (!question) return null;

    const opts = question.options ?? []; // ← default to empty array

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

      const isList = Array.isArray((ans as any).items);

      return (
        <div
          key={idx}
          className={`flex flex-col gap-4 rounded-lg border p-4 shadow ${answerStyle(ans)}`}
        >
          <div className="text-lg font-semibold">{ans.teamName}</div>

          {isList ? (
            /* ── LIST‐style: render each submitted item with per‐item scoring ── */
            <div className="space-y-2">
              <p className="font-medium text-gray-700">Submitted Items:</p>
              {(ans as any).items.map(
                (it: { submitted: string; isCorrect: boolean | null }, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between space-x-2"
                  >
                    <span className="flex-1 text-gray-800">{it.submitted}</span>
                    <button
                      onClick={() =>
                        handleListScore(ans.teamId, ans.questionId, i, true)
                      }
                      className={`px-2 py-1 rounded ${
                        it.isCorrect === true
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 text-green-800'
                      }`}
                      title="Mark this item correct"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() =>
                        handleListScore(ans.teamId, ans.questionId, i, false)
                      }
                      className={`px-2 py-1 rounded ${
                        it.isCorrect === false
                          ? 'bg-red-500 text-white'
                          : 'bg-red-100 text-red-800'
                      }`}
                      title="Mark this item incorrect"
                    >
                      ✗
                    </button>
                  </div>
                )
              )}
            </div>
          ) : (
            /* ── SINGLE / MULTIPLE: show the one “given” string ── */
            <div className="text-gray-700">
              Answered:{' '}
              <span className="font-medium">{ans.given}</span>
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
      );
    })}
  </div>
)}


      </main>
    </div>
  );
}
