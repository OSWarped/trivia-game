// app/games/[gameId]/page.tsx
import { redirect } from 'next/navigation';
import type { GameStatus } from '@prisma/client';

interface Params { params: { gameId: string } }

export default async function GameIndex({ params }: Params) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/games/${params.gameId}`, { cache: 'no-store' });
  if (!res.ok) redirect('/404');

  const { game }: { game: { status: GameStatus } } = await res.json();

  const dest = game.status === 'LIVE'
    ? `/games/${params.gameId}/play`
    : `/games/${params.gameId}/lobby`;

  redirect(dest);
}
