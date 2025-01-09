import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const body = await req.json();
  const { teamId, questionId, answer, pointsUsed } = body;

  if (!teamId || !questionId || !answer) {
    return NextResponse.json(
      { error: 'Missing required fields: teamId, questionId, or answer' },
      { status: 400 }
    );
  }

  try {
    // Fetch the game state
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
    });

    if (!gameState) {
      return NextResponse.json(
        { error: 'Game state not found for this game' },
        { status: 404 }
      );
    }

    // Fetch the current round and question
const [currentRound, currentQuestion] = await Promise.all([
  gameState.currentRoundId
    ? prisma.round.findUnique({ where: { id: gameState.currentRoundId } })
    : null,
  gameState.currentQuestionId
    ? prisma.question.findUnique({ where: { id: gameState.currentQuestionId } })
    : null,
]);

if (!currentRound || !currentQuestion) {
  return NextResponse.json(
    { error: 'Current round or question not found' },
    { status: 404 }
  );
}

    // Handle point validation based on the point system
    if (currentRound.pointSystem === 'POOL') {
      // Fetch the team and validate the remaining points
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      if (!team.remainingPoints.includes(pointsUsed)) {
        return NextResponse.json(
          { error: 'Invalid point value selected for this team' },
          { status: 400 }
        );
      }

      // Remove the used point from the team's remainingPoints
      const updatedPoints = team.remainingPoints.filter((p) => p !== pointsUsed);

      // Update the team's remaining points
      await prisma.team.update({
        where: { id: teamId },
        data: { remainingPoints: updatedPoints },
      });
    } else if (currentRound.pointSystem === 'FLAT') {
      // For FLAT point system, pointsUsed must match the flat point value of the round
      if (pointsUsed !== currentRound.pointValue) {
        return NextResponse.json(
          { error: `Points used must be ${currentRound.pointValue} for this round` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid point system for the current round' },
        { status: 400 }
      );
    }

    // Submit the answer
    const submittedAnswer = await prisma.answer.create({
      data: {
        team: { connect: { id: teamId } },
        question: { connect: { id: questionId } },
        answer: answer,
        pointsUsed: pointsUsed,
        isCorrect: false, // Default value
        pointsAwarded: 0, // Default value
      },
    });

    // Optionally update game state if necessary
    await prisma.gameState.update({
      where: { gameId },
      data: {
        updatedAt: new Date(), // Update the timestamp for tracking changes
      },
    });

    return NextResponse.json({
      message: 'Answer submitted successfully',
      submittedAnswer,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
