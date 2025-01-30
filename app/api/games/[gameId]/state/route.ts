
// GET: Fetch the current state of the game
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromToken } from "@/utils/auth"; // Import your utility function

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // ✅ Step 1: Check user authentication
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Step 2: Fetch game state
    const gameState = await prisma.gameState.findUnique({
      where: { gameId },
      include: {
        game: {
          include: {
            rounds: true,
          },
        },
      },
    });

    console.log("Fetched gameState:", gameState);

    if (!gameState) {
      return NextResponse.json({ error: "Game state not found" }, { status: 404 });
    }

    // ✅ Step 3: Find the user's team
    const userTeam = await prisma.teamGame.findFirst({
      where: {
        gameId,
        team: {
          memberships: {
            some: {
              userId: user.userId, // Ensure the user is a member of the team
            },
          },
        },
      },
      include: {
        team: true,
      },
    });

    console.log("Fetched userTeam:", userTeam);

    if (!userTeam) {
      return NextResponse.json({ error: "Team not found for user" }, { status: 404 });
    }

    // ✅ Step 4: Fetch current round
    const currentRound = gameState.currentRoundId
      ? await prisma.round.findUnique({
          where: { id: gameState.currentRoundId },
        })
      : null;

    console.log("Fetched currentRound:", currentRound);

    // ✅ Step 5: Fetch current question
    const currentQuestion = gameState.currentQuestionId
      ? await prisma.question.findUnique({
          where: { id: gameState.currentQuestionId },
          include: {
            subquestions: {
              include: {
                subAnswers: true, // Include subAnswers for each subquestion
              },
            },
          },
        })
      : null;

    console.log("Fetched currentQuestion:", currentQuestion);

    // ✅ Step 6: Fetch remaining points
    const remainingPoints = gameState.pointsRemaining
      ? (gameState.pointsRemaining as Record<string, number[]>)[userTeam.team.id] || []
      : [];

    // ✅ Step 7: Fetch submitted answer
    const submittedAnswer = currentQuestion
      ? await prisma.answer.findFirst({
          where: {
            teamId: userTeam.team.id,
            questionId: currentQuestion.id,
          },
        })
      : null;

    console.log("Fetched submittedAnswer:", submittedAnswer);

    // ✅ Step 8: Return game state
    return NextResponse.json({
      game: gameState.game
        ? {
            id: gameState.game.id,
            name: gameState.game.name,
            status: gameState.game.status,
            currentRound: currentRound
              ? {
                  id: currentRound.id,
                  name: currentRound.name,
                  pointSystem: currentRound.pointSystem,
                  roundType: currentRound.roundType,
                  pointPool: currentRound.pointPool,
                  pointValue: currentRound.pointValue,
                }
              : null,
            currentQuestion: currentQuestion
              ? {
                  id: currentQuestion.id,
                  text: currentQuestion.text || "No Question Available",
                  type: (currentQuestion.type ?? "SINGLE") as
                    | "SINGLE"
                    | "ORDERED"
                    | "MULTIPLE_CHOICE"
                    | "WAGER"
                    | "IMAGE",
                  subquestions: Array.isArray(currentQuestion.subquestions)
                    ? currentQuestion.subquestions.map((sub) => ({
                        id: sub.id,
                        text: sub.text || "No Subquestion Available",
                        subAnswers: Array.isArray(sub.subAnswers)
                          ? sub.subAnswers
                              .filter((sa) => sa.teamId === userTeam?.team?.id)
                              .map((sa) => ({
                                id: sa.id,
                                answer: sa.answer || "No Answer",
                                isCorrect: sa.isCorrect ?? false,
                                pointsAwarded: sa.pointsAwarded ?? 0,
                              }))
                          : [],
                      }))
                    : [],
                }
              : null,
          }
        : null,

      team: userTeam?.team
        ? {
            id: userTeam.team.id,
            name: userTeam.team.name,
            remainingPoints: remainingPoints ?? [],
            submittedAnswer: submittedAnswer
              ? {
                  answer: submittedAnswer.answer || "No Answer Submitted",
                  pointsUsed: submittedAnswer.pointsUsed ?? [],
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Error fetching game state:", error);
    return NextResponse.json({ error: "Failed to fetch game state" }, { status: 500 });
  }
}



// POST: Submit an answer for the team
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

    if (!gameState.currentRoundId) {
      return NextResponse.json({ error: 'Current round ID is not set' }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: gameState.currentRoundId }, // Now `gameState.currentRoundId` is guaranteed to be a string
    });

    if (!round || !round.pointPool.includes(pointsUsed)) {
      return NextResponse.json(
        { error: 'Invalid points value selected for this round' },
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
        isCorrect: false, // Default value
        pointsAwarded: 0, // Default value
      },
    });

    // Update the round's point pool to remove the used points
    const updatedPool = round.pointPool.filter((p) => p !== pointsUsed);
    await prisma.round.update({
      where: { id: round.id },
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

// // PUT: Update the game state
// // PUT: Update the game state
// export async function PUT(
//   req: Request,
//   { params }: { params: Promise<{ gameId: string }> }
// ) {
//   const { gameId } = await params;
//   const { isTransitioning, currentRoundId, currentQuestionId, refreshPoints } = await req.json();

//   try {
//     if (isTransitioning) {
//       // Handle transition state
//       const gameState = await prisma.gameState.upsert({
//         where: { gameId },
//         update: {
//           isTransitioning: true,
//           currentRoundId: null,
//           currentQuestionId: null,
//           updatedAt: new Date(),
//         },
//         create: {
//           gameId,
//           isTransitioning: true,
//           currentRoundId: null,
//           currentQuestionId: null,
//         },
//       });

//       return NextResponse.json({
//         message: 'Game is now in transition state',
//         gameState,
//       });
//     }

//     if (currentQuestionId) {
//       // Handle moving to the next question within the same round
//       const gameState = await prisma.gameState.update({
//         where: { gameId },
//         data: {
//           isTransitioning: false,
//           currentRoundId, // Keep the current round
//           currentQuestionId, // Update the current question
//           updatedAt: new Date(),
//         },
//       });

//       return NextResponse.json({
//         message: 'Game progressed to next question',
//         gameState,
//       });
//     }

//     // Handle transition to the next round
//     const currentRound = await prisma.round.findUnique({
//       where: { id: currentRoundId },
//     });

//     if (!currentRound) {
//       return NextResponse.json(
//         { error: 'Current round not found' },
//         { status: 404 }
//       );
//     }

//     // Find the next round based on sortOrder
//     const nextRound = await prisma.round.findFirst({
//       where: {
//         gameId,
//         sortOrder: { gt: currentRound.sortOrder }, // Find the next higher sortOrder
//       },
//       orderBy: {
//         sortOrder: 'asc', // Ensure the next round is the smallest greater sortOrder
//       },
//       include: {
//         questions: true,
//       },
//     });
    

//     if (!nextRound) {
//       return NextResponse.json(
//         { error: 'No more rounds available' },
//         { status: 404 }
//       );
//     }

//     if (nextRound.questions.length === 0) {
//       return NextResponse.json(
//         { error: 'Next round has no questions' },
//         { status: 400 }
//       );
//     }

//     // Update game state with next round and its first question
//     console.log("STATE: Current round ID: " + currentRoundId + "\nNext Round ID: " + nextRound.id);
//     const updatedGameState = await prisma.gameState.update({
//       where: { gameId },
//       data: {
//         isTransitioning: false,
//         currentRoundId: nextRound.id,
//         currentQuestionId: nextRound.questions[0].id,
//         updatedAt: new Date(),
//       },
//     });

//     return NextResponse.json({
//       message: 'Game progressed to next round',
//       gameState: updatedGameState,
//     });
//   } catch (error) {
//     console.error('Error updating game state:', error);
//     return NextResponse.json(
//       { error: 'Failed to update game state' },
//       { status: 500 }
//     );
//   }
// }
