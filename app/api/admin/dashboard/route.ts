import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sites = await prisma.site.findMany();
    const users = await prisma.user.findMany();

    return NextResponse.json({ sites, users });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return NextResponse.json({ error: 'Failed to load admin data' }, { status: 500 });
  }
}
