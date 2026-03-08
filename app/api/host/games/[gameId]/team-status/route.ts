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
    case TeamGameSessionStatus.CLOSED:
    default:
      return 'OFFLINE';
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const [teamGames, groupedScores, sessions] = await Promise.all([
    prisma.teamGame.findMany({
      where: { gameId },
      select: {
        id: true,
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

    prisma.answer.groupBy({
      by: ['teamGameId'],
      where: {
        teamGame: { gameId },
        isCorrect: true,
      },
      _sum: {
        awardedPoints: true,
      },
    }),

    prisma.teamGameSession.findMany({
      where: { gameId },
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

  const scoreMap = new Map<string, number>(
    groupedScores.map((row) => [row.teamGameId, row._sum.awardedPoints ?? 0])
  );

  const latestSessionByTeamId = new Map<
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
    if (!latestSessionByTeamId.has(session.teamId)) {
      latestSessionByTeamId.set(session.teamId, session);
    }
  }

  const result: HostTeamStatus[] = teamGames.map((teamGame) => {
    const latestSession = latestSessionByTeamId.get(teamGame.team.id);

    return {
      id: teamGame.team.id,
      name: teamGame.team.name,
      score: scoreMap.get(teamGame.id) ?? 0,
      submitted: false,
      connectionState: mapSessionStatusToConnectionState(latestSession?.status),
      transferMode: teamGame.sessionControlMode,
      hasDispute: false,
      activeSessionLabel: latestSession?.deviceId ?? null,
      pendingSessionLabel: teamGame.pendingApprovalDeviceId ?? null,
      pendingApprovalRequestedAt: teamGame.pendingApprovalRequestedAt
        ? teamGame.pendingApprovalRequestedAt.toISOString()
        : null,
      hasPendingApproval: !!teamGame.pendingApprovalRequestedAt,
    };
  });

  return NextResponse.json(result);
}