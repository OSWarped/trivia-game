import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

// GET: Fetch all teams associated with the logged-in user
export async function GET() {
  console.log('attempting to get user from cookie');
  const user = await getUserFromRequest();
  if (!user) {
    console.error('No User Found');
    return NextResponse.json({ error: 'No User Logged In' }, { status: 403 });
  }

  try {
    console.log('User ID:', user.userId);

    // Fetch teams via TeamMembership relation
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: user.userId },
      include: {
        team: {
          include: {
            teamGames: {
              include: {
                game: {
                  select: { id: true, name: true, date: true },
                },
              },
            },
          },
        },
      },
    });

    // Map memberships to include only team and game details
    const teams = memberships.map((membership) => ({
      id: membership.team.id,
      name: membership.team.name,
      games: membership.team.teamGames,
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// Helper function to get user from request
async function getUserFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  console.log('Extracted Token:', token); // Log the extracted token

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    console.log('Decoded Token:', decoded); // Log the decoded token
    return decoded;
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}
