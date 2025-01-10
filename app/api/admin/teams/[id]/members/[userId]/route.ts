import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: teamId, userId } = await params;

  try {
    // Remove the entry from the TeamMembership table
    const membership = await prisma.teamMembership.deleteMany({
      where: {
        teamId,
        userId,
      },
    });

    if (membership.count === 0) {
      return NextResponse.json(
        { error: 'No membership found for the given team and user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Team member removed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
