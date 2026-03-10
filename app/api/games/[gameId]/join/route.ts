// File: /app/api/games/[gameId]/join/route.ts

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

// function canRepurposeCurrentDeviceTeam(args: {
//   gameStatus: string;
//   currentTeamGame:
//   | {
//     totalPts: number;
//     _count: { answers: number };
//   }
//   | null;
//   currentTeamHasPin: boolean;
//   currentTeamGameCount: number;
// }): boolean {
//   const { gameStatus, currentTeamGame, currentTeamHasPin, currentTeamGameCount } =
//     args;

//   if (gameStatus !== 'SCHEDULED') return false;
//   if (!currentTeamGame) return false;
//   if (currentTeamHasPin) return false;
//   if (currentTeamGameCount > 1) return false;
//   if (currentTeamGame.totalPts > 0) return false;
//   if (currentTeamGame._count.answers > 0) return false;

//   return true;
// }

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
        { error: 'Team name is required.' },
        { status: 400 }
      );
    }

    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits when provided.' },
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
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    if (!JOINABLE_STATUSES.has(game.status)) {
      return NextResponse.json(
        { error: 'This game is not open for joining.' },
        { status: 400 }
      );
    }

    const siteId = game.siteId;

    if (!siteId) {
      return NextResponse.json(
        { error: 'Game is missing site information.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = buildSessionExpiry(now);

    const result = await prisma.$transaction(async (tx) => {
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
        },
      });

      const currentDeviceSession = await tx.teamGameSession.findFirst({
        where: {
          gameId,
          deviceId,
          status: {
            in: [
              TeamGameSessionStatus.ACTIVE,
              TeamGameSessionStatus.RECONNECTING,
              TeamGameSessionStatus.OFFLINE,
            ],
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

      // const currentDeviceTeamGameCount = currentDeviceSession
      //   ? await tx.teamGame.count({
      //     where: {
      //       teamId: currentDeviceSession.teamId,
      //     },
      //   })
      //   : 0;

      const exactGlobalTeamMatch =
        pin !== null
          ? await tx.team.findFirst({
            where: {
              pin,
              name: {
                equals: teamName,
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
              name: true,
              pin: true,
            },
          })
          : null;

      const globalNameMatches = await tx.team.findMany({
        where: {
          name: {
            equals: teamName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          pin: true,
        },
      });

      const siteTeamGames = await tx.teamGame.findMany({
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

      const siteTeamsById = new Map<
        string,
        {
          id: string;
          name: string;
          pin: string | null;
        }
      >();

      for (const row of siteTeamGames) {
        siteTeamsById.set(row.team.id, row.team);
      }

      // const matchingSiteTeams = Array.from(siteTeamsById.values()).filter(
      //   (candidate) => normalizeTeamNameKey(candidate.name) === teamNameKey
      // );

      let team:
        | {
          id: string;
          name: string;
          pin: string | null;
        }
        | null = null;

      if (requestedTeamId) {
        const teamById = await tx.team.findUnique({
          where: { id: requestedTeamId },
          select: {
            id: true,
            name: true,
            pin: true,
          },
        });

        if (!teamById) {
          return {
            error: 'Selected team could not be found.',
            status: 404,
          } as const;
        }

        if (normalizeTeamNameKey(teamById.name) !== teamNameKey) {
          return {
            error: 'Selected team does not match the entered team name.',
            status: 400,
          } as const;
        }

        if (teamById.pin && teamById.pin !== pin) {
          return {
            error: 'This team name is protected. Enter the correct PIN.',
            status: 400,
          } as const;
        }

        team = teamById;
      }

      if (!team && exactGlobalTeamMatch) {
        team = exactGlobalTeamMatch;
      }

      if (!team) {
  const exactPinMatch =
    pin !== null
      ? globalNameMatches.find((candidate) => candidate.pin === pin) ?? null
      : null;

  const currentDeviceTeamMatch =
    currentDeviceSession &&
    globalNameMatches.find(
      (candidate) => candidate.id === currentDeviceSession.teamId
    )
      ? currentDeviceSession.team
      : null;

  const unprotectedTeam =
    globalNameMatches.find((candidate) => !candidate.pin) ?? null;

  const hasProtectedVersion = globalNameMatches.some(
    (candidate) => !!candidate.pin
  );

  if (exactPinMatch) {
    team = exactPinMatch;
  } else if (currentDeviceTeamMatch) {
    team = currentDeviceTeamMatch;
  } else if (hasProtectedVersion) {
    return {
      error: 'This team name is protected. Enter the correct PIN.',
      status: 400,
    } as const;
  } else if (unprotectedTeam) {
    team = unprotectedTeam;
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
        return {
          error: 'Failed to resolve a team for this join request.',
          status: 500,
        } as const;
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
          return {
            error: `This device is already joined as "${currentDeviceSession!.team.name}". Resume that team instead.`,
            code: 'DEVICE_ALREADY_JOINED',
            status: 409,
          } as const;
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
        return {
          error: 'This team has been locked by the host for this game.',
          code: 'TEAM_LOCKED',
          status: 423,
        } as const;
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

        return {
          error: 'This team requires host approval before joining.',
          code: 'HOST_APPROVAL_REQUIRED',
          status: 403,
        } as const;
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
        },
      });

      const existingSession = await tx.teamGameSession.findFirst({
        where: {
          gameId,
          teamId: team.id,
          status: {
            in: [
              TeamGameSessionStatus.ACTIVE,
              TeamGameSessionStatus.RECONNECTING,
              TeamGameSessionStatus.OFFLINE,
            ],
          },
          expiresAt: {
            gt: now,
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }, { joinedAt: 'desc' }],
      });

      if (existingSession && existingSession.deviceId !== deviceId) {
        return {
          error: 'This team is already claimed on another device for this game.',
          status: 409,
        } as const;
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
              in: [
                TeamGameSessionStatus.ACTIVE,
                TeamGameSessionStatus.RECONNECTING,
                TeamGameSessionStatus.OFFLINE,
              ],
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

      return { team, session } as const;
    });

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          code: 'code' in result ? result.code : undefined,
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
    const message =
      error instanceof Error ? error.message : String(error);

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
      },
      { status: 500 }
    );
  }
}