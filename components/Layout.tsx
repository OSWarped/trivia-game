"use client";

import { AuthProvider } from "@/context/AuthContext"; 
import Header from "@/components/Header";
import useAuthRefresh from "@/context/useAuthRefresh"; 

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthHandler /> {/* Ensures token refresh runs in the background */}
      <Header />
      <main>{children}</main>
    </AuthProvider>
  );
}

// Component to trigger authentication refresh
function AuthHandler() {
  useAuthRefresh(); // Automatically refreshes the token if needed
  return null; // Doesn't render anything
}
