import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? 'your_secret_key';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

interface DecodedToken extends JWTPayload {
  userId: string;
  email: string;
  role?: string;
  roles?: string[];
}

function isDecodedToken(payload: JWTPayload): payload is DecodedToken {
  return (
    typeof payload.userId === 'string' &&
    typeof payload.email === 'string'
  );
}

export async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      throw new Error('Authorization token is missing');
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);

    if (!isDecodedToken(payload)) {
      throw new Error('Invalid token payload');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during authentication';

    console.error('Error in getUserFromToken:', errorMessage);
    throw new Error(errorMessage);
  }
}

export async function getUserFromProvidedToken(token: string | null) {
  try {
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);

    if (!isDecodedToken(payload)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error('Error in getUserFromProvidedToken:', error);
    return null;
  }
}

export async function generateToken(payload: {
  userId: string;
  email: string;
  role?: string;
  roles?: string[];
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET_KEY);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}