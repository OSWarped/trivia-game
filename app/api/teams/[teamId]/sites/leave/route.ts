import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params;
    const { siteId } = await req.json();

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    // Check if the team is a member of the hosting site
    const existingMembership = await prisma.teamHostingSite.findFirst({
      where: { teamId, hostingSiteId: siteId },
    });

    if (!existingMembership) {
      return NextResponse.json({ error: 'Team is not a member of this site' }, { status: 400 });
    }

    // Remove the team from the hosting site
    await prisma.teamHostingSite.delete({
      where: { id: existingMembership.id },
    });

    return NextResponse.json({ message: 'Team successfully left the site' });
  } catch (error) {
    console.error('Error leaving hosting site:', error);
    return NextResponse.json({ error: 'Failed to leave hosting site' }, { status: 500 });
  }
}
