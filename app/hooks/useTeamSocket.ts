// app/hooks/useTeamSocket.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [internalIsAuthenticated, setInternalIsAuthenticated] = useState(false);

  const sessionRef = useRef<TeamSocketSession | null>(session);
  const authInFlightRef = useRef(false);
  const lastAuthAttemptRef = useRef(0);
  const lastVisibilityRef = useRef<DocumentVisibilityState | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const emitVisibilityChanged = useCallback(
    (visibilityState: 'visible' | 'hidden') => {
      const currentSession = sessionRef.current;

      if (!socket || !enabled || !currentSession || !socket.connected) {
        return;
      }

      socket.emit('team:visibilityChanged', {
        gameId: currentSession.gameId,
        teamId: currentSession.teamId,
        teamName: currentSession.teamName,
        visibilityState,
        sessionToken: currentSession.sessionToken ?? null,
        deviceId: currentSession.deviceId ?? null,
      });
    },
    [socket, enabled]
  );

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
            socket.emit('team:join', {
              gameId: currentSession.gameId,
              teamId: currentSession.teamId,
              teamName: currentSession.teamName,
            });
            setInternalIsAuthenticated(true);
            return;
          }

          if (ack.ok) {
            setInternalIsAuthenticated(true);
            onAuthenticated?.(ack);
            return;
          }

          setInternalIsAuthenticated(false);
          onInvalidSession?.(ack);
        }
      );

      return;
    }

    socket.emit('team:join', {
      gameId: currentSession.gameId,
      teamId: currentSession.teamId,
      teamName: currentSession.teamName,
    });
    setInternalIsAuthenticated(true);
    finish();
  }, [socket, enabled, onAuthenticated, onInvalidSession]);

  useEffect(() => {
    if (!socket || !enabled || !session) {
      return;
    }

    const handleConnect = () => {
      void authenticate();
    };

    const handleDisconnect = () => {
      setInternalIsAuthenticated(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      queueMicrotask(() => {
        void authenticate();
      });
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

    const handleVisibilityChange = () => {
      const nextVisibility = document.visibilityState;

      if (lastVisibilityRef.current === nextVisibility) {
        return;
      }

      lastVisibilityRef.current = nextVisibility;

      if (nextVisibility === 'hidden') {
        emitVisibilityChanged('hidden');
        return;
      }

      emitVisibilityChanged('visible');

      if (socket?.connected) {
        void authenticate();
      } else {
        socket?.connect();
      }
    };

    const handlePageShow = () => {
      emitVisibilityChanged('visible');

      if (socket?.connected) {
        void authenticate();
      } else {
        socket?.connect();
      }
    };

    const handleOnline = () => {
      emitVisibilityChanged('visible');

      if (socket?.connected) {
        void authenticate();
      } else {
        socket?.connect();
      }
    };

    lastVisibilityRef.current = document.visibilityState;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [socket, enabled, session, authenticate, emitVisibilityChanged]);

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

  const isAuthenticated = useMemo(() => {
    return Boolean(enabled && session && internalIsAuthenticated);
  }, [enabled, session, internalIsAuthenticated]);

  return {
    socket,
    isAuthenticated,
    authenticate,
  };
}