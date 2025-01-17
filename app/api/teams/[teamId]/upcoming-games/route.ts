import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;

    // Fetch sites the team belongs to
    const teamSites = await prisma.teamHostingSite.findMany({
      where: { teamId },
      select: { hostingSiteId: true },
    });

    const siteIds = teamSites.map((site) => site.hostingSiteId);
    console.log('Team Hosting Sites:', teamSites);

    // Fetch upcoming games for these sites
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Ensure today's date is UTC midnight

    const upcomingGames = await prisma.game.findMany({
      where: {
        hostingSiteId: { in: siteIds }, // Filter by hosting sites
        date: { gte: today }, // Filter for games occurring today or later
      },
      include: {
        hostingSite: true, // Include hosting site details
        teamGames: {
          include: {
            team: true, // Include team details through the TeamGame relation
          },
        },
      },
      orderBy: { date: 'asc' }, // Sort games by date in ascending order
    });
    
    return NextResponse.json(upcomingGames);
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming games' },
      { status: 500 }
    );
  }
}
