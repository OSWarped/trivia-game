'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react'; // Icons for menu toggle

export default function Header() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  console.log("Header file says user is: " + JSON.stringify(user));
  if(user){
    console.log("Header file says user is Admin: " + JSON.stringify(user?.roles || []));

  }
  

  // Logout handler
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null); // Clear user state globally
      router.push('/login'); // Redirect to login page
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="flex justify-between items-center">
        {/* Logo / Title */}
        <h1 className="text-xl font-bold">
          <Link href="/">Trivia Game</Link>
        </h1>

        {/* Hamburger Menu for Mobile */}
        <button
          className="block md:hidden text-white focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Navigation Links - Hidden on mobile, shown on desktop */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li>
              <Link
                href="/dashboard"
                className={`hover:underline ${pathname === '/dashboard' ? 'font-bold' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/games"
                className={`hover:underline ${pathname === '/games' ? 'font-bold' : ''}`}
              >
                Games
              </Link>
            </li>
            <li>
              <Link
                href="/teams"
                className={`hover:underline ${pathname === '/teams' ? 'font-bold' : ''}`}
              >
                Teams
              </Link>
            </li>

            {user?.roles?.includes('ADMIN') && (
              <li>
                <Link
                  href="/admin/dashboard"
                  className={`hover:underline ${
                    pathname === '/admin/dashboard' ? 'font-bold' : ''
                  }`}
                >
                  Admin Panel
                </Link>
              </li>
            )}

            {user?.roles?.includes('HOST') && (
              <li>
                <Link
                  href="/dashboard/host"
                  className={`hover:underline ${
                    pathname === '/dashboard/host' ? 'font-bold' : ''
                  }`}
                >
                  Host Dashboard
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Login/Logout Button - Shown on larger screens */}
        <div className="hidden md:block">
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          ) : (
            <Link href="/login" className="px-4 py-2 bg-green-500 rounded hover:bg-green-600">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu - Appears when isMenuOpen is true */}
      {isMenuOpen && (
        <nav className="md:hidden mt-2 bg-blue-700 p-4 rounded-lg">
          <ul className="flex flex-col space-y-4">
            <li>
              <Link
                href="/dashboard"
                className={`hover:underline ${pathname === '/dashboard' ? 'font-bold' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/games"
                className={`hover:underline ${pathname === '/games' ? 'font-bold' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Games
              </Link>
            </li>
            <li>
              <Link
                href="/teams"
                className={`hover:underline ${pathname === '/teams' ? 'font-bold' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Teams
              </Link>
            </li>

            {user?.roles?.includes('ADMIN') && (
              <li>
                <Link
                  href="/admin/dashboard"
                  className={`hover:underline ${
                    pathname === '/admin/dashboard' ? 'font-bold' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              </li>
            )}

            {user?.roles?.includes('HOST') && (
              <li>
                <Link
                  href="/dashboard/host"
                  className={`hover:underline ${
                    pathname === '/dashboard/host' ? 'font-bold' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Host Dashboard
                </Link>
              </li>
            )}

            {/* Login/Logout Button in Mobile Menu */}
            <li>
              {user ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full bg-red-500 px-4 py-2 rounded hover:bg-red-600"
                > 
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center px-4 py-2 bg-green-500 rounded hover:bg-green-600"
                  onClick={() => setIsMenuOpen(false)}
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
