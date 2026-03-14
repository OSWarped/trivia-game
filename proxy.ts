// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

interface DecodedToken extends JWTPayload {
  userId: string;
  roles: string[];
}

function isDecodedToken(p: JWTPayload): p is DecodedToken {
  return (
    typeof p.userId === 'string' &&
    Array.isArray(p.roles) &&
    p.roles.every((role) => typeof role === 'string')
  );
}

async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (isDecodedToken(payload)) {
      return payload;
    }

    console.warn('JWT payload shape not as expected:', payload);
    return null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  console.log('[PROXY] path:', req.nextUrl.pathname);

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

  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    if (!decoded.roles.includes('ADMIN')) {
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (pathname.startsWith('/api/host')) {
    if (
      !decoded.roles.includes('HOST') &&
      !decoded.roles.includes('ADMIN')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*', '/api/host/:path*'],
};