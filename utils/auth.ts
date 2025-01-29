
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface DecodedToken {
  userId: string;
  email: string;
  roles: string[];
}

export async function getUserFromToken() {
  try {
    // Retrieve cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      throw new Error('Authorization token is missing');
    }

    // Decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    // Fetch the user from the database
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    };
  } catch (error) {
    // Type-safe error handling
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during authentication';

    console.error('Error in getUserFromToken:', errorMessage);
    throw new Error(errorMessage);
  }
}
