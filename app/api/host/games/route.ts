import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);

  if (!user || !user.roles.includes('HOST')) {
    console.error('Unauthorized access - no host role');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const hostId = user.userId; // The id of the current host
    console.log('Host ID:', hostId);

    // Fetch games for the host
    const games = await prisma.game.findMany({
      where: {
        hostId: hostId, // Match the hostId from the user
      },
      include: {
        hostingSite: true, // Include hosting site details
      },
    });

    // Manually fetch the host (user) and attach it to each game
    const gamesWithHost = await Promise.all(
      games.map(async (game) => {
        const host = await prisma.user.findUnique({
          where: { id: game.hostId },
          select: { name: true }, // Only select the name of the host
        });

        return { ...game, host };
      })
    );

    console.log('Fetched games with hosts:', gamesWithHost);

    return NextResponse.json(gamesWithHost);
  } catch (error) {
    console.error('Error fetching host games:', error);
    return NextResponse.json({ error: 'Failed to fetch host games' }, { status: 500 });
  }
}

// Helper function to get user from request
async function getUserFromRequest(req: Request) {
  const token =
    req.headers.get('Authorization')?.split(' ')[1] ||
    req.headers.get('cookie')?.split('; ').find((cookie) => cookie.startsWith('token='))?.split('=')[1];

  if (!token) return null;

  try {
    const decoded = await decodeJWT(token); // Decode the JWT to get user info
    return decoded; // Return the decoded token directly
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}

async function decodeJWT(token: string): Promise<DecodedToken> {
  try {
    const secretKey = process.env.JWT_SECRET || 'your-secret-key'; // Ensure this matches the key used when signing the JWT
    const decoded = jwt.verify(token, secretKey) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    throw new Error('Invalid or expired token');
  }
}
