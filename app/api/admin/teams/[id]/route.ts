import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { name, captainId } = await req.json();

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name,
        captainId,
      },
    });

    return NextResponse.json(updatedTeam, { status: 200 });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ message: 'Team deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
