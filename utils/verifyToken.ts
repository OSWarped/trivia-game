import { jwtVerify, } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function verifyToken(authHeader: string | null): Promise<{ id: string } | null> {
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as { id: string };
  } catch {
    return null;
  }
}
