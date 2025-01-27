import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const body = await req.json();
  const { teamId, questionId, answer, pointsUsed, subAnswers } = body;

  if (!teamId || !questionId || (!answer && !subAnswers)) {
    return NextResponse.json(
      { error: 'Missing required fields: teamId, questionId, or answer/subAnswers' },
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

    // Parse the pointsRemaining from gameState
    const pointsRemaining = gameState.pointsRemaining as Record<string, number[]>;

    if (!pointsRemaining || !pointsRemaining[teamId]) {
      return NextResponse.json(
        { error: 'Team points not found in the game state' },
        { status: 404 }
      );
    }

    // Fetch the current round and question
    const [currentRound, currentQuestion] = await Promise.all([
      gameState.currentRoundId
        ? prisma.round.findUnique({ where: { id: gameState.currentRoundId } })
        : null,
      gameState.currentQuestionId
        ? prisma.question.findUnique({
            where: { id: gameState.currentQuestionId },
            include: { subquestions: true }, // Include subquestions for validation
          })
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
      // Validate the remaining points for the team
      if (!pointsRemaining[teamId].includes(pointsUsed)) {
        return NextResponse.json(
          { error: 'Invalid point value selected for this team' },
          { status: 400 }
        );
      }

      // Remove the used point from the team's remainingPoints
      const updatedPoints = pointsRemaining[teamId].filter((p) => p !== pointsUsed);

      // Update the game's pointsRemaining field
      await prisma.gameState.update({
        where: { gameId },
        data: {
          pointsRemaining: {
            ...pointsRemaining,
            [teamId]: updatedPoints,
          },
        },
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

    // Handle submission for questions with subquestions
    if (currentQuestion.subquestions?.length && subAnswers) {
      const submittedSubAnswers = subAnswers.map((sub: { subquestionId: string; answer: string; }) => ({
        subquestionId: sub.subquestionId,
        teamId,
        answer: sub.answer,
        isCorrect: null, // Default value
        pointsAwarded: 0, // Default value
      }));

      // Save subanswers to the database
      const savedSubAnswers = await prisma.subQuestionAnswer.createMany({
        data: submittedSubAnswers,
      });

      // Update game state timestamp
      await prisma.gameState.update({
        where: { gameId },
        data: {
          updatedAt: new Date(), // Update the timestamp for tracking changes
        },
      });

      return NextResponse.json({
        message: 'Subanswers submitted successfully',
        submittedSubAnswers: savedSubAnswers,
      });
    }

    // Handle submission for single-answer questions
    if (answer) {
      const submittedAnswer = await prisma.answer.create({
        data: {
          team: { connect: { id: teamId } },
          question: { connect: { id: questionId } },
          answer: answer,
          pointsUsed: pointsUsed,
          isCorrect: null, // Default value
          pointsAwarded: 0, // Default value
        },
      });

      // Update game state timestamp
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
    }

    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
