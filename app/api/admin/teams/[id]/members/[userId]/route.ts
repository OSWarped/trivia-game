import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;

  try {
    const team = await prisma.team.update({
      where: { id },
      data: {
        players: {
          disconnect: { id: userId },
        },
      },
    });

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
