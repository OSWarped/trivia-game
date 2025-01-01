"use client"

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await authFetch('/api/protected-data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch protected data');
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
