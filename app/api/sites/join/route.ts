import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string; // Use userId from the token payload
  email: string;
  roles: string[];
}

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
      const { siteId } = await req.json();
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
  
      // Check if the user is already a member of the site
      const existingMembership = await prisma.siteMembership.findUnique({
        where: { userId_hostingSiteId: { userId, hostingSiteId: siteId } },
      });
  
      if (existingMembership) {
        // Remove the membership
        await prisma.siteMembership.delete({
          where: { id: existingMembership.id },
        });
        return NextResponse.json({ message: 'Left hosting site successfully' });
      } else {
        // Add the membership
        await prisma.siteMembership.create({
          data: { userId, hostingSiteId: siteId },
        });
        return NextResponse.json({ message: 'Joined hosting site successfully' });
      }
    } catch (error) {
      console.error('Error toggling site membership:', error);
      return NextResponse.json({ error: 'Failed to toggle site membership' }, { status: 500 });
    }
  }
  