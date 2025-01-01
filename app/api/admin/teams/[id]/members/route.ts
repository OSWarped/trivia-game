import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: true,
        captain: true,
        game: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: teamId } = await params;
    const { userId } = await req.json();
  
    try {
      if (!teamId || !userId) {
        return NextResponse.json({ error: 'Team ID and User ID are required' }, { status: 400 });
      }
  
      // Check if user is already part of the team
      const existingMember = await prisma.team.findFirst({
        where: {
          id: teamId,
          players: {
            some: { id: userId },
          },
        },
      });
  
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of the team' }, { status: 400 });
      }
  
      // Add user to the team
      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: {
          players: {
            connect: { id: userId },
          },
        },
        include: { players: true },
      });
  
      return NextResponse.json(updatedTeam, { status: 200 });
    } catch (error) {
      console.error('Error adding user to team:', error);
      return NextResponse.json({ error: 'Failed to add user to team' }, { status: 500 });
    }
  }