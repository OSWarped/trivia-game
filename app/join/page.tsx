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
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 px-4 pt-20">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Join Trivia Game</h1>
        <p className="text-center text-gray-600 mb-4">
          Please log in or register to join the game.
        </p>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Login
          </button>
          <button
            onClick={handleRegister}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Register
          </button>
        </div>
      </div>
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
