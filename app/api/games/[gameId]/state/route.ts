// File: /app/api/games/[gameId]/state/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params         // ← await here

  console.log('GAME ID: ' + gameId)
  const url = new URL(req.url)
  const teamId = url.searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json(
      { error: 'teamId query parameter is required' },
      { status: 400 }
    )
  }
  console.log('TEAM ID: ' + teamId);

  try {
    // 1) Make sure this team is in the game
    const teamGame = await prisma.teamGame.findUnique({
      where: { teamId_gameId: { teamId, gameId } },
      select: { id: true, totalPts: true, team: { select: { name: true } } },
    })
    if (!teamGame) {
      return NextResponse.json(
        { error: 'Team is not part of this game' },
        { status: 404 }
      )
    }
    console.log('TEAM GAME: ' + JSON.stringify(teamGame));

    // 2) Load the GameState and all rounds
    const gs = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          select: {
            status: true,
            rounds: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                roundType: true,
                pointSystem: true,
                pointPool: true,
                pointValue: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    })
    if (!gs) {
      return NextResponse.json(
        { error: 'Game state not found' },
        { status: 404 }
      )
    }
    console.log('GAME State: ' + JSON.stringify(gs));
    // 3) Identify current round & question
    const { currentRoundId, currentQuestionId, isAcceptingAnswers } = gs
    const currentRound =
      gs.game.rounds.find((r) => r.id === currentRoundId) || null

    // 4) Fetch current question details
    let currentQuestion: {
      id: string
      text: string
      type: string
      options?: { id: string; text: string }[]
    } | null = null
    if (currentQuestionId) {
      currentQuestion = await prisma.question.findUnique({
        where: { id: currentQuestionId },
        select: {
          id: true,
          text: true,
          type: true,
          options: { select: { id: true, text: true } },
        },
      })
    }
    console.log('CURRENT QUESTION: ' + JSON.stringify(currentQuestion));

    console.log('****GETTING SUBMIT ANSWER**** ');
    // 5) Get this team’s latest answer (if any)
    let submittedAnswer:
      | { answer: string; pointsUsed: number | null }
      | null = null
    if (currentQuestionId) {
      const ans = await prisma.answer.findFirst({
        where: {
          questionId: currentQuestionId,
          teamGameId: teamGame.id,
        },
        select: { given: true, pointsUsed: true },
        orderBy: { createdAt: 'desc' },
      })
      if (ans) {
        submittedAnswer = { answer: ans.given, pointsUsed: ans.pointsUsed }
      }
    }
    console.log('SUBMIT ANSWER: ' + JSON.stringify(submittedAnswer));
    // 6) If it’s a POOL round, compute remaining pool
    let remainingPoints: number[] = []
    if (
      currentRound?.pointSystem === 'POOL' &&
      Array.isArray(currentRound.pointPool)
    ) {
      const usedRows = await prisma.answer.findMany({
        where: {
          teamGameId: teamGame.id,
          question: { roundId: currentRound.id },
        },
        select: { pointsUsed: true },
      })
      const used = usedRows
        .map((r) => r.pointsUsed)
        .filter((v): v is number => typeof v === 'number')
      remainingPoints = currentRound.pointPool.filter((p) => !used.includes(p))
    }
    console.log('REMAINING POINTS: ' + JSON.stringify(remainingPoints));

    // 7) Build and return the JSON object
    const payload = {
      game: { id: gameId, status: gs.game.status },
      round: currentRound
        ? {
            id: currentRound.id,
            name: currentRound.name,
            roundType: currentRound.roundType,
            pointSystem: currentRound.pointSystem,
            pointPool:
              currentRound.pointSystem === 'POOL'
                ? currentRound.pointPool
                : undefined,
            pointValue:
              currentRound.pointSystem === 'FLAT'
                ? currentRound.pointValue
                : undefined,
          }
        : null,
      currentQuestion,
      team: {
        id: teamId,
        name: teamGame.team.name,
        score: teamGame.totalPts,
        remainingPoints,
        submittedAnswer,
      },
      isAcceptingAnswers,
    }
    console.log('PAYLOAD: ' + JSON.stringify(payload));
    return NextResponse.json(payload)
  } catch (e) {
    console.error('Error in team-state handler:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
