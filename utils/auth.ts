
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
      role: user.role,
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


// ✅ New function that accepts a provided token
export async function getUserFromProvidedToken(token: string | null) {
  try {
    if (!token) {
      return null; // ❌ Don't throw an error, just return null
    }

    // Decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    // Fetch the user from the database
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return null; // ❌ Don't throw an error, just return null
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error('Error in getUserFromProvidedToken:', error);
    return null; // ❌ Return null instead of throwing an error
  }
}


export function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" }); // 30-minute expiry
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null; // Return null if verification fails
  }
}