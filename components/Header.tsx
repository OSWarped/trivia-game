'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function Header() {
  const { user, setUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isTeamView =
    pathname.startsWith('/games/') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/transition');

  const isAdmin = user?.role === 'ADMIN';
  const isHost = user?.role === 'HOST' || isAdmin;

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`hover:underline ${pathname === href ? 'font-bold' : ''}`}
    >
      {label}
    </Link>
  );

  if (loading) return null;

  return (
    <header className="bg-blue-600 p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        {isTeamView ? (
          <div className="flex cursor-default items-center">
            <Image
              src="/Quizam_Logo.png"
              alt="Quizam logo"
              width={160}
              height={50}
              className="h-auto max-h-12 w-auto"
              priority
            />
          </div>
        ) : (
          <Link href="/" className="flex items-center">
            <Image
              src="/Quizam_Logo.png"
              alt="Quizam logo"
              width={160}
              height={50}
              className="h-auto max-h-12 w-auto"
              priority
            />
          </Link>
        )}

        {!isTeamView && (
          <button
            className="block text-white md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}

        {!isTeamView && (
          <nav className="hidden md:block">
            <ul className="flex items-center space-x-6">
              {isAdmin && navLink('/admin', 'Admin')}
              {isHost && navLink('/dashboard/host', 'Host Dashboard')}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="ml-4 rounded bg-red-500 px-4 py-2 hover:bg-red-600"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="ml-4 rounded bg-green-500 px-4 py-2 hover:bg-green-600"
                >
                  Login
                </Link>
              )}
            </ul>
          </nav>
        )}
      </div>

      {!isTeamView && open && (
        <nav className="mt-2 rounded-lg bg-blue-700 p-4 md:hidden">
          <ul className="flex flex-col space-y-4">
            {isAdmin && navLink('/admin', 'Admin')}
            {isHost && navLink('/dashboard/host', 'Host Dashboard')}
            <li>
              {user ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    void handleLogout();
                  }}
                  className="w-full rounded bg-red-500 px-4 py-2 hover:bg-red-600"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded bg-green-500 px-4 py-2 text-center hover:bg-green-600"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
