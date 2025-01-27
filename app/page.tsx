'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 p-6">
      <div className="mt-20 text-center"> {/* Adjust this margin to control vertical positioning */}
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to Trivia Game</h1>
        <p className="text-lg mb-6 text-gray-600">
          A fun and exciting way to host trivia games. Join or create games today!
        </p>
        <div className="flex space-x-4 justify-center">
          <Link href="/register">
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">
              Register
            </button>
          </Link>
          <Link href="/login">
            <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition">
              Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

