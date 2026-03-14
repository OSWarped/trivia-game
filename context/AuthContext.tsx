'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

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

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        redirect: 'manual',
      });

      const data = (await res.json()) as { user?: AuthUser };
      setUser(res.ok ? (data.user ?? null) : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshUser().finally(() => {
        setLoading(false);
      });
    });
  }, [refreshUser]);

  const isAdmin = user?.role === 'ADMIN';
  const isHost = user?.role === 'HOST' || isAdmin;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isHost,
      isAdmin,
      loading,
      setUser,
      refreshUser,
    }),
    [user, isHost, isAdmin, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ──────────────────────────────── Hook ──────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}