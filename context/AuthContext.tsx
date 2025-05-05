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
  email:  string;
  role:   string;        // "ADMIN" | "HOST"
}

interface AuthContextType {
  user:        AuthUser | null;
  isHost:      boolean;
  isAdmin:     boolean;
  setUser:     (u: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}

/* ───────────────────────────────── Context ───────────────────────────────── */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ─────────────────────────────── Provider ────────────────────────────────── */

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const pathname        = usePathname();
  const hasFetchedRef   = useRef(false);             // guards duplicate fetches

  /* ---- helper to hit /api/auth/me --------------------------------------- */
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        redirect: 'manual',         // don’t auto‑follow 308s
      });
      setUser(res.ok ? await res.json() : null);
    } catch {
      setUser(null);
    }
  };

  /* ---- fetch once per client session (skip public routes) --------------- */
  useEffect(() => {
    const publicRoutes = ['/', '/login', '/register', '/join'];

    if (user || publicRoutes.some(route => pathname.startsWith(route))) return;   // nothing to do
    if (hasFetchedRef.current) return;                     // already fetched

    hasFetchedRef.current = true;
    refreshUser();
  }, [pathname, user]);

  /* ---- derived booleans -------------------------------------------------- */
  const isAdmin = user?.role === 'ADMIN';
  const isHost  = user?.role === 'HOST' || isAdmin;

  /* ---- context value ----------------------------------------------------- */
  const value: AuthContextType = {
    user,
    isHost,
    isAdmin,
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
