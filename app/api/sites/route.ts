import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all sites
export async function GET() {
  try {
    const sites = await prisma.hostingSite.findMany();
    return NextResponse.json(sites);
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

// POST: Create a new site
export async function POST(req: Request) {
  try {
    const { name, location } = await req.json();

    if (!name || !location) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
    }

    const newSite = await prisma.hostingSite.create({
      data: { name, location },
    });

    return NextResponse.json(newSite, { status: 201 });
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

// DELETE: Delete all sites (use with caution)
export async function DELETE() {
  try {
    await prisma.hostingSite.deleteMany();
    return NextResponse.json({ message: 'All sites deleted' });
  } catch (error) {
    console.error('Error deleting sites:', error);
    return NextResponse.json({ error: 'Failed to delete sites' }, { status: 500 });
  }
}
