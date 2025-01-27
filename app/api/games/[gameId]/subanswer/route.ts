import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Create a new subanswer
export async function POST(request: Request) {
    try {
      // Await the JSON body from the request
      const { teamId, subAnswers } = await request.json();
  
      // Validate the payload
      if (!teamId || !subAnswers || !Array.isArray(subAnswers)) {
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }
  
      // Insert subanswers in a batch
      const result = await prisma.subQuestionAnswer.createMany({
        data: subAnswers.map((subAnswer) => ({
          teamId, // Add the team ID
          subquestionId: subAnswer.subquestionId, // Ensure proper mapping
          answer: subAnswer.answer, // Ensure proper mapping
          isCorrect: null, // Default as null
          pointsAwarded: 0, // Default as 0
        })),
      });
  
      // Return a success response with the count of created records
      return NextResponse.json({
        message: "Subanswers submitted successfully",
        count: result.count,
      });
    } catch (error) {
      console.error("Error in POST /api/games/[gameId]/subanswer:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
  