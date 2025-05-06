'use client'; // <-- Make sure it's client-only

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3009', {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}
