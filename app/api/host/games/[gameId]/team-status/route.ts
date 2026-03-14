// File: app/api/host/games/[gameId]/team-status/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, TeamGameSessionStatus } from '@prisma/client';
import type {
  HostTeamStatus,
  TeamActivitySeverity,
  TeamConnectionState,
} from '@/app/dashboard/host/[gameId]/play/types/host-play.types';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LatestSession = {
  id: string;
  teamId: string;
  status: TeamGameSessionStatus;
  deviceId: string | null;
  lastSeenAt: Date | null;
  joinedAt: Date;
};

function isInactiveSessionStatus(
  status: TeamGameSessionStatus | null | undefined
): boolean {
  return (
    status === TeamGameSessionStatus.RECONNECTING ||
    status === TeamGameSessionStatus.OFFLINE
  );
}

function mapSessionStatusToConnectionState(
  status: TeamGameSessionStatus | null | undefined,
  hasPendingApproval: boolean
): TeamConnectionState {
  if (!status && hasPendingApproval) {
    return 'PENDING_TRANSFER';
  }

  switch (status) {
    case TeamGameSessionStatus.ACTIVE:
      return 'ACTIVE';
    case TeamGameSessionStatus.RECONNECTING:
      return 'RECONNECTING';
    case TeamGameSessionStatus.OFFLINE:
      return 'OFFLINE';
    default:
      return hasPendingApproval ? 'PENDING_TRANSFER' : 'OFFLINE';
  }
}

function getInactiveDurationMs(
  status: TeamGameSessionStatus | null | undefined,
  lastSeenAt: Date | null | undefined,
  nowMs: number
): number {
  if (!isInactiveSessionStatus(status) || !lastSeenAt) {
    return 0;
  }

  return Math.max(0, nowMs - lastSeenAt.getTime());
}

function getLastInactiveReason(
  status: TeamGameSessionStatus | null | undefined,
  hasPendingApproval: boolean
): HostTeamStatus['lastInactiveReason'] {
  if (!status && hasPendingApproval) {
    return 'HOST_TRANSFER';
  }

  if (isInactiveSessionStatus(status)) {
    return 'SOCKET_DISCONNECTED';
  }

  return null;
}

function getActivitySeverity({
  isInactiveNow,
  inactiveDurationMsCurrent,
  isLiveQuestion,
  hasPendingApproval,
}: {
  isInactiveNow: boolean;
  inactiveDurationMsCurrent: number;
  isLiveQuestion: boolean;
  hasPendingApproval: boolean;
}): TeamActivitySeverity {
  if (!isInactiveNow) {
    return 'NONE';
  }

  if (hasPendingApproval) {
    return 'LOW';
  }

  if (!isLiveQuestion) {
    return inactiveDurationMsCurrent >= 3_000 ? 'LOW' : 'NONE';
  }

  if (inactiveDurationMsCurrent >= 20_000) {
    return 'HIGH';
  }

  if (inactiveDurationMsCurrent >= 10_000) {
    return 'MEDIUM';
  }

  if (inactiveDurationMsCurrent >= 3_000) {
    return 'LOW';
  }

  return 'NONE';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const nowMs = Date.now();

  try {
    const [game, teamGames, sessions] = await Promise.all([
      prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          displayMode: true,
        },
      }),

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

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isLiveQuestion = game.displayMode === 'QUESTION';

    const latestOpenSessionByTeamId = new Map<string, LatestSession>();

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
        const hasPendingApproval = !!teamGame.pendingApprovalRequestedAt;

        const connectionState = mapSessionStatusToConnectionState(
          latestOpenSession?.status,
          hasPendingApproval
        );

        const isInactiveNow = isInactiveSessionStatus(latestOpenSession?.status);
        const inactiveDurationMsCurrent = getInactiveDurationMs(
          latestOpenSession?.status,
          latestOpenSession?.lastSeenAt,
          nowMs
        );

        const activitySeverity = getActivitySeverity({
          isInactiveNow,
          inactiveDurationMsCurrent,
          isLiveQuestion,
          hasPendingApproval,
        });

        const inactiveStartedAt =
          isInactiveNow && latestOpenSession?.lastSeenAt
            ? latestOpenSession.lastSeenAt.toISOString()
            : null;

        const lastSeenAt = latestOpenSession?.lastSeenAt
          ? latestOpenSession.lastSeenAt.toISOString()
          : latestOpenSession?.joinedAt
            ? latestOpenSession.joinedAt.toISOString()
            : null;

        return {
          id: teamGame.team.id,
          name: teamGame.team.name,
          score: teamGame.totalPts ?? 0,

          // Keep this false until submission state is wired into this route.
          submitted: false,

          connectionState,
          transferMode: teamGame.sessionControlMode,
          hasDispute: false,
          activeSessionLabel: latestOpenSession?.deviceId ?? null,
          pendingSessionLabel: teamGame.pendingApprovalDeviceId ?? null,
          pendingApprovalRequestedAt: teamGame.pendingApprovalRequestedAt
            ? teamGame.pendingApprovalRequestedAt.toISOString()
            : null,
          hasPendingApproval,

          // Activity monitor (derived from current session snapshot)
          isInactiveNow,
          inactiveStartedAt,
          inactiveDurationMsCurrent,
          lastSeenAt,
          lastRecoveredAt: null,
          lastInactiveReason: getLastInactiveReason(
            latestOpenSession?.status,
            hasPendingApproval
          ),
          activitySeverity,

          // Placeholder totals until a persistent activity-event log exists
          inactiveEventCountThisQuestion: 0,
          inactiveTotalMsThisQuestion: 0,
          inactiveEventCountThisGame: 0,
          inactiveTotalMsThisGame: 0,

          inactiveDuringLiveQuestion: isInactiveNow && isLiveQuestion,
          inactiveBeforeSubmission: false,
          inactiveAfterSubmission: false,
          highConcernThisQuestion:
            isLiveQuestion &&
            (activitySeverity === 'MEDIUM' || activitySeverity === 'HIGH'),

          recentActivityEvents: [],
        };
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to load host team status', error);

    return NextResponse.json(
      { error: 'Failed to load team status' },
      { status: 500 }
    );
  }
}