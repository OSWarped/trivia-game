import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
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
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (err) {
    console.error(
      'Failed to load season:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json(
      { error: 'Failed to load season' },
      { status: 500 },
    );
  }
}

/* ── PATCH : rename or toggle active ─────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    active?: boolean;
  };

  const trimmedName = body.name?.trim();

  if (body.name !== undefined && !trimmedName) {
    return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.season.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    let updated;

    if (body.active === true) {
      [, updated] = await prisma.$transaction([
        prisma.season.updateMany({
          where: {
            eventId: existing.eventId,
            NOT: { id },
          },
          data: {
            active: false,
          },
        }),
        prisma.season.update({
          where: { id },
          data: {
            ...(trimmedName !== undefined ? { name: trimmedName } : {}),
            active: true,
          },
        }),
      ]);
    } else {
      updated = await prisma.season.update({
        where: { id },
        data: {
          ...(trimmedName !== undefined ? { name: trimmedName } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
        select: {
          id: true,
          name: true,
          active: true,
          startsAt: true,
          endsAt: true,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(
      'Failed to patch season:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json(
      { error: 'Failed to patch season' },
      { status: 500 },
    );
  }
}

/* ── DELETE : remove season only when no games exist ─────────── */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const season = await prisma.season.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            games: true,
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    if (season._count.games > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete a season that still has games. Delete or move the games first.',
        },
        { status: 409 },
      );
    }

    await prisma.season.delete({
      where: { id },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2003') {
        return NextResponse.json(
          {
            error: 'Cannot delete this season because other records still depend on it.',
          },
          { status: 409 },
        );
      }

      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Season not found' }, { status: 404 });
      }
    }

    console.error(
      'Failed to delete season:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json(
      { error: 'Failed to delete season' },
      { status: 500 },
    );
  }
}