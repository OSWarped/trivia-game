import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
        pendingApprovalRequestedAt: null,
        pendingApprovalDeviceId: null,
      },
    });

    return NextResponse.json({ ok: true, teamId });
  } catch (error) {
    console.error('Failed to deny join request:', error);

    return NextResponse.json(
      { ok: false, error: 'Failed to deny join request.' },
      { status: 500 }
    );
  }
}