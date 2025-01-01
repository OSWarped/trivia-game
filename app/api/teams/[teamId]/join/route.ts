import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface JwtPayload {
  id: string;
  email: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params; // Await the params as per Next.js 15+ requirements
  const token = req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET)) as { payload: JwtPayload };
    const userId = payload.id;

    // Check if the user is already part of the team
    const existingMembership = await prisma.team.findFirst({
      where: {
        id: teamId,
        players: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ message: 'User is already a member of this team' });
    }

    // Add user to the team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          connect: { id: userId },
        },
      },
      include: {
        players: true, // Optional: Return the updated list of players
      },
    });

    return NextResponse.json({ message: 'Joined team successfully', team: updatedTeam });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
