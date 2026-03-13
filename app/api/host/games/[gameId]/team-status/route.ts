// File: app/api/host/games/[gameId]/team-status/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, TeamGameSessionStatus } from '@prisma/client';
import type { HostTeamStatus } from '@/app/dashboard/host/[gameId]/play/types/host-play.types';

const prisma = new PrismaClient();

function mapSessionStatusToConnectionState(
  status: TeamGameSessionStatus | null | undefined
): HostTeamStatus['connectionState'] {
  switch (status) {
    case TeamGameSessionStatus.ACTIVE:
      return 'ACTIVE';
    case TeamGameSessionStatus.RECONNECTING:
      return 'RECONNECTING';
    case TeamGameSessionStatus.OFFLINE:
      return 'OFFLINE';
    default:
      return 'OFFLINE';
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const [teamGames, sessions] = await Promise.all([
  prisma.teamGame.findMany({
    where: { gameId },
    select: {
      id: true,
      totalPts: true,
      sessionControlMode: true,
      pendingApprovalRequestedAt: true,
      pendingApprovalDeviceId: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  }),

  prisma.teamGameSession.findMany({
    where: {
      gameId,
      status: {
        in: [
          TeamGameSessionStatus.ACTIVE,
          TeamGameSessionStatus.RECONNECTING,
          TeamGameSessionStatus.OFFLINE,
        ],
      },
    },
    orderBy: [{ teamId: 'asc' }, { joinedAt: 'desc' }],
    select: {
      id: true,
      teamId: true,
      status: true,
      deviceId: true,
      lastSeenAt: true,
      joinedAt: true,
    },
  }),
]); 

  const latestOpenSessionByTeamId = new Map<
    string,
    {
      id: string;
      teamId: string;
      status: TeamGameSessionStatus;
      deviceId: string | null;
      lastSeenAt: Date;
      joinedAt: Date;
    }
  >();

  for (const session of sessions) {
    if (!latestOpenSessionByTeamId.has(session.teamId)) {
      latestOpenSessionByTeamId.set(session.teamId, session);
    }
  }

  const result: HostTeamStatus[] = teamGames
    .filter((teamGame) => {
      const latestOpenSession = latestOpenSessionByTeamId.get(teamGame.team.id);

      const shouldKeepWithoutSession =
        teamGame.sessionControlMode === 'LOCKED' ||
        teamGame.sessionControlMode === 'HOST_APPROVAL' ||
        !!teamGame.pendingApprovalRequestedAt;

      return !!latestOpenSession || shouldKeepWithoutSession;
    })
    .map((teamGame) => {
      const latestOpenSession = latestOpenSessionByTeamId.get(teamGame.team.id);

      return {
        id: teamGame.team.id,
        name: teamGame.team.name,
        score: teamGame.totalPts,
        submitted: false,
        connectionState: mapSessionStatusToConnectionState(
          latestOpenSession?.status
        ),
        transferMode: teamGame.sessionControlMode,
        hasDispute: false,
        activeSessionLabel: latestOpenSession?.deviceId ?? null,
        pendingSessionLabel: teamGame.pendingApprovalDeviceId ?? null,
        pendingApprovalRequestedAt: teamGame.pendingApprovalRequestedAt
          ? teamGame.pendingApprovalRequestedAt.toISOString()
          : null,
        hasPendingApproval: !!teamGame.pendingApprovalRequestedAt,
      };
    });

  return NextResponse.json(result);
}