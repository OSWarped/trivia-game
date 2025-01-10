import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'; // Import for accessing cookies

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string; // Use userId from the token payload
  email: string;
  roles: string[];
}

export async function GET() {  
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
      if (!token) {
        return NextResponse.json(
          { error: 'Authorization token is missing' },
          { status: 401 }
        );
      }  

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken; 
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
