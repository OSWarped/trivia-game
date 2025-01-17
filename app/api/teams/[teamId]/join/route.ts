import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'; // Use a proper secret key

export async function POST(
  _req: Request, // No body expected
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    console.log('Starting POST /join-requests API');
    const { teamId } = await params;
    console.log('Extracted teamId:', teamId);

    // Retrieve token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error('Authorization token is missing.');
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    console.log('Token retrieved successfully.');

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userId = decoded.userId;

    if (!userId) {
      console.error('User ID could not be extracted from token.');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('Decoded userId:', userId);

    // Check if the user is already part of the team
    console.log('Checking for existing team membership...');
    const existingMembership = await prisma.teamMembership.findFirst({
      where: { teamId, userId },
    });

    if (existingMembership) {
      console.log('User is already a member of the team.');
      return NextResponse.json(
        { error: 'You are already a member of this team.' },
        { status: 400 }
      );
    }

    console.log('No existing membership found. Checking for pending join requests...');
    // Check for an existing join request
    const existingRequest = await prisma.teamJoinRequest.findFirst({
      where: {
        teamId,
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      console.log('A pending join request already exists.');
      return NextResponse.json(
        { error: 'A pending join request for this team already exists.' },
        { status: 400 }
      );
    }

    console.log('No pending join request found. Creating a new join request...');
    // Create a new join request
    const joinRequest = await prisma.teamJoinRequest.create({
      data: {
        userId,
        teamId,
        status: 'PENDING',
        requestedAt: new Date(),
      },
    });

    console.log('Join request created successfully:', joinRequest);

    return NextResponse.json({
      message: 'Join request created successfully.',
      joinRequest,
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the join request.' },
      { status: 500 }
    );
  }
}