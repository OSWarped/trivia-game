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
      console.log("🔄 Fetching user from /api/auth/me...");
      const res = await fetch("/api/auth/me", { credentials: "include" });
  
      if (res.ok) {
        const userData = await res.json();
        console.log("🟢 Successfully fetched user:", userData);
  
        setUser(userData);  // ✅ Store user correctly
      } else {
        console.error("❌ Failed to fetch user. Response:", await res.json());
        setUser(null);
      }
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      setUser(null);
    }
  };
  

  // ✅ Only fetch user data if not on public pages
  useEffect(() => {
    const publicRoutes = ["/", "/login", "/register"];
    console.log("🛠️ AuthContext: Running effect. Current route:", pathname);
  
    if (!publicRoutes.includes(pathname) && !user) {
      console.log("🔄 Calling refreshUser()...");
      refreshUser();
    }
  }, [pathname]); // ✅ Prevents infinite loops
  
  
  useEffect(() => {
    console.log("🟢 AuthContext user updated:", user);
  }, [user]);
  
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
