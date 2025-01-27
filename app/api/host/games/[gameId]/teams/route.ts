import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Retrieve all teams for a specific game
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  try {
    const teamGames = await prisma.teamGame.findMany({
      where: {
        gameId, // Filter by the gameId
      },
      include: {
        team: true, // Include the details of the associated team
      },
    });
    
    // Extract the teams from the teamGames result
    const teams = teamGames.map((teamGame) => teamGame.team);
    

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST: Add a new team to a specific game
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { teamId } = await req.json();

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }

  try {
    // Step 1: Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Step 2: Check if the TeamGame relationship already exists
    const existingTeamGame = await prisma.teamGame.findFirst({
      where: {
        gameId,
        teamId,
      },
    });

    if (!existingTeamGame) {
      // Step 3: Add the team to the game if it doesn't already exist
      await prisma.teamGame.create({
        data: {
          gameId,
          teamId,
        },
      });
    }

    // Step 4: Update GameState if the game has already started
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
    });

    if (gameState) {
      // Update pointsRemaining for the new team
      const pointsRemaining = gameState.pointsRemaining as Record<string, number[]> || {};

      // Use the current round's point pool if available
      const currentRound = await prisma.round.findUnique({
        where: { id: gameState.currentRoundId || undefined },
      });

      pointsRemaining[teamId] = currentRound?.pointPool || [];
      await prisma.gameState.update({
        where: { gameId },
        data: { pointsRemaining },
      });
    }

    return NextResponse.json({ message: 'Team added successfully', team });
  } catch (error) {
    console.error('Error adding team to game:', error);
    return NextResponse.json({ error: 'Failed to add team to game' }, { status: 500 });
  }
}
