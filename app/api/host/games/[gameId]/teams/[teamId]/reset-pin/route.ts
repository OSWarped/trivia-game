import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateFourDigitPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ gameId: string; teamId: string }>;
  }
) {
  try {
    const { gameId, teamId } = await params;

    const teamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
      select: {
        teamId: true,
      },
    });

    if (!teamGame) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Team is not assigned to this game.',
        },
        { status: 404 }
      );
    }

    const newPin = generateFourDigitPin();

    await prisma.team.update({
      where: { id: teamId },
      data: {
        pin: newPin,
      },
    });

    return NextResponse.json({
      ok: true,
      teamId,
      newPin,
    });
  } catch (error) {
    console.error('Failed to reset team PIN:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to reset team PIN.',
      },
      { status: 500 }
    );
  }
}