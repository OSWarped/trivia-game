import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Fetch all hosting sites
    const hostingSites = await prisma.hostingSite.findMany();

    // Fetch the sites the user has joined
    const joinedSites = await prisma.siteMembership.findMany({
      where: { userId },
      select: { hostingSiteId: true },
    });

    const joinedSiteIds = new Set(joinedSites.map((site) => site.hostingSiteId));

    // Add 'joined' property to each hosting site
    const result = hostingSites.map((site) => ({
      id: site.id,
      name: site.name,
      location: site.location,
      joined: joinedSiteIds.has(site.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching hosting sites:', error);
    return NextResponse.json({ error: 'Failed to fetch hosting sites' }, { status: 500 });
  }
}
