import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch subanswers by `teamId` and/or `subquestionId`
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const subquestionId = searchParams.get('subquestionId');

  if (!teamId && !subquestionId) {
    return NextResponse.json(
      { error: 'Please provide at least one of teamId or subquestionId' },
      { status: 400 }
    );
  }

  try {
    const subAnswers = await prisma.subQuestionAnswer.findMany({
      where: {
        ...(teamId && { teamId }),
        ...(subquestionId && { subquestionId }),
      },
      include: {
        subquestion: true, // Include details of the subquestion
      },
    });

    return NextResponse.json(subAnswers, { status: 200 });
  } catch (error) {
    console.error('Error fetching subanswers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subanswers' },
      { status: 500 }
    );
  }
}

// POST: Create a new subanswer
export async function POST(req: Request) {
    try {
      const body = await req.json();
      const { teamId, subquestionId, answer } = body;
  
      // Validate input
      if (!teamId || !subquestionId || !answer) {
        return NextResponse.json(
          { error: 'Missing required fields: teamId, subquestionId, or answer' },
          { status: 400 }
        );
      }
  
      // Create the SubQuestionAnswer
      const newSubAnswer = await prisma.subQuestionAnswer.create({
        data: {
          team: {
            connect: { id: teamId }, // Reference existing team by ID
          },
          subquestion: {
            connect: { id: subquestionId }, // Reference existing subquestion by ID
          },
          answer,
          pointsAwarded: 0, // Default points
          isCorrect: null, // Initially not marked as correct or incorrect
        },
      });
  
      return NextResponse.json(newSubAnswer, { status: 201 });
    } catch (error) {
      console.error('Error creating SubQuestionAnswer:', error);
      return NextResponse.json(
        { error: 'Failed to create SubQuestionAnswer' },
        { status: 500 }
      );
    }
  }
  
// PUT: Update an existing subanswer
export async function PUT(req: Request) {
    try {
      // Parse the request body
      const { teamId, subquestionId, isCorrect, pointsAwarded } = await req.json();
  
      // Validate required fields
      if (!teamId || !subquestionId || typeof isCorrect !== "boolean" || pointsAwarded === undefined) {
        return NextResponse.json(
          { error: "Missing or invalid required fields" },
          { status: 400 }
        );
      }
  
      // Update the subAnswer record
      const updatedSubAnswer = await prisma.subQuestionAnswer.updateMany({
        where: { teamId, subquestionId },
        data: {
          isCorrect,
          pointsAwarded,
          updatedAt: new Date(), // Optional: To track last modification
        },
      });
  
      // Check if the update was successful
      if (!updatedSubAnswer.count) {
        return NextResponse.json(
          { error: "SubAnswer not found or no changes made" },
          { status: 404 }
        );
      }
  
      return NextResponse.json({
        message: "SubAnswer updated successfully",
        subAnswer: {
          teamId,
          subquestionId,
          isCorrect,
          pointsAwarded,
        },
      });
    } catch (error) {
      console.error("Error updating subanswer:", error);
      return NextResponse.json(
        { error: "Failed to update subanswer" },
        { status: 500 }
      );
    }
  }
  