// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

interface DecodedToken extends JWTPayload {
  userId: string;
  email:  string;
  role:   string;          // "ADMIN" | "HOST"
}

/* ─────────────────────────────────────────────────────────── */

function isDecodedToken(p: JWTPayload): p is DecodedToken {
  return (
    typeof p.userId === 'string' &&
    typeof p.email  === 'string' &&
    typeof p.role   === 'string'
  );
}

async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (isDecodedToken(payload)) return payload;
    console.warn('JWT payload shape not as expected:', payload);
    return null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────── */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  console.log('[MW] path:', req.nextUrl.pathname);

  // If no token → redirect (pages) or 401 (APIs)
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  /* ─────  Role gates  ───── */

  // Admin‑only APIs & pages
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    if (decoded.role !== 'ADMIN') {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Host‑only APIs
  if (pathname.startsWith('/api/host')) {
    if (decoded.role !== 'HOST' && decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

/* ─────────────────────────────────────────────────────────── */

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/admin/:path*',
    '/api/host/:path*',
  ],
};
