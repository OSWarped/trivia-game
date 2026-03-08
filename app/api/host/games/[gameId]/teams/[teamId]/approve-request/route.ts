import { NextResponse } from 'next/server';
import {
  PrismaClient,
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

    await prisma.teamGame.update({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
      data: {
        sessionControlMode: TeamGameSessionControlMode.NORMAL,
        pendingApprovalRequestedAt: null,
        pendingApprovalDeviceId: null,
      },
    });

    return NextResponse.json({ ok: true, teamId });
  } catch (error) {
    console.error('Failed to approve join request:', error);

    return NextResponse.json(
      { ok: false, error: 'Failed to approve join request.' },
      { status: 500 }
    );
  }
}