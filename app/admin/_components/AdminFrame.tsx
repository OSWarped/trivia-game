'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderKanban,
  MapPinned,
  UsersRound,
} from 'lucide-react';
import AppBackground from '@/components/AppBackground';
import { useAuth } from '@/context/AuthContext';

interface AdminFrameProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/admin/games', label: 'Games', icon: FolderKanban },
  { href: '/admin/sites', label: 'Locations', icon: MapPinned },
  { href: '/admin/users', label: 'People', icon: UsersRound },
];

export default function AdminFrame({ children }: AdminFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAdmin) {
      router.push('/login');
    }
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <AppBackground variant="dashboard">
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/80 p-6 text-slate-700 shadow-xl backdrop-blur-sm">
            Loading admin...
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-white/10 bg-white/80 p-4 shadow-xl backdrop-blur-sm">
            <div className="mb-6 px-3 pt-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Admin
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Quizam Admin
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Schedule games, manage locations, and keep host access simple.
              </p>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <Link
                href="/dashboard/host"
                className="block rounded-2xl border border-slate-300 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Go to Host Dashboard
              </Link>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </AppBackground>
  );
}
