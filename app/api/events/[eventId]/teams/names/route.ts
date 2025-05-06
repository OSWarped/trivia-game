// /app/api/events/[eventId]/teams/names/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ eventId: string }> }
  ) {
  const { eventId } = await params;

  const teamEvents = await prisma.teamEvent.findMany({
    where: { eventId },
    select: { teamName: true },
    orderBy: { teamName: 'asc' },
  });

  const names = teamEvents.map((te) => te.teamName);
  return NextResponse.json(names);
}
