// File: /app/api/play/answers/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { gameId, questionId, answer, pointsUsed, teamId } = await req.json()

    if (!teamId || !gameId || !questionId || answer == null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1) ensure question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })
    if (!question) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      )
    }

    // 2) find the TeamGame
    const teamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: { teamId, gameId },
      },
    })
    if (!teamGame) {
      return NextResponse.json(
        { error: 'Team not part of this game' },
        { status: 404 }
      )
    }

    // 3) prevent duplicate
    const existing = await prisma.answer.findFirst({
      where: {
        teamGameId: teamGame.id,
        questionId,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Already submitted' },
        { status: 400 }
      )
    }

    // 4) normalize pointsUsed into a single number or null
    let storedPointsUsed: number | null = null
    if (typeof pointsUsed === 'number') {
      storedPointsUsed = pointsUsed
    } else if (Array.isArray(pointsUsed) && pointsUsed.length > 0) {
      storedPointsUsed = pointsUsed[0]
    }

    // 5) create the answer record, and if this was a LIST question
    //    (i.e. answer is an array), also create one AnswerItem per entry
    await prisma.answer.create({
      data: {
        teamGameId: teamGame.id,
        questionId,
        given: typeof answer === 'string' ? answer : JSON.stringify(answer),
        isCorrect: null,
        awardedPoints: 0,
        pointsUsed: storedPointsUsed,
        // <-- ADD THIS:
        items: Array.isArray(answer)
      ? {
          create: (answer as string[]).map((item) => ({
            submitted: item,
            isCorrect: null,  // explicit
            awarded:   0,     // explicit
          })),
        }
      : undefined,
      },
    })

    // 6) if POOL‐style, update the remaining pool
    if (storedPointsUsed != null) {
      const gs = await prisma.gameState.findUnique({
        where: { gameId },
      })
      if (gs?.pointsRemaining) {
        const poolMap = gs.pointsRemaining as Record<string, number[]>
        const teamPool = poolMap[teamId] ?? []
        const idx = teamPool.indexOf(storedPointsUsed)
        if (idx !== -1) {
          teamPool.splice(idx, 1)
          poolMap[teamId] = teamPool
          await prisma.gameState.update({
            where: { gameId },
            data: { pointsRemaining: poolMap },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in POST /api/play/answers:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
