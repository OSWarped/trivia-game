import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const { name } = await req.json();

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { name },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team details:', error);
    return NextResponse.json({ error: 'Failed to update team details' }, { status: 500 });
  }
}
