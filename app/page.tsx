'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome to Trivia Game</h1>
      <p className="text-lg mb-6">A fun and exciting way to host trivia games. Join or create games today!</p>
      
      <div className="space-x-4">
        <Link href="/register">
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Register
          </button>
        </Link>
        <Link href="/login">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Login
          </button>
        </Link>
      </div>
    </div>
  );
}
