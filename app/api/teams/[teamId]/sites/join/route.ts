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

    // Check if the team is already a member of the hosting site
    const existingMembership = await prisma.teamHostingSite.findFirst({
      where: { teamId, hostingSiteId: siteId },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'Team is already a member of this site' }, { status: 400 });
    }

    // Add the team to the hosting site
    const membership = await prisma.teamHostingSite.create({
      data: { teamId, hostingSiteId: siteId },
    });

    return NextResponse.json({
      message: 'Team successfully joined the site',
      membership,
    });
  } catch (error) {
    console.error('Error joining hosting site:', error);
    return NextResponse.json({ error: 'Failed to join hosting site' }, { status: 500 });
  }
}
