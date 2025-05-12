// app/api/auth/login/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient }             from '@prisma/client'
import bcrypt                       from 'bcrypt'
import jwt                          from 'jsonwebtoken'

const prisma     = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // 1) validate user…
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.hashedPw))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // 2) sign a token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '4h' }
  )

  // 3) build your response and set the cookie
  const res = NextResponse.json({ role: user.role })

  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax', // ✅ critical change
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
    secure: process.env.NODE_ENV === 'production',
  });
  

  return res
}
