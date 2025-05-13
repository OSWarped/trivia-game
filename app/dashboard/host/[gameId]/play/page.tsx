/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/components/SocketProvider'
import { useHostSocket } from '@/app/hooks/useHostSocket'
import TeamSidebar, { TeamStatus } from './components/TeamSidebar'
import CurrentGamePanel from './components/CurrentGamePanel'
import TeamAnswerGrid, { TeamAnswer } from './components/TeamAnswerGrid'
import TeamDrawer from './components/TeamDrawer'
import { useReliableEmit } from '@/lib/reliable-handshake';
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

export default function HostDashboard() {
  const { gameId } = useParams<{ gameId: string }>()
  const socket = useSocket()
  useHostSocket(true, gameId ?? null)
  const router = useRouter();

  // State
  const [gameState, setGameState] = useState<GameStateExpanded | null>(null)
  const [teamStatus, setTeamStatus] = useState<TeamStatus[]>([])
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswer[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected')
  const reliableEmit = useReliableEmit(socket!, {
    timeoutMs: 3000,
    maxRetries: 3
  });
  
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  

  // Refs for sync
  const currentQuestionRef = useRef<string | null>(null)
  const pointSystemRef = useRef<'POOL' | 'FLAT' | null>(null)
  const pointValueRef = useRef<number | null>(null)
  const questionTypeRef = useRef<Question['type'] | null>(null)

  useEffect(() => {
    currentQuestionRef.current = gameState?.currentQuestionId ?? null
    const cr = gameState
      ? gameState.game.rounds.find(r => r.id === gameState.currentRoundId)
      : null
    pointSystemRef.current = cr?.pointSystem ?? null
    pointValueRef.current = cr?.pointValue ?? null
    if (cr && gameState?.currentQuestionId) {
      const q = cr.questions.find(q => q.id === gameState.currentQuestionId)
      questionTypeRef.current = q?.type ?? null
    } else {
      questionTypeRef.current = null
    }
  }, [gameState])

  // WebSocket & bootstrap
  useEffect(() => {
    if (!socket || !gameId) return

    // Bootstrap fetch
    const bootstrap = async () => {
      const st = await fetch(`/api/host/games/${gameId}/state`, { cache: 'no-store' })
      if (!st.ok) return
      const dto = (await st.json()) as GameStateExpanded
      setGameState(dto)
      // Fetch answers if a question is active
      if (dto.currentQuestionId) {
        const round = dto.game.rounds.find(r => r.id === dto.currentRoundId)!
        const question = round.questions.find(q => q.id === dto.currentQuestionId)!
        await fetchAnswers(dto.currentQuestionId, question.type === 'LIST')
      }
      // Request live teams
      socket.emit('host:requestLiveTeams', { gameId })
    }

    // Handlers
    const handleLiveTeams = async ({ gameId: gid, teams }: { gameId: string; teams: { id: string; name: string }[] }) => {
      if (gid !== gameId) return
      const sc = await fetch(`/api/host/games/${gameId}/scores`, { cache: 'no-store' })
      const scores = sc.ok ? (await sc.json()) as { teamId: string; score: number }[] : []
      setTeamStatus(
        teams.map(t => ({
          id: t.id,
          name: t.name,
          score: scores.find(s => s.teamId === t.id)?.score ?? 0,
          submitted: false,
        }))
      )
    }

    const handleAnswerSubmission = async ({ teamId, questionId }: { teamId: string; questionId: string }) => {
      if (questionId !== currentQuestionRef.current) return
      const res = await fetch(
        `/api/host/answers?gameId=${gameId}&teamId=${teamId}&questionId=${questionId}`
      )
      const { answer: db } = await res.json() as { answer: TeamAnswer }
      if (!db) return
      if (db.awardedPoints === 0 && pointSystemRef.current === 'FLAT' && pointValueRef.current != null) {
        db.awardedPoints = pointValueRef.current
      }
      if (questionTypeRef.current === 'LIST') {
        let arr: string[] = []
        try { arr = JSON.parse(db.given) } catch { }
        db.items = arr.map(sub => ({ submitted: sub, isCorrect: null }))
      }
      setTeamStatus(ts => ts.map(t => t.id === teamId ? { ...t, submitted: true } : t))
      setTeamAnswers(a => [...a, db])
    }

    const handleScoreUpdate = ({ teamId, newScore }: { teamId: string; newScore: number }) => {
      setTeamStatus(ts => ts.map(t => t.id === teamId ? { ...t, score: newScore } : t))
    }

    const handleQuestionAdvance = async () => {
      await bootstrap()
      setTeamAnswers([])
      setTeamStatus(ts => ts.map(t => ({ ...t, submitted: false })))
    }

    // After:
    const handleTeamReconnected = ({ teamName }: { teamName: string }) => {
      console.log(`🔄 Team ${teamName} reconnected — reloading teams`)
      socket.emit('host:requestLiveTeams', { gameId })
    }

    // Connection status
    socket.on('disconnect', () => setConnectionStatus('disconnected'))
    socket.on('connect', () => setConnectionStatus('connected'))

    // Register socket events
    socket.on('host:liveTeams', handleLiveTeams)
    socket.on('host:answerSubmission', handleAnswerSubmission)
    socket.on('score:update', handleScoreUpdate)
    socket.on('game:updateQuestion', handleQuestionAdvance)
    socket.on('host:teamReconnected', handleTeamReconnected)

    // Join room and initial
    const joinRoom = () => {
      socket.emit('host:join', { gameId })
      socket.emit('host:requestLiveTeams', { gameId })
    }
    if (socket.connected) joinRoom()
    else socket.once('connect', joinRoom)

    void bootstrap()

    return () => {
      socket.off('host:liveTeams', handleLiveTeams)
      socket.off('host:answerSubmission', handleAnswerSubmission)
      socket.off('score:update', handleScoreUpdate)
      socket.off('game:updateQuestion', handleQuestionAdvance)
      socket.off('host:teamReconnected', handleTeamReconnected)
      socket.off('connect', joinRoom)
    }
  }, [socket, gameId])

  // Helpers & derived
  const fetchAnswers = async (questionId: string, isList: boolean) => {
    const res = await fetch(`/api/host/games/${gameId}/answers?questionId=${questionId}`, { cache: 'no-store' })
    if (!res.ok) return
    const raw = await res.json() as TeamAnswer[]
    if (!isList) { setTeamAnswers(raw); return }
    const withItems = raw.map(a => {
      let arr: string[] = []
      try { arr = JSON.parse(a.given) } catch { }
      return { ...a, items: arr.map(sub => ({ submitted: sub, isCorrect: null })) }
    })
    setTeamAnswers(withItems)
  }

  const orderedRounds = useMemo(
    () => gameState?.game.rounds.slice().sort((a, b) => a.sortOrder - b.sortOrder) || [],
    [gameState]
  )
  const flatQuestions = useMemo(
    () => orderedRounds.flatMap(r => r.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder)
      .map(q => ({ ...q, roundId: r.id, roundName: r.name }))
    ),
    [orderedRounds]
  )
  const currentIdx = flatQuestions.findIndex(q => q.id === gameState?.currentQuestionId)
  const currentRound = useMemo(
    () => gameState ? gameState.game.rounds.find(r => r.id === gameState.currentRoundId) || null : null,
    [gameState]
  )
  const isLastInRound = !!currentRound &&
    currentRound.questions.slice().sort((a, b) => a.sortOrder - b.sortOrder).at(-1)?.id === gameState?.currentQuestionId
  const isFinalQuestion = currentIdx === flatQuestions.length - 1

  // PREVIOUS QUESTION
const handlePrev = async () => {
  setLoadingPrev(true);
  await fetch(`/api/host/games/${gameId}/prev`, { method: 'POST' });
  reliableEmit(
    'host:previousQuestion',
    { gameId },
    () => setLoadingPrev(false),              // ack ➞ stop loading
    (err) => {
      console.error('Prev delivery failed', err);
      setLoadingPrev(false);
    }
  );
};

// NEXT QUESTION
const handleNext = async () => {
  setLoadingNext(true);
  await fetch(`/api/host/games/${gameId}/next`, { method: 'POST' });
  reliableEmit(
    'host:nextQuestion',
    { gameId },
    () => setLoadingNext(false),
    (err) => {
      console.error('Next delivery failed', err);
      setLoadingNext(false);
    }
  );
};

  const handleComplete = async () => {
    await fetch(`/api/host/games/${gameId}/complete`, { method: 'PATCH' })
    socket?.emit('host:gameCompleted', { gameId })
    router.push(`/dashboard/host/${gameId}/play/results`);
  }

  // SCORE UPDATE (single-answer)
const handleScore = async (teamId: string, questionId: string, isCorrect: boolean) => {
  const res = await fetch('/api/host/score-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, teamId, questionId, isCorrect }),
  });
  const { ok, newScore } = await res.json();
  if (!ok) return;

  // optimistically update your UI
  setTeamAnswers(prev =>
    prev.map(a =>
      a.teamId === teamId && a.questionId === questionId
        ? { ...a, isCorrect }
        : a
    )
  );

  reliableEmit(
    'host:scoreUpdate',
    { gameId, teamId, newScore },
    () => {
      /* ack: nothing else to do */
    },
    (err) => {
      console.error('ScoreUpdate delivery failed', err);
    }
  );
};

// SCORE UPDATE (list-answer)
const handleListScore = async (
  teamId: string,
  questionId: string,
  itemIndex: number,
  isCorrect: boolean
) => {
  const res = await fetch('/api/host/score-list-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, teamId, questionId, itemIndex, isCorrect }),
  });
  const { ok, newScore } = await res.json();
  if (!ok) return;

  setTeamAnswers(ans =>
    ans.map(a => {
      if (a.teamId !== teamId || a.questionId !== questionId) return a;
      const items = [...(a.items || [])];
      items[itemIndex] = { ...items[itemIndex], isCorrect };
      return { ...a, items };
    })
  );

  reliableEmit(
    'host:scoreUpdate',
    { gameId, teamId, newScore },
    () => { /* ack received */ },
    (err) => {
      console.error('ScoreUpdate delivery failed', err);
    }
  );
};

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <TeamSidebar
          teamStatus={teamStatus}
          onRequestLiveTeams={() => socket?.emit('host:requestLiveTeams', { gameId })}
        />
      </div>
      <TeamDrawer
        teamStatus={teamStatus}
        onRequestLiveTeams={() => socket?.emit('host:requestLiveTeams', { gameId })}
      /> 

      <main className="flex-1 p-6 md:p-8">
        <h1 className="mb-6 border-b pb-2 text-3xl font-bold text-gray-800">
          🎯 Host Game Dashboard
        </h1>

        {gameState && currentRound && (
          <CurrentGamePanel
            gameId={gameId}
            currentRound={currentRound}
            currentQuestionId={gameState.currentQuestionId}
            isLastInRound={isLastInRound}
            isFinalQuestion={isFinalQuestion}
            onPrev={handlePrev}
            onNext={handleNext}
            onComplete={handleComplete}
          />
        )}

        {/* Answer cards */}
        <TeamAnswerGrid
          teamAnswers={teamAnswers}
          currentRound={currentRound}
          handleScore={handleScore}
          handleListScore={handleListScore}
        />

        {/* Reconnecting banner */}
        {connectionStatus === 'disconnected' && (
          <div className="mt-4 text-center text-yellow-600">
            Reconnecting...
          </div>
        )}
      </main>
    </div>
  )
}
