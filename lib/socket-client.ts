'use client'; // <-- Make sure it's client-only

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,             // enable reconnection
      reconnectionAttempts: 5,        // try up to 5 times
      reconnectionDelay: 2000,        // 2s delay between attempts
      reconnectionDelayMax: 10000,    // cap delay at 10s
    });
  }
  return socket;
}
