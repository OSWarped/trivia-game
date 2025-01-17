import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params; // Await the params as a Promise
    console.log('Fetching hosting sites for team:', teamId);

    // Fetch all hosting sites
    const hostingSites = await prisma.hostingSite.findMany({
      include: {
        TeamHostingSite: {
          where: { teamId },
        },
      },
    });

    // Map hosting sites to include the "joined" status
    const siteData = hostingSites.map((site) => {
      const isJoined = site.TeamHostingSite.some((ths) => ths.teamId === teamId);
      return {
        id: site.id,
        name: site.name,
        location: site.location,
        joined: isJoined,
      };
    });

    return NextResponse.json(siteData);
  } catch (error) {
    console.error('Error fetching hosting sites:', error);
    return NextResponse.json({ error: 'Failed to fetch hosting sites' }, { status: 500 });
  }
}
