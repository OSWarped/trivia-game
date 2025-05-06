'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);
    // (no cleanup: keep the connection for the life of the tab)
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
