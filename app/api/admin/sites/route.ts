import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sites = await prisma.site.findMany();
    return NextResponse.json(sites);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { name, address } = await req.json();

  try {
    const newSite = await prisma.site.create({
      data: { name, address },
    });
    return NextResponse.json(newSite);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
