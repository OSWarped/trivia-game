import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  // Replace with actual logic to fetch siteId based on the game
  const siteId = 'exampleSiteId'; 
  const url = `https://trivia-game.com/join?siteId=${siteId}&gameId=${gameId}`;

  try {
    const qrCode = await QRCode.toDataURL(url);
    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
