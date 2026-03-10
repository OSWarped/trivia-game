'use client';

import { usePathname } from 'next/navigation';
import { SocketProvider } from '@/components/SocketProvider';
import { AuthProvider } from '@/context/AuthContext';
import Header from '@/components/Header';
import useAuthRefresh from '@/context/useAuthRefresh';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideHeaderRoutes = ['/', '/login'];
  const shouldHideHeader = hideHeaderRoutes.includes(pathname);

  return (
    <SocketProvider>
      <AuthProvider>
        <AuthHandler />
        {!shouldHideHeader && <Header />}
        <main>{children}</main>
      </AuthProvider>
    </SocketProvider>
  );
}

function AuthHandler() {
  useAuthRefresh();
  return null;
}