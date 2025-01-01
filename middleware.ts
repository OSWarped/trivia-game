import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

interface JwtPayload {
  id: string;
  email: string;
  roles: string[];
}

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url);

  // Extract token from cookies
  const token = req.headers.get('cookie')?.split('; ').find((cookie) => cookie.startsWith('token='))?.split('=')[1];

  if (!token) {
    console.error('No token found in cookies');
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Verify JWT
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    ) as { payload: JwtPayload };

    console.log('JWT payload:', payload);

    // Validate roles for admin routes
    if (pathname.startsWith('/api/admin') && (!payload.roles || !payload.roles.includes('ADMIN'))) {
      console.error('Unauthorized access to admin route');
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    if (pathname.startsWith('/admin') && (!payload.roles || !payload.roles.includes('ADMIN'))) {
      console.error('Unauthorized access to admin dashboard');
      return NextResponse.redirect(new URL('/login', req.url));
    }

  } catch (error) {
    console.error('JWT verification failed:', error);
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*'],
};
