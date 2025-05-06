// /app/components/Layout.tsx
'use client';

import { SocketProvider } from '@/components/SocketProvider';
import { AuthProvider }   from '@/context/AuthContext';
import Header             from '@/components/Header';
import useAuthRefresh     from '@/context/useAuthRefresh';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <AuthProvider>
        <AuthHandler />   {/* token refresh background task */}
        <Header />
        <main>{children}</main>
      </AuthProvider>
    </SocketProvider>
  );
}

function AuthHandler() {
  useAuthRefresh();
  return null;
}
