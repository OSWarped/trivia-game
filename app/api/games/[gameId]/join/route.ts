import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  PrismaClient,
  TeamGameSessionStatus,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

const JOINABLE_STATUSES = new Set(['SCHEDULED', 'LIVE']);
const SESSION_DURATION_HOURS = 12;

const ACTIVE_SESSION_STATUSES = [
  TeamGameSessionStatus.ACTIVE,
  TeamGameSessionStatus.RECONNECTING,
  TeamGameSessionStatus.OFFLINE,
] as const;

type TeamSummary = {
  id: string;
  name: string;
  pin: string | null;
};

type JoinFailure = {
  ok: false;
  error: string;
  status: number;
  code?: string;
};

type JoinSuccess = {
  ok: true;
  team: TeamSummary;
  session: {
    sessionToken: string;
    deviceId: string;
    status: TeamGameSessionStatus;
    joinedAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
  };
};

function fail(status: number, error: string, code?: string): JoinFailure {
  return {
    ok: false,
    error,
    status,
    code,
  };
}

function normalizeTeamName(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
}

function normalizeTeamNameKey(value: unknown): string {
  return normalizeTeamName(value).toLowerCase();
}

function normalizePin(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidPin(pin: string | null): boolean {
  if (pin === null) return true;
  return /^\d{4}$/.test(pin);
}

function buildSessionExpiry(from: Date): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  return expiresAt;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await req.json();

    const requestedTeamId =
      typeof body.teamId === 'string' && body.teamId.trim()
        ? body.teamId.trim()
        : null;

    const teamName = normalizeTeamName(body.teamName);
    const teamNameKey = normalizeTeamNameKey(body.teamName);
    const pin = normalizePin(body.pin);
    const providedDeviceId = normalizeDeviceId(body.deviceId);
    const deviceId = providedDeviceId ?? randomUUID();

    if (!teamName) {
      return NextResponse.json(
        { error: 'Team name is required.', code: 'TEAM_NAME_REQUIRED' },
        { status: 400 }
      );
    }

    if (!isValidPin(pin)) {
      return NextResponse.json(
        {
          error: 'PIN must be exactly 4 digits when provided.',
          code: 'PIN_INVALID_FORMAT',
        },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        siteId: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found.', code: 'GAME_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!JOINABLE_STATUSES.has(game.status)) {
      return NextResponse.json(
        {
          error: 'This game is not open for joining.',
          code: 'GAME_NOT_JOINABLE',
        },
        { status: 400 }
      );
    }

    const siteId = game.siteId;

    if (!siteId) {
      return NextResponse.json(
        {
          error: 'Game is missing site information.',
          code: 'GAME_SITE_MISSING',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = buildSessionExpiry(now);

    const result = await prisma.$transaction(
      async (tx): Promise<JoinFailure | JoinSuccess> => {
        await tx.teamGameSession.updateMany({
          where: {
            gameId,
            status: {
              not: TeamGameSessionStatus.CLOSED,
            },
            expiresAt: {
              lte: now,
            },
          },
          data: {
            status: TeamGameSessionStatus.CLOSED,
            socketId: null,
            disconnectedAt: now,
            lastSeenAt: now,
          },
        });

        const currentDeviceSession = await tx.teamGameSession.findFirst({
          where: {
            gameId,
            deviceId,
            status: {
              in: [...ACTIVE_SESSION_STATUSES],
            },
            expiresAt: {
              gt: now,
            },
          },
          orderBy: [{ lastSeenAt: 'desc' }, { joinedAt: 'desc' }],
          include: {
            team: {
              select: {
                id: true,
                name: true,
                pin: true,
              },
            },
          },
        });

        const currentDeviceTeamGame = currentDeviceSession
          ? await tx.teamGame.findUnique({
              where: {
                teamId_gameId: {
                  teamId: currentDeviceSession.teamId,
                  gameId,
                },
              },
              select: {
                id: true,
                totalPts: true,
                _count: {
                  select: {
                    answers: true,
                  },
                },
              },
            })
          : null;

        const currentGameTeamRows = await tx.teamGame.findMany({
          where: {
            gameId,
          },
          select: {
            team: {
              select: {
                id: true,
                name: true,
                pin: true,
              },
            },
          },
        });

        const currentGameTeamsById = new Map<string, TeamSummary>();
        for (const row of currentGameTeamRows) {
          currentGameTeamsById.set(row.team.id, row.team);
        }

        const currentGameNameMatches = Array.from(
          currentGameTeamsById.values()
        ).filter(
          (candidate) => normalizeTeamNameKey(candidate.name) === teamNameKey
        );

        const siteTeamRows = await tx.teamGame.findMany({
          where: {
            siteId,
          },
          select: {
            team: {
              select: {
                id: true,
                name: true,
                pin: true,
              },
            },
          },
        });

        const siteTeamsById = new Map<string, TeamSummary>();
        for (const row of siteTeamRows) {
          siteTeamsById.set(row.team.id, row.team);
        }

        const siteNameMatches = Array.from(siteTeamsById.values()).filter(
          (candidate) => normalizeTeamNameKey(candidate.name) === teamNameKey
        );

        let team: TeamSummary | null = null;

        // Rule set for teams already in the current game:
        // - same-device resume is allowed
        // - wrong PIN is a hard stop
        // - new joins for the same current-game team name are rejected
        if (currentGameNameMatches.length > 0) {
          const currentGameRequestedMatch = requestedTeamId
            ? currentGameNameMatches.find(
                (candidate) => candidate.id === requestedTeamId
              ) ?? null
            : null;

          const currentGameDeviceMatch =
            currentDeviceSession &&
            currentGameNameMatches.find(
              (candidate) => candidate.id === currentDeviceSession.teamId
            )
              ? currentDeviceSession.team
              : null;

          const exactCurrentGamePinMatch =
            pin !== null
              ? currentGameNameMatches.find(
                  (candidate) => candidate.pin === pin
                ) ?? null
              : null;

          const hasProtectedCurrentGameVersion = currentGameNameMatches.some(
            (candidate) => !!candidate.pin
          );

          if (hasProtectedCurrentGameVersion && !exactCurrentGamePinMatch) {
            return fail(
              400,
              'Incorrect PIN for this team.',
              'PIN_INVALID'
            );
          }

          if (
            currentDeviceMatchExists(currentGameDeviceMatch, teamNameKey)
          ) {
            team = currentGameDeviceMatch;
          } else if (currentGameRequestedMatch && currentDeviceSession?.teamId === currentGameRequestedMatch.id) {
            team = currentGameRequestedMatch;
          } else {
            return fail(
              409,
              'This team is already in the game. Resume it on the original device or ask the host to transfer it.',
              'TEAM_ALREADY_IN_GAME'
            );
          }
        }

        // No current-game team with this name yet. Reuse an existing selected/site team if valid.
        if (!team && requestedTeamId) {
          const teamById = await tx.team.findUnique({
            where: { id: requestedTeamId },
            select: {
              id: true,
              name: true,
              pin: true,
            },
          });

          if (!teamById) {
            return fail(
              404,
              'Selected team could not be found.',
              'TEAM_NOT_FOUND'
            );
          }

          if (normalizeTeamNameKey(teamById.name) !== teamNameKey) {
            return fail(
              400,
              'Selected team does not match the entered team name.',
              'TEAM_NAME_MISMATCH'
            );
          }

          if (teamById.pin && teamById.pin !== pin) {
            return fail(
              400,
              'Incorrect PIN for this team.',
              'PIN_INVALID'
            );
          }

          team = teamById;
        }

        if (!team) {
          const exactSitePinMatch =
            pin !== null
              ? siteNameMatches.find((candidate) => candidate.pin === pin) ??
                null
              : null;

          const unprotectedSiteMatch =
            siteNameMatches.find((candidate) => !candidate.pin) ?? null;

          const hasProtectedSiteVersion = siteNameMatches.some(
            (candidate) => !!candidate.pin
          );

          if (exactSitePinMatch) {
            team = exactSitePinMatch;
          } else if (hasProtectedSiteVersion) {
            return fail(
              400,
              'Incorrect PIN for this team.',
              'PIN_INVALID'
            );
          } else if (unprotectedSiteMatch) {
            team = unprotectedSiteMatch;
          } else {
            team = await tx.team.create({
              data: pin
                ? {
                    name: teamName,
                    pin,
                  }
                : {
                    name: teamName,
                  },
              select: {
                id: true,
                name: true,
                pin: true,
              },
            });
          }
        }

        if (!team) {
          return fail(
            500,
            'Failed to resolve a team for this join request.',
            'TEAM_RESOLUTION_FAILED'
          );
        }

        const isSwitchingTeams =
          Boolean(currentDeviceSession) && currentDeviceSession!.teamId !== team.id;

        if (isSwitchingTeams) {
          const canSwitchExistingDeviceTeam =
            game.status === 'SCHEDULED' &&
            currentDeviceTeamGame !== null &&
            currentDeviceTeamGame.totalPts === 0 &&
            currentDeviceTeamGame._count.answers === 0;

          if (!canSwitchExistingDeviceTeam) {
            return fail(
              409,
              `This device is already joined as "${currentDeviceSession!.team.name}". Resume that team instead.`,
              'DEVICE_ALREADY_JOINED'
            );
          }
        }

        const teamGame = await tx.teamGame.upsert({
          where: {
            teamId_gameId: {
              teamId: team.id,
              gameId,
            },
          },
          update: {},
          create: {
            teamId: team.id,
            gameId,
            siteId,
          },
          select: {
            id: true,
            sessionControlMode: true,
          },
        });

        if (teamGame.sessionControlMode === 'LOCKED') {
          return fail(
            423,
            'This team has been locked by the host for this game.',
            'TEAM_LOCKED'
          );
        }

        if (teamGame.sessionControlMode === 'HOST_APPROVAL') {
          await tx.teamGame.update({
            where: {
              teamId_gameId: {
                teamId: team.id,
                gameId,
              },
            },
            data: {
              pendingApprovalRequestedAt: now,
              pendingApprovalDeviceId: deviceId,
            },
          });

          return fail(
            403,
            'This team requires host approval before joining.',
            'HOST_APPROVAL_REQUIRED'
          );
        }

        await tx.teamGameSession.updateMany({
          where: {
            gameId,
            teamId: team.id,
            status: {
              not: TeamGameSessionStatus.CLOSED,
            },
            expiresAt: {
              lte: now,
            },
          },
          data: {
            status: TeamGameSessionStatus.CLOSED,
            socketId: null,
            disconnectedAt: now,
            lastSeenAt: now,
          },
        });

        const existingSession = await tx.teamGameSession.findFirst({
          where: {
            gameId,
            teamId: team.id,
            status: {
              in: [...ACTIVE_SESSION_STATUSES],
            },
            expiresAt: {
              gt: now,
            },
          },
          orderBy: [{ lastSeenAt: 'desc' }, { joinedAt: 'desc' }],
        });

        if (existingSession && existingSession.deviceId !== deviceId) {
          return fail(
            409,
            'This team is already claimed on another device for this game.',
            'TEAM_ALREADY_CLAIMED'
          );
        }

        if (isSwitchingTeams) {
          await tx.teamGameSession.updateMany({
            where: {
              gameId,
              deviceId,
              teamId: {
                not: team.id,
              },
              status: {
                in: [...ACTIVE_SESSION_STATUSES],
              },
              expiresAt: {
                gt: now,
              },
            },
            data: {
              status: TeamGameSessionStatus.CLOSED,
              socketId: null,
              disconnectedAt: now,
              lastSeenAt: now,
            },
          });
        }

        const sessionToken = randomUUID();

        const session = existingSession
          ? await tx.teamGameSession.update({
              where: { id: existingSession.id },
              data: {
                sessionToken,
                status: TeamGameSessionStatus.ACTIVE,
                socketId: null,
                lastSeenAt: now,
                disconnectedAt: null,
                expiresAt,
              },
            })
          : await tx.teamGameSession.create({
              data: {
                gameId,
                teamId: team.id,
                sessionToken,
                deviceId,
                status: TeamGameSessionStatus.ACTIVE,
                socketId: null,
                lastSeenAt: now,
                disconnectedAt: null,
                expiresAt,
              },
            });

        return {
          ok: true,
          team,
          session,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
        },
        { status: result.status }
      );
    }

    const route =
      game.status === 'LIVE'
        ? `/games/${gameId}/play`
        : `/games/${gameId}/lobby`;

    return NextResponse.json({
      ok: true,
      teamId: result.team.id,
      teamName: result.team.name,
      gameId,
      gameStatus: game.status,
      route,
      redirectTo: route,
      session: {
        sessionToken: result.session.sessionToken,
        deviceId: result.session.deviceId,
        status: result.session.status,
        joinedAt: result.session.joinedAt.toISOString(),
        lastSeenAt: result.session.lastSeenAt.toISOString(),
        expiresAt: result.session.expiresAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error joining game', {
        code: error.code,
        meta: error.meta,
        message,
        stack,
      });

      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            error:
              'A team record conflict occurred while joining. Try selecting the team again without changing its name or PIN.',
            code: 'TEAM_CONFLICT',
          },
          { status: 409 }
        );
      }
    }

    console.error('Error joining game', {
      message,
      stack,
    });

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? `Failed to join game: ${message}`
            : 'Failed to join game.',
        code: 'JOIN_FAILED',
      },
      { status: 500 }
    );
  }
}

function currentDeviceMatchExists(
  team: TeamSummary | null,
  teamNameKey: string
): team is TeamSummary {
  return !!team && normalizeTeamNameKey(team.name) === teamNameKey;
}