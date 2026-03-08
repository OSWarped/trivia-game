// File: /app/api/games/[gameId]/resume/route.ts

import { NextResponse } from 'next/server';
import {
  PrismaClient,
  TeamGameSessionStatus,
  TeamGameSessionControlMode,
} from '@prisma/client';

const prisma = new PrismaClient();

const RESUMABLE_GAME_STATUSES = new Set(['SCHEDULED', 'LIVE']);
const SESSION_DURATION_HOURS = 12;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

    const bodyGameId = normalizeString(body.gameId);
    const teamId = normalizeString(body.teamId);
    const sessionToken = normalizeString(body.sessionToken);
    const deviceId = normalizeString(body.deviceId);

    if (bodyGameId && bodyGameId !== gameId) {
      return NextResponse.json(
        {
          ok: false,
          code: 'GAME_MISMATCH',
          error: 'Resume request does not match the current game.',
          clearStoredSession: true,
        },
        { status: 400 }
      );
    }

    if (!teamId || !sessionToken || !deviceId) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          error: 'teamId, sessionToken, and deviceId are required.',
          clearStoredSession: false,
        },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        {
          ok: false,
          code: 'GAME_NOT_FOUND',
          error: 'Game not found.',
          clearStoredSession: true,
        },
        { status: 404 }
      );
    }

    if (!RESUMABLE_GAME_STATUSES.has(game.status)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'GAME_NOT_RESUMABLE',
          error: 'This game is not currently resumable.',
          clearStoredSession: true,
          redirectTo: `/join/${game.joinCode}`,
        },
        { status: 400 }
      );
    }

    const teamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
      select: {
        sessionControlMode: true,
      },
    });

    if (teamGame?.sessionControlMode === TeamGameSessionControlMode.LOCKED) {
      return NextResponse.json(
        {
          ok: false,
          code: 'TEAM_LOCKED',
          error: 'This team has been locked by the host for this game.',
          clearStoredSession: false,
        },
        { status: 423 }
      );
    }

    const existingSession = await prisma.teamGameSession.findFirst({
      where: {
        gameId,
        teamId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (!existingSession) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SESSION_NOT_FOUND',
          error: 'No saved session was found for this team in this game.',
          clearStoredSession: true,
        },
        { status: 404 }
      );
    }

    if (existingSession.sessionToken !== sessionToken) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SESSION_NOT_FOUND',
          error: 'This saved session is no longer valid.',
          clearStoredSession: true,
        },
        { status: 401 }
      );
    }

    if (existingSession.deviceId !== deviceId) {
      return NextResponse.json(
        {
          ok: false,
          code: 'DEVICE_MISMATCH',
          error: 'This team session belongs to a different device.',
          clearStoredSession: true,
        },
        { status: 409 }
      );
    }

    if (existingSession.status === TeamGameSessionStatus.CLOSED) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SESSION_CLOSED',
          error: 'This session has been closed and cannot be resumed.',
          clearStoredSession: true,
        },
        { status: 410 }
      );
    }

    const now = new Date();

    if (existingSession.expiresAt <= now) {
      await prisma.teamGameSession.update({
        where: { id: existingSession.id },
        data: {
          status: TeamGameSessionStatus.CLOSED,
          socketId: null,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          code: 'SESSION_EXPIRED',
          error: 'This session has expired. Please join the game again.',
          clearStoredSession: true,
        },
        { status: 410 }
      );
    }

    const refreshedExpiresAt = buildSessionExpiry(now);

    const resumedSession = await prisma.teamGameSession.update({
      where: { id: existingSession.id },
      data: {
        status: TeamGameSessionStatus.ACTIVE,
        socketId: null,
        lastSeenAt: now,
        disconnectedAt: null,
        expiresAt: refreshedExpiresAt,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const route =
      game.status === 'LIVE'
        ? `/games/${gameId}/play`
        : `/games/${gameId}/lobby`;

    return NextResponse.json({
      ok: true,
      gameId,
      teamId: resumedSession.team.id,
      teamName: resumedSession.team.name,
      gameStatus: game.status,
      route,
      redirectTo: route,
      session: {
        sessionToken: resumedSession.sessionToken,
        deviceId: resumedSession.deviceId,
        status: resumedSession.status,
        joinedAt: resumedSession.joinedAt.toISOString(),
        lastSeenAt: resumedSession.lastSeenAt.toISOString(),
        expiresAt: resumedSession.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error resuming game session:', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Failed to resume session.',
        clearStoredSession: false,
      },
      { status: 500 }
    );
  }
}