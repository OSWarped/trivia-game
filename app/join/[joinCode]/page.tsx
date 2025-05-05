import JoinPageClient from './JoinPageClient';

export default async function Page({ params }: { params: Promise<{ joinCode: string }> }) {
  const { joinCode } = await params;
  return <JoinPageClient joinCode={joinCode} />;
}
