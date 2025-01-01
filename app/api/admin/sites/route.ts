import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sites = await prisma.hostingSite.findMany();
    return NextResponse.json(sites);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { name, location } = await req.json();

  try {
    const newSite = await prisma.hostingSite.create({
      data: { name, location },
    });
    return NextResponse.json(newSite);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
