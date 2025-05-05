'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();   // ← get both helpers

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Login failed.');
        return;
      }

      /* ---- update context immediately so header rerenders ---- */
      setUser(result);           // result must include { userId, email, role }

      /* optional: fire‑and‑forget revalidation */
      refreshUser().catch(() => {});

      /* ---- role‑based redirect -------------------------------- */
      if (result.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (result.role === 'HOST') {
        router.push('/dashboard/host');
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
    }
  }

  return (
    <div className="h-screen flex items-start justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md mt-20">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Login
        </h1>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Login
          </button>
        </form>

        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
