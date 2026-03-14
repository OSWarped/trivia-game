'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { getSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket] = useState<Socket | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return getSocket();
  });

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);