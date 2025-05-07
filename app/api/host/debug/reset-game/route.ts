// File: /app/api/host/reset/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { gameId } = await req.json()
    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required gameId" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // 1) Delete the GameState row
      await tx.gameState.deleteMany({
        where: { gameId },
      })

      // 2) Wipe out all AnswerItems first (if you have them as separate table)
      await tx.answerItem.deleteMany({
        where: {
          answer: {
            teamGame: { gameId },
          },
        },
      })

      // 3) Then delete all Answers for this game
      await tx.answer.deleteMany({
        where: {
          teamGame: { gameId },
        },
      })

      // 4) Reset every team’s totalPts back to zero
      await tx.teamGame.updateMany({
        where: { gameId },
        data: { totalPts: 0 },
      })

      // 5) Finally, put the Game itself back into DRAFT
      await tx.game.update({
        where: { id: gameId },
        data: { status: "DRAFT" },
      })
    })

    return NextResponse.json({ message: "Game reset successfully." })
  } catch (error) {
    console.error("Error resetting game:", error)
    return NextResponse.json(
      { error: "Failed to reset the game." },
      { status: 500 }
    )
  }
}
