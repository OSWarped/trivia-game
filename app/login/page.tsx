'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppBackground from '@/components/AppBackground';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

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
        setSubmitting(false);
        return;
      }

      setUser(result);
      refreshUser().catch(() => {});

      if (result.role === 'ADMIN') {
        router.push('/admin/workspace');
      } else if (result.role === 'HOST') {
        router.push('/dashboard/host');
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <AppBackground variant="hero" className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <Link
              href="/"
              className="mb-8 flex justify-center lg:justify-start"
            >
              <Image
                src="/Quizam_Logo.png"
                alt="Quizam logo"
                width={380}
                height={160}
                priority
                className="h-auto w-full max-w-[300px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:max-w-[340px] lg:max-w-[380px]"
              />
            </Link>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Sign in to continue
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Access host tools, game management, and admin controls from one
              place.
            </p>

            <p className="mt-6 text-sm text-slate-400">
              Need the public landing page instead?{' '}
              <Link href="/" className="font-medium text-blue-300 hover:text-blue-200">
                Go back home
              </Link>
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Login</h2>
              <p className="mt-2 text-sm text-slate-300">
                Enter your email and password to access your account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppBackground>
  );
}