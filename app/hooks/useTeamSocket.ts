// app/hooks/useTeamSocket.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/SocketProvider';

export interface TeamSocketSession {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionToken?: string | null;
  deviceId?: string | null;
}

interface TeamResumeAckSuccess {
  ok: true;
  gameId: string;
  teamId: string;
  teamName: string;
  gameStatus?: string;
  route?: string;
  redirectTo?: string;
  lastSeenAt?: string;
  expiresAt?: string;
}

interface TeamResumeAckFailure {
  ok: false;
  code?: string;
  error?: string;
  clearStoredSession?: boolean;
  redirectTo?: string;
}

type TeamResumeAck = TeamResumeAckSuccess | TeamResumeAckFailure;

interface UseTeamSocketOptions {
  enabled: boolean;
  session: TeamSocketSession | null;
  heartbeatMs?: number;
  onInvalidSession?: (ack: TeamResumeAckFailure) => void;
  onAuthenticated?: (ack: TeamResumeAckSuccess) => void;
}

export function useTeamSocket({
  enabled,
  session,
  heartbeatMs = 15000,
  onInvalidSession,
  onAuthenticated,
}: UseTeamSocketOptions) {
  const socket = useSocket();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sessionRef = useRef<TeamSocketSession | null>(session);
  const authInFlightRef = useRef(false);
  const lastAuthAttemptRef = useRef(0);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const authenticate = useCallback(() => {
    const currentSession = sessionRef.current;

    if (!socket || !enabled || !currentSession) {
      return;
    }

    if (
      !currentSession.gameId ||
      !currentSession.teamId ||
      !currentSession.teamName
    ) {
      return;
    }

    const now = Date.now();

    if (authInFlightRef.current) {
      return;
    }

    if (now - lastAuthAttemptRef.current < 1000) {
      return;
    }

    lastAuthAttemptRef.current = now;
    authInFlightRef.current = true;

    const finish = () => {
      authInFlightRef.current = false;
    };

    if (currentSession.sessionToken && currentSession.deviceId) {
      socket.emit(
        'team:resume',
        {
          gameId: currentSession.gameId,
          teamId: currentSession.teamId,
          teamName: currentSession.teamName,
          sessionToken: currentSession.sessionToken,
          deviceId: currentSession.deviceId,
        },
        (ack?: TeamResumeAck) => {
          finish();

          if (!ack) {
            // Transitional fallback while socket resume ack is being wired server-side.
            socket.emit('team:join', {
              gameId: currentSession.gameId,
              teamId: currentSession.teamId,
              teamName: currentSession.teamName,
            });
            setIsAuthenticated(true);
            return;
          }

          if (ack.ok) {
            setIsAuthenticated(true);
            onAuthenticated?.(ack);
            return;
          }

          setIsAuthenticated(false);
          onInvalidSession?.(ack);
        }
      );

      return;
    }

    // Legacy fallback.
    socket.emit('team:join', {
      gameId: currentSession.gameId,
      teamId: currentSession.teamId,
      teamName: currentSession.teamName,
    });
    setIsAuthenticated(true);
    finish();
  }, [socket, enabled, onAuthenticated, onInvalidSession]);

  useEffect(() => {
    if (!socket || !enabled || !session) {
      setIsAuthenticated(false);
      return;
    }

    const handleConnect = () => {
      authenticate();
    };

    const handleDisconnect = () => {
      setIsAuthenticated(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      authenticate();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, enabled, session, authenticate]);

  useEffect(() => {
    if (!enabled || !session) return;

    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;

      if (socket?.connected) {
        authenticate();
      } else {
        socket?.connect();
      }
    };

    const handlePageShow = () => {
      if (socket?.connected) {
        authenticate();
      } else {
        socket?.connect();
      }
    };

    const handleOnline = () => {
      if (socket?.connected) {
        authenticate();
      } else {
        socket?.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [socket, enabled, session, authenticate]);

  useEffect(() => {
    if (!socket || !enabled || !session || !heartbeatMs) return;

    const interval = window.setInterval(() => {
      if (!socket.connected) return;
      if (document.visibilityState !== 'visible') return;

      socket.emit('team:heartbeat', {
        gameId: session.gameId,
        teamId: session.teamId,
        sessionToken: session.sessionToken ?? null,
        deviceId: session.deviceId ?? null,
      });
    }, heartbeatMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [socket, enabled, session, heartbeatMs]);

  useEffect(() => {
    return () => {
      if (!socket || !session?.gameId || !session?.teamId) return;

      socket.emit('team:leave_lobby', {
        gameId: session.gameId,
        teamId: session.teamId,
      });
    };
  }, [socket, session?.gameId, session?.teamId]);

  return {
    socket,
    isAuthenticated,
    authenticate,
  };
}