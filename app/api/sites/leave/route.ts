import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const prisma = new PrismaClient();

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is missing' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { siteId } = await req.json();

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    // Check if the user is a member of the site
    const membership = await prisma.siteMembership.findUnique({
      where: {
        userId_hostingSiteId: { userId, hostingSiteId: siteId },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of the specified site' },
        { status: 404 }
      );
    }

    // Remove the membership
    await prisma.siteMembership.delete({
      where: {
        id: membership.id,
      },
    });

    return NextResponse.json({ message: 'Successfully left the hosting site' });
  } catch (error) {
    console.error('Error leaving hosting site:', error);
    return NextResponse.json({ error: 'Failed to leave hosting site' }, { status: 500 });
  }
}
