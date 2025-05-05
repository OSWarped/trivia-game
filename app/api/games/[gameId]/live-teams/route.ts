import { NextResponse } from 'next/server';

declare global {
    var activeTeamsByGame: Map<string, Set<string>> | undefined;
  }
  

export async function GET(req: Request,  { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  const liveTeamsRaw = globalThis.activeTeamsByGame?.get?.(gameId);

  if (!liveTeamsRaw || !(liveTeamsRaw instanceof Set)) {
    return NextResponse.json({ teams: [] });
  }

  const teams = Array.from(liveTeamsRaw);
  return NextResponse.json({ teams });
}
