import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export function verifyToken(authHeader: string | null): { id: string } | null {
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];

  try {
    return jwt.verify(token, JWT_SECRET) as { id: string };
  } catch {
    return null;
  }
}
