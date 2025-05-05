import CommandCenterClient from './CommandCenterClient';

export default async  function Page({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <CommandCenterClient gameId={gameId} />;
}
