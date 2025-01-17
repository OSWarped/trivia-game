import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { teamId } = await req.json();

    if (!gameId || !teamId) {
      return NextResponse.json(
        { error: 'Game ID and Team ID are required' },
        { status: 400 }
      );
    }

    // Check if the game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if the team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the team is already part of the game
    const existingTeamGame = await prisma.teamGame.findUnique({
      where: {
        teamId_gameId: {
          teamId,
          gameId,
        },
      },
    });

    if (existingTeamGame) {
      return NextResponse.json(
        { error: 'Team is already part of this game' },
        { status: 400 }
      );
    }

    // Add the team to the game
    const newTeamGame = await prisma.teamGame.create({
      data: {
        team: { connect: { id: teamId } },
        game: { connect: { id: gameId } },
      },
    });

    return NextResponse.json(newTeamGame, { status: 201 });
  } catch (error) {
    console.error('Error adding team to game:', error);
    return NextResponse.json(
      { error: 'Failed to add team to game' },
      { status: 500 }
    );
  }
}
