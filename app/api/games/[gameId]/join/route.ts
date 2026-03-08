// File: /app/api/games/[gameId]/join/route.ts

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  PrismaClient,
  Team,
  TeamGameSessionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const JOINABLE_STATUSES = new Set(['SCHEDULED', 'LIVE']);
const SESSION_DURATION_HOURS = 12;

function normalizeTeamName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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
      let team: Team | null = null;

      if (requestedTeamId) {
        const teamById = await tx.team.findUnique({
          where: { id: requestedTeamId },
        });

        if (teamById) {
          const sameName =
            teamById.name.trim().toLowerCase() === teamName.toLowerCase();

          if (!sameName) {
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

          if (!teamById.pin && pin) {
            team = await tx.team.update({
              where: { id: teamById.id },
              data: { pin },
            });
          } else {
            team = teamById;
          }
        }
      }

      if (!team) {
        const existingTeams = await tx.team.findMany({
          where: {
            name: {
              equals: teamName,
              mode: 'insensitive',
            },
          },
        });

        const exactPinMatch =
          pin !== null
            ? existingTeams.find((existingTeam) => existingTeam.pin === pin) ??
            null
            : null;

        const unprotectedTeam =
          existingTeams.find((existingTeam) => !existingTeam.pin) ?? null;

        const hasProtectedVersion = existingTeams.some(
          (existingTeam) => !!existingTeam.pin
        );

        if (exactPinMatch) {
          team = exactPinMatch;
        } else if (hasProtectedVersion) {
          return {
            error: 'This team name is protected. Enter the correct PIN.',
            status: 400,
          } as const;
        } else if (unprotectedTeam) {
          if (pin) {
            team = await tx.team.update({
              where: { id: unprotectedTeam.id },
              data: { pin },
            });
          } else {
            team = unprotectedTeam;
          }
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
          });
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
      });

      if (teamGame.sessionControlMode === 'LOCKED') {
        return {
          error: 'This team has been locked by the host for this game.',
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
        orderBy: {
          joinedAt: 'desc',
        },
      });

      if (existingSession && existingSession.deviceId !== deviceId) {
        return {
          error:
            'This team is already claimed on another device for this game.',
          status: 409,
        } as const;
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
        { error: result.error },
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

    console.error('Error joining game', {
      message,
      stack,
    });

    return NextResponse.json(
      { error: 'Failed to join game.' },
      { status: 500 }
    );
  }
}