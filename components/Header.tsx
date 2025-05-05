'use client';

import { useState } from 'react';
import Link            from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X }     from 'lucide-react';

import { useAuth }     from '@/context/AuthContext';

export default function Header() {
  const { user, setUser } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isHost  = user?.role === 'HOST' || isAdmin;   // admins see host links too

  console.log("Header file says user is: " + JSON.stringify(user));
  if(user){
    console.log("Header file says user is Admin: " + JSON.stringify(user?.role || ''));

  }

  /* ───── logout ───── */
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  /* helper for menu items */
  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`hover:underline ${pathname === href ? 'font-bold' : ''}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="flex justify-between items-center">
        {/* logo / title */}
        <Link href="/" className="flex items-center">
  <Image
    src="/Quizam_Logo.png"
    alt="Quizam logo"
    width={160}
    height={50}
    className="h-auto w-auto max-h-12"
    priority
  />
</Link>

        {/* hamburger for mobile */}
        <button
          className="block md:hidden text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* desktop nav */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6 items-center">
            {navLink('/dashboard', 'Dashboard')}
            {navLink('/games',      'Games')}
            {navLink('/teams',      'Teams')}

            {isAdmin && navLink('/admin/dashboard', 'Admin Panel')}
            {isHost  && navLink('/dashboard/host',  'Host Dashboard')}

            {user ? (
              <button
                onClick={handleLogout}
                className="ml-4 bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="ml-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600"
              >
                Login
              </Link>
            )}
          </ul>
        </nav>
      </div>

      {/* mobile menu */}
      {open && (
        <nav className="md:hidden mt-2 bg-blue-700 p-4 rounded-lg">
          <ul className="flex flex-col space-y-4">
            {navLink('/dashboard', 'Dashboard')}
            {navLink('/games',     'Games')}
            {navLink('/teams',     'Teams')}
            {isAdmin && navLink('/admin/dashboard', 'Admin Panel')}
            {isHost  && navLink('/dashboard/host',  'Host Dashboard')}

            {/* auth button */}
            <li>
              {user ? (
                <button
                  onClick={() => {
                    setOpen(false);
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
