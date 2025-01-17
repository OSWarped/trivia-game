import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string } >}) {
  try {
    const { teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        TeamJoinRequest: {
          include: {
            user: {
              select: {
                id: true,
                name: true, // Fetch user ID and name from User model
              },
            },
          },
        },
        teamGames: {
          include: {
            game: {
              select: {
                id: true,
                name: true,
                date: true,
              },
            },
          },
        },
        hostingSites: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });
    
      

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const result = {
        id: team.id,
        name: team.name,
        games: team.teamGames,
        hostingSites: team.hostingSites,
        members: team.memberships.map((membership) => ({
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
        })),
        joinRequests: team.TeamJoinRequest.map((request) => ({
          id: request.id,
          userId: request.user.id, // Fetch userId from the User model
          userName: request.user.name, // Fetch userName from the User model
          status: request.status,
        })),
      };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching team details:', error);
    return NextResponse.json({ error: 'Failed to fetch team details' }, { status: 500 });
  }
}
