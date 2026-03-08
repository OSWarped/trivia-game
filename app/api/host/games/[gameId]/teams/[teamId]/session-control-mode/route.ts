import { NextResponse } from 'next/server';
import {
  PrismaClient,
  TeamGameSessionControlMode,
} from '@prisma/client';

const prisma = new PrismaClient();

interface RequestBody {
  mode?: TeamGameSessionControlMode;
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ gameId: string; teamId: string }>;
  }
) {
  try {
    const { gameId, teamId } = await params;
    const body = (await req.json()) as RequestBody;

    if (
      body.mode !== TeamGameSessionControlMode.NORMAL &&
      body.mode !== TeamGameSessionControlMode.HOST_APPROVAL &&
      body.mode !== TeamGameSessionControlMode.LOCKED
    ) {
      return NextResponse.json(
        { ok: false, error: 'Invalid session control mode.' },
        { status: 400 }
      );
    }

    const updated = await prisma.teamGame.update({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
      data: {
        sessionControlMode: body.mode,
        ...(body.mode !== TeamGameSessionControlMode.HOST_APPROVAL
          ? {
              pendingApprovalRequestedAt: null,
              pendingApprovalDeviceId: null,
            }
          : {}),
      },
      select: {
        teamId: true,
        sessionControlMode: true,
      },
    });

    return NextResponse.json({
      ok: true,
      teamId: updated.teamId,
      sessionControlMode: updated.sessionControlMode,
    });
  } catch (error) {
    console.error('Failed to update session control mode:', error);

    return NextResponse.json(
      { ok: false, error: 'Failed to update session control mode.' },
      { status: 500 }
    );
  }
}