'use client';
import { useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';

/**
 * Mounts the host inside a game room only while `enabled` is true.
 */
export function useHostSocket(enabled: boolean, gameId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!enabled || !socket || !socket.connected || !gameId) return;

    socket.emit('host:join', { gameId });
    socket.emit('host:requestLiveTeams', { gameId });

    return () => {
      socket.emit('host:leave', { gameId });
      socket.off('host:liveTeams'); // listeners removed by component cleanup
    };
  }, [enabled, socket, gameId]);
}
