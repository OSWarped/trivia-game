import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params; // Await the params as per Next.js 15+ requirements

    // Fetch all members of the team
    const members = await prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const result = members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params; // Await the params as per Next.js 15+ requirements
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is missing' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    const { userId } = decoded;
    if (!userId) {
      return NextResponse.json({ error: 'User ID missing from token' }, { status: 400 });
    }

    // Check if the user is already a member of the team
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        userId,
        teamId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Add the user as a member to the team
    await prisma.teamMembership.create({
      data: {
        userId,
        teamId,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ message: 'User added to team successfully' });
  } catch (error) {
    console.error('Error adding member to team:', error);
    return NextResponse.json({ error: 'Failed to add member to team' }, { status: 500 });
  }
}
