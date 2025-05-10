// app/hooks/useTeamSocket.ts
'use client';
import { useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';

export function useTeamSocket(
  enabled: boolean,
  gameId: string | null,
  teamId: string | null,
  teamName: string | null
) {
  const socket = useSocket();

  // Join (or rejoin) lobby once socket is ready and data is present
  useEffect(() => {
    if (!enabled || !socket || !socket.connected || !gameId) return;

    socket.emit('team:join', { gameId, teamId, teamName });

    return () => {
      socket.emit('team:leave_lobby', { gameId, teamId });
    };
  }, [enabled, socket, gameId, teamId, teamName]);
}
