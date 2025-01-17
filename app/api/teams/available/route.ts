import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string;
  email: string;
}

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userId = decoded.userId;

    // Fetch teams not already joined by the user
    const teams = await prisma.team.findMany({
      where: {
        memberships: {
          none: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    return NextResponse.json({ error: 'Failed to fetch available teams' }, { status: 500 });
  }
}
