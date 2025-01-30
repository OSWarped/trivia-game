'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function useAuthRefresh() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return; // Don't refresh if no user is logged in

    let interval: NodeJS.Timeout;

    const checkAndRefreshToken = async () => {
      try {
        const res = await fetch('/api/auth/check-expiry');
        const data = await res.json();

        if (data.needsRefresh) {
          console.log('Refreshing token...');
          const refreshRes = await fetch('/api/auth/refresh');
          const refreshData = await refreshRes.json();

          if (refreshData.success) {
            console.log('Token refreshed successfully.');
          } else {
            console.log('Token refresh failed, logging out.');
            handleLogout();
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    const handleLogout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    };

    // Check every 10 minutes (600,000 ms)
    interval = setInterval(checkAndRefreshToken, 600000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [user, router, setUser]);
}
