// lib/socket.ts
import { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io server not initialized');
  return io;
}
