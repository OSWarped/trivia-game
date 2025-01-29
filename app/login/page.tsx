'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth(); // Get refreshUser function from context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // ✅ Immediately refresh user state
        await refreshUser();

        // ✅ Redirect based on roles
        if (result.roles.includes('ADMIN')) {
          router.push('/admin/dashboard');
        } else if (result.roles.includes('HOST')) {
          router.push('/dashboard/host');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
    }
  }

  return (
    <div className="h-screen flex items-start justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md mt-20">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
