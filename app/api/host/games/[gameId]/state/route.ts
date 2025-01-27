import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Retrieve the current game state
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          include: {
            teamGames: {
              include: {
                team: {
                  include: {
                    memberships: {
                      include: {
                        user: true, // Include user details
                      },
                    },
                  },
                },
              },
            },
            rounds: {
              include: {
                questions: {
                  orderBy: { sortOrder: 'asc' }, // Sort questions by order
                  include: {
                    correctAnswer: true, // Include correctAnswer for each question
                    subquestions: {
                      include: {
                        correctAnswer: true, // Include correctAnswer for each subquestion
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    // Fetch team-specific answers for the current question
    const currentQuestionId = gameState.currentQuestionId;

    const singleAnswers =
      currentQuestionId &&
      (await prisma.answer.findMany({
        where: {
          questionId: currentQuestionId,
        },
        include: {
          question: true, // Include the question details
        },
      }));

    // Ensure singleAnswers is always an object
    const answersByTeam = singleAnswers
      ? singleAnswers.reduce<
          Record<
            string,
            {
              questionId: string;
              questionText: string;
              answer: string;
              isCorrect: boolean | null;
              pointsAwarded: number | null;
              pointsUsed: number | null; // Add pointsUsed field
            }
          >
        >((acc, answer) => {
          acc[answer.teamId] = {
            questionId: answer.questionId,
            questionText: answer.question.text, // Get the question text
            answer: answer.answer,
            isCorrect: answer.isCorrect,
            pointsAwarded: answer.pointsAwarded,
            pointsUsed: answer.pointsUsed ?? null, // Include pointsUsed
          };
          return acc;
        }, {})
      : {};

    const subAnswers =
      currentQuestionId &&
      (await prisma.subQuestionAnswer.findMany({
        where: {
          subquestion: {
            questionId: currentQuestionId,
          },
        },
        include: {
          subquestion: true, // Include subquestion details
        },
      }));

    // Ensure subAnswers is always an array
    const subAnswersByTeam = Array.isArray(subAnswers)
      ? subAnswers.reduce<
          Record<
            string,
            Array<{
              subquestionId: string;
              subquestionText: string;
              answer: string;
              isCorrect: boolean | null; // Allow null explicitly
              pointsAwarded: number;
            }>
          >
        >((acc, subAnswer) => {
          if (!acc[subAnswer.teamId]) acc[subAnswer.teamId] = [];
          acc[subAnswer.teamId].push({
            subquestionId: subAnswer.subquestionId,
            subquestionText: subAnswer.subquestion.text,
            answer: subAnswer.answer,
            isCorrect: subAnswer.isCorrect ?? null, // Set to null if undefined
            pointsAwarded: subAnswer.pointsAwarded ?? 0, // Default to 0
          });
          return acc;
        }, {})
      : {};

    // Enhance the response to include subanswers and single answers
    const enhancedGameState = {
      ...gameState,
      subAnswersByTeam: subAnswersByTeam || {}, // Include team-specific subanswers
      answersByTeam: answersByTeam || {}, // Include team-specific single answers
    };

    console.log('Enhanced GameState:', JSON.stringify(enhancedGameState, null, 2));

    // Return the enhanced game state
    return NextResponse.json(enhancedGameState);
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}



// POST: Submit an answer (only accessible to hosts)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  
  const { gameId } = await params;
  const body = await req.json();
  const { teamId, questionId, answer, pointsUsed } = body;

  if (!teamId || !questionId || !answer || pointsUsed === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: teamId, questionId, answer, or pointsUsed' },
      { status: 400 }
    );
  }

  try {
    const gameState = await prisma.gameState.findUnique({ where: { gameId } });

    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    const currentRoundId = gameState.currentRoundId;

    if (!currentRoundId) {
      return NextResponse.json(
        { error: 'Current round ID is not set' },
        { status: 400 }
      );
    }

    const currentRound = await prisma.round.findUnique({
      where: { id: currentRoundId }, // Now `currentRoundId` is guaranteed to be a string
    });
    if (!currentRound) {
      return NextResponse.json({ error: 'Current round not found' }, { status: 404 });
    }

    // Validate points based on round type
    if (currentRound.pointSystem === 'POOL' && !currentRound.pointPool.includes(pointsUsed)) {
      return NextResponse.json(
        { error: 'Invalid points used for this round' },
        { status: 400 }
      );
    }

    // Submit the answer
    const submittedAnswer = await prisma.answer.create({
      data: {
        teamId,
        questionId,
        answer,
        pointsUsed,
        isCorrect: false, // Default to false until verified
        pointsAwarded: 0, // Default to 0 until scoring is applied
      },
    });

    // Update the round's point pool
    const updatedPool = currentRound.pointPool.filter((p) => p !== pointsUsed);
    await prisma.round.update({
      where: { id: currentRound.id },
      data: { pointPool: updatedPool },
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { isTransitioning, isPrevious } = await req.json();

  try {
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
    });

    if (!gameState) {
      throw new Error("Game state not found.");
    }

    const rounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: { sortOrder: "asc" },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    if (!rounds || rounds.length === 0) {
      throw new Error("No rounds available for this game.");
    }

    // Handle Transitioning State Early
    if (isTransitioning !== undefined) {
      const updatedGameState = await prisma.gameState.update({
        where: { gameId },
        data: {
          isTransitioning: isTransitioning,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: isTransitioning
          ? "Game is now in transition state."
          : "Game has resumed.",
        gameState: updatedGameState,
      });
    }

    // Determine Current Round and Question
    const currentRoundIndex = rounds.findIndex(
      (round) => round.id === gameState.currentRoundId
    );
    const currentRound = rounds[currentRoundIndex];

    if (!currentRound) {
      throw new Error("Current round not found.");
    }

    const currentQuestionIndex = currentRound.questions.findIndex(
      (q) => q.id === gameState.currentQuestionId
    );

    let nextRound, nextQuestion;

    // Handle Previous Question Navigation
    if (isPrevious) {
      if (currentQuestionIndex > 0) {
        nextRound = currentRound;
        nextQuestion = currentRound.questions[currentQuestionIndex - 1];
      } else if (currentRoundIndex > 0) {
        nextRound = rounds[currentRoundIndex - 1];
        nextQuestion = nextRound.questions[nextRound.questions.length - 1];
      } else {
        throw new Error("No previous question or round available.");
      }
    } else {
      // Handle Next Question Navigation
      if (currentQuestionIndex < currentRound.questions.length - 1) {
        nextRound = currentRound;
        nextQuestion = currentRound.questions[currentQuestionIndex + 1];
      } else if (currentRoundIndex < rounds.length - 1) {
        nextRound = rounds[currentRoundIndex + 1];
        nextQuestion = nextRound.questions[0];
      } else {
        throw new Error("No next question or round available.");
      }
    }

    if (!nextRound || !nextQuestion) {
      throw new Error("Failed to resolve next round or question.");
    }

    // Detect Round Change
    const isRoundChanged = gameState.currentRoundId !== nextRound.id;
if(isRoundChanged){
  console.log("Changing to a new round\nThe new round uses a pointsytems of: " + nextRound.pointSystem);
}
    let updatedPointsRemaining = gameState.pointsRemaining;

    if (isRoundChanged && nextRound.pointSystem === "POOL") {
      // Fetch all team IDs associated with the game
      const teamGames = await prisma.teamGame.findMany({
        where: { gameId },
        select: { teamId: true },
      });
    
      const teamIds = teamGames.map((tg) => tg.teamId);
    
      // Replenish the pointsRemaining for all teams
      const pointPool = nextRound.pointPool || [];
      updatedPointsRemaining = teamIds.reduce((acc, teamId) => {
        acc[teamId] = [...pointPool]; // Ensure pointPool is copied for each team
        return acc;
      }, {} as Record<string, number[]>);
    
      console.log(
        `Replenished points for POOL round: ${JSON.stringify(updatedPointsRemaining)}`
      );
    }

    // Validate updatedPointsRemaining
    const validatedPointsRemaining = JSON.parse(JSON.stringify(updatedPointsRemaining));

    // Update Game State
    const updatedGameState = await prisma.gameState.update({
      where: { gameId },
      data: {
        currentRoundId: nextRound.id,
        currentQuestionId: nextQuestion.id,
        pointsRemaining: validatedPointsRemaining, // Update the pointsRemaining if replenished
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: isPrevious
        ? "Moved to the previous question"
        : "Moved to the next question",
      gameState: updatedGameState,
    });
  } catch (error) {
    console.error("Error updating game state:", error);
    return NextResponse.json(
      { error: "Failed to update game state" },
      { status: 500 }
    );
  }
}
