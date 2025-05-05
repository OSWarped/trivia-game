// File: /app/api/games/[gameId]/join/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { teamName, pin } = await req.json();

  if (!teamName || !pin) {
    return NextResponse.json({ error: 'Team name and PIN are required' }, { status: 400 });
  }

  // Fetch game with event and site info
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { event: { select: { siteId: true } } },
  });

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const eventId = game.eventId;
  const siteId = game.siteId ?? game.event?.siteId;

  if (!siteId) {
    return NextResponse.json({ error: 'Game is missing siteId, and event has no siteId either.' }, { status: 400 });
  }

  // Find or create team
  let team = await prisma.team.findFirst({
    where: { name: teamName, pin },
  });

  if (!team) {
    team = await prisma.team.create({
      data: { name: teamName, pin },
    });
  }

  // Ensure TeamEvent exists
  await prisma.teamEvent.upsert({
    where: {
      eventId_teamId: {
        eventId,
        teamId: team.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      eventId,
      teamName: team.name,
    },
  });

  // Ensure TeamGame exists
  await prisma.teamGame.upsert({
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

  return NextResponse.json({
    teamId: team.id,
    gameId,
    gameStatus: game.status, // ✅ This is what the client logic checks
    redirectTo: game.status === 'LIVE'
  ? `/game/${gameId}`
  : `/games/${gameId}/lobby`,
  });
}
