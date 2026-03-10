// File: /app/api/host/debug/reset-game/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { gameId } = await req.json();

    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required gameId' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1) Remove persisted live game state
      await tx.gameState.deleteMany({
        where: { gameId },
      });

      // 2) Delete answer items first
      await tx.answerItem.deleteMany({
        where: {
          answer: {
            teamGame: {
              gameId,
            },
          },
        },
      });

      // 3) Delete answers tied to this game's team entries
      await tx.answer.deleteMany({
        where: {
          teamGame: {
            gameId,
          },
        },
      });

      // 4) Delete active/persisted device sessions for this game
      await tx.teamGameSession.deleteMany({
        where: { gameId },
      });

      // 5) Remove all team memberships from this game
      await tx.teamGame.deleteMany({
        where: { gameId },
      });

      // 6) Reset the game itself
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.SCHEDULED,
          displayMode: 'LOBBY',
          startedAt: null,
          endedAt: null,
        },
      });
    });

    return NextResponse.json({
      message: 'Game reset successfully.',
    });
  } catch (error) {
    console.error('Error resetting game:', error);

    return NextResponse.json(
      { error: 'Failed to reset the game.' },
      { status: 500 }
    );
  }
}