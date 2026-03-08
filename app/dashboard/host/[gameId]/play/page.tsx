// File: app/dashboard/host/[gameId]/play/page.tsx
'use client';

import { useParams } from 'next/navigation';
import HostPlayWorkspace from './HostPlayWorkspace';

export default function HostPlayPage() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) return null;

  return <HostPlayWorkspace gameId={gameId} />;
}