'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';
import { usePathname } from 'next/navigation';

/* ─────────────────────────────────── Types ────────────────────────────────── */

export interface AuthUser {
  userId: string;
  email: string;
  role: string; // "ADMIN" | "HOST"
}

interface AuthContextType {
  user: AuthUser | null;
  isHost: boolean;
  isAdmin: boolean;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

/* ───────────────────────────────── Context ───────────────────────────────── */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ─────────────────────────────── Provider ────────────────────────────────── */

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const hasFetchedRef = useRef(false);

  /* ---- Fetch and store user --------------------------------------------- */
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        redirect: 'manual',
      });

      const data = await res.json();
      setUser(res.ok ? data.user : null);
    } catch {
      setUser(null);
    }
  };

  /* ---- Fetch on initial load ------------------------------------------- */
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setLoading(true);

    refreshUser().finally(() => {
      setLoading(false);
    });
  }, [pathname]);

  /* ---- Derived roles --------------------------------------------------- */
  const isAdmin = user?.role === 'ADMIN';
  const isHost = user?.role === 'HOST' || isAdmin;

  /* ---- Context value --------------------------------------------------- */
  const value: AuthContextType = {
    user,
    isHost,
    isAdmin,
    loading,
    setUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* ──────────────────────────────── Hook ──────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
