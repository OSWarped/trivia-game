'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const siteId = searchParams.get('siteId');
  const gameId = searchParams.get('gameId');

  const handleLogin = () => router.push(`/login?siteId=${siteId}&gameId=${gameId}`);
  const handleRegister = () => router.push(`/register?siteId=${siteId}&gameId=${gameId}`);

  return (
    <div>
      <h1>Join Trivia Game</h1>
      <p>Please log in or register to join the game.</p>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}
