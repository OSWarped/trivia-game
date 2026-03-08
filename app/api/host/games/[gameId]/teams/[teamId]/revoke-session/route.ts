import { NextResponse } from 'next/server';
import {
  PrismaClient,
  TeamGameSessionStatus,
  TeamGameSessionControlMode,
} from '@prisma/client';

const prisma = new PrismaClient();

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
    const now = new Date();

    const latestSession = await prisma.teamGameSession.findFirst({
      where: {
        gameId,
        teamId,
        status: {
          not: TeamGameSessionStatus.CLOSED,
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.teamGame.update({
        where: {
          teamId_gameId: {
            teamId,
            gameId,
          },
        },
        data: {
          sessionControlMode: TeamGameSessionControlMode.LOCKED,
        },
      });

      if (latestSession) {
        await tx.teamGameSession.update({
          where: { id: latestSession.id },
          data: {
            status: TeamGameSessionStatus.CLOSED,
            socketId: null,
            disconnectedAt: now,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      teamId,
      revokedSessionId: latestSession?.id ?? null,
      sessionControlMode: 'LOCKED',
    });
  } catch (error) {
    console.error('Failed to revoke and lock team session:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to revoke and lock team session.',
      },
      { status: 500 }
    );
  }
}