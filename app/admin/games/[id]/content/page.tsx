import { redirect } from 'next/navigation';

interface GameContentRedirectProps {
  params: {
    id: string;
  };
}

export default function GameContentRedirect({ params }: GameContentRedirectProps) {
  redirect(`/admin/games/${params.id}/editor`);
}
