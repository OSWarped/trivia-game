import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

interface DecodedToken {
  userId: string; // Use userId from the token payload
  email: string;
  roles: string[];
}

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url);
  console.log("Middleware attempting to get token from cookies");

  // Extract token from cookies (HttpOnly cookies)
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
    ) as { payload: DecodedToken };

    console.log('JWT payload:', payload); // Log the payload to ensure roles are present

    // Allow admin to access admin routes
    if (pathname.startsWith('/api/admin') && (!payload.roles || !payload.roles.includes('ADMIN'))) {
      console.error('Unauthorized access to admin route');
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Allow hosts to access host routes
    if (pathname.startsWith('/api/host') && (!payload.roles || !payload.roles.includes('HOST'))) {
      console.error('Unauthorized access to host route');
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Redirect non-admins from admin dashboard
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
  matcher: ['/api/admin/:path*', '/admin/:path*', '/api/host/:path*'],
};
