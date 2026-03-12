import { redirect } from 'next/navigation';

type GameContentRedirectProps = {
  params: Promise<{ id: string }>;
};

export default async function GameContentRedirectPage({
  params,
}: GameContentRedirectProps) {
  const { id } = await params;

  redirect(`/admin/games/${id}/editor`);
}
