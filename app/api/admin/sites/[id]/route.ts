import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  
    try {
      console.log(`Received DELETE request for site ID: ${id}`);
  
      // Delete the HostingSite (dependent records are removed automatically)
      const deletedSite = await prisma.hostingSite.delete({
        where: { id },
      });
  
      return NextResponse.json(
        { message: 'Site deleted successfully', site: deletedSite },
        { status: 200 }
      );
    } catch (error: unknown) {
      console.error('Error deleting site:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        { error: 'Failed to delete site', details: errorMessage },
        { status: 500 }
      );
    }
  }

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { name, location } = await req.json();
  
    try {
      const updatedSite = await prisma.hostingSite.update({
        where: { id },
        data: { name, location },
      });
      return NextResponse.json(updatedSite);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }
  }
  