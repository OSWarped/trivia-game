import { PrismaClient } from '@prisma/client';
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch game state to check if scores are visible
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
      select: { scoresVisibleToPlayers: true },
    });

    if (!gameState) {
      return NextResponse.json(
        { error: "Game state not found" },
        { status: 404 }
      );
    }

    // If scores are not visible, return a 403 response
    if (!gameState.scoresVisibleToPlayers) {
      return NextResponse.json(
        { error: "Scores are not visible at this time" },
        { status: 403 }
      );
    }

    // Fetch teams and dynamically calculate scores
    const teams = await prisma.team.findMany({
      where: {
        teamGames: {
          some: {
            gameId, // Filter teams associated with the specific gameId
          },
        },
      },
      select: {
        id: true,
        name: true,
        answers: {
          select: {
            pointsAwarded: true,
          },
        },
        subQuestionAnswers: {
          select: {
            pointsAwarded: true,
          },
        },
      },
    });

    // Calculate the total score for each team
    const teamsWithScores = teams.map((team) => {
      const totalAnswerScore = team.answers.reduce(
        (sum, answer) => sum + (answer.pointsAwarded || 0),
        0
      );

      const totalSubAnswerScore = team.subQuestionAnswers.reduce(
        (sum, subAnswer) => sum + (subAnswer.pointsAwarded || 0),
        0
      );

      const totalScore = totalAnswerScore + totalSubAnswerScore;

      return {
        id: team.id,
        name: team.name,
        score: totalScore,
      };
    });

    // Sort teams by their scores in descending order
    teamsWithScores.sort((a, b) => b.score - a.score);

    return NextResponse.json({ teams: teamsWithScores, scoresVisibleToPlayers: true });
  } catch (error) {
    console.error("Error fetching scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
