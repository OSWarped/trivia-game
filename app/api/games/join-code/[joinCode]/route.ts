// File: /app/api/games/join-code/[joinCode]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;

  const game = await prisma.game.findFirst({
    where: { joinCode },
    include: {
      event: {
        include: {
          site: {
            select: {
              id: true,
              name: true,
              address: true, // optional: if you want to show it
            },
          },
        },
      },
    },
  });
  

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  console.log('GAME OBJECT RETURNED: ' + JSON.stringify(game));
  return NextResponse.json({
    id: game.id,
    title: game.title,
    status: game.status,
    eventId: game.eventId,
    scheduledFor: game.scheduledFor,
    hostingSite: game.event?.site ?? null,
  });
}
