import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing game id' }, { status: 400 });
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            event: {
              include: {
                site: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gameState: true,
        rounds: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            roundType: true,
            pointSystem: true,
            maxPoints: true,
            pointValue: true,
            pointPool: true,
            timeLimit: true,
            wagerLimit: true,
            sortOrder: true,
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
        teamGames: {
          include: {
            team: true,
          },
          orderBy: [
            { rank: 'asc' },
            { totalPts: 'desc' },
          ],
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error(
      'Error fetching game:',
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = (await req.json()) as {
    title?: string;
    scheduledFor?: string | null;
    hostId?: string | null;
    special?: boolean;
    tag?: string | null;
    status?: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'CLOSED' | 'CANCELED';
  };

  const title = body.title?.trim();
  const tag = body.tag?.trim() || null;

  if (!title) {
    return NextResponse.json({ error: 'Game title is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const updated = await prisma.game.update({
      where: { id },
      data: {
        title,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        hostId: body.hostId || null,
        special: body.special ?? false,
        tag: body.special ? tag : null,
        status: body.status ?? 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        joinCode: true,
        special: true,
        tag: true,
        status: true,
        scheduledFor: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                name: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      'Error updating game:',
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}