"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // Helps detect current route

interface User {
  user: User;
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname(); // Get current route

  // Function to fetch user data from /api/auth/me
  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");

      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  };

  // ✅ Only fetch user data if not on public pages
  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register"];

    if (!publicRoutes.includes(pathname)) {
      refreshUser();
    }
  }, [pathname]); // Runs when the route changes

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
