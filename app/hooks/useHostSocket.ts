'use client';

import { useEffect } from 'react';
import { useSocket } from '@/components/SocketProvider';

/**
 * Keeps the host subscribed to a game's socket room while enabled.
 */
export function useHostSocket(enabled: boolean, gameId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!enabled || !socket || !gameId) return;

    const joinHostRoom = () => {
      socket.emit('host:join', { gameId });
      socket.emit('host:requestLiveTeams', { gameId });
    };

    const handleConnect = () => {
      joinHostRoom();
    };

    socket.on('connect', handleConnect);

    if (socket.connected) {
      joinHostRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.emit('host:leave', { gameId });
    };
  }, [enabled, socket, gameId]);
}