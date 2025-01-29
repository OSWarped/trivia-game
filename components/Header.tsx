'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log("Header file says user is: " + JSON.stringify(user));
  if(user){
    console.log("Header file says user is Admin: " + JSON.stringify(user?.user.roles));
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
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
      {/* Logo / Title */}
      <h1 className="text-xl font-bold">
        <Link href="/">Trivia Game</Link>
      </h1>

      {/* Navigation Links */}
      {user && (
        <nav>
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

            {/* Admin Navigation - Only show if user exists and has roles */}
            {user?.user.roles?.includes('ADMIN') && (
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

            {/* Host Navigation */}
            {user?.user.roles?.includes('HOST') && (
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
      )}

      {/* Login/Logout Button */}
      <div>
        {user ? (
          <button
            onClick={handleLogout}
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
