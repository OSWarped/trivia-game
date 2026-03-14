// File: app/dashboard/host/[gameId]/play/hooks/useHostTeamSessions.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  HostConnectionStatus,
  HostTeamStatus,
  TeamTransferMode,
} from '../types/host-play.types';

interface UseHostTeamSessionsArgs {
  gameId: string;
  socket: Socket | null;
}

interface LiveTeamsPayload {
  gameId: string;
  teams: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'RECONNECTING' | 'OFFLINE';
    lastSeenAt: string;
  }[];
}

interface ScoreUpdatePayload {
  teamId: string;
  newScore: number;
}

interface TeamReconnectedPayload {
  teamName: string;
}

export function useHostTeamSessions({
  gameId,
  socket,
}: UseHostTeamSessionsArgs) {
  const [teamStatus, setTeamStatus] = useState<HostTeamStatus[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<HostConnectionStatus>(() =>
      socket?.connected ? 'connected' : 'disconnected'
    );

  const refreshTeamStatus = useCallback(async () => {
    const res = await fetch(`/api/host/games/${gameId}/team-status`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`Failed to load team status for game ${gameId}`);
      return;
    }

    const dto = (await res.json()) as HostTeamStatus[];

    setTeamStatus((prev) =>
      dto.map((incoming) => {
        const existing = prev.find((team) => team.id === incoming.id);
        return {
          ...incoming,
          submitted: existing?.submitted ?? incoming.submitted,
        };
      })
    );
  }, [gameId]);

  const joinAndRefresh = useCallback(async () => {
    if (!socket) return;

    setConnectionStatus('connected');
    socket.emit('host:join', { gameId });
    socket.emit('host:requestLiveTeams', { gameId });
    await refreshTeamStatus();
  }, [socket, gameId, refreshTeamStatus]);

  const handleLiveTeams = useCallback(
    async ({ gameId: incomingGameId }: LiveTeamsPayload) => {
      if (incomingGameId !== gameId) return;
      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const handleScoreUpdate = useCallback(
    ({ teamId, newScore }: ScoreUpdatePayload) => {
      setTeamStatus((prev) =>
        prev.map((team) =>
          team.id === teamId ? { ...team, score: newScore } : team
        )
      );
    },
    []
  );

  const handleTeamReconnected = useCallback(
    async ({ teamName }: TeamReconnectedPayload) => {
      console.log(`🔄 Team ${teamName} reconnected — reloading team status`);
      await refreshTeamStatus();
    },
    [refreshTeamStatus]
  );

  const revokeTeamSession = useCallback(
    async (teamId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/revoke-session`,
        {
          method: 'POST',
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to revoke team session.');
      }

      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const unlockTeamSession = useCallback(
    async (teamId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/unlock-session`,
        {
          method: 'POST',
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to unlock team session.');
      }

      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const resetTeamPin = useCallback(
    async (teamId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/reset-pin`,
        {
          method: 'POST',
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        newPin?: string;
      };

      if (!res.ok || !data.ok || !data.newPin) {
        throw new Error(data.error || 'Failed to reset team PIN.');
      }

      return data.newPin;
    },
    [gameId]
  );

  const setTeamTransferMode = useCallback(
    async (teamId: string, mode: TeamTransferMode) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/session-control-mode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode }),
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update team mode.');
      }

      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const approveJoinRequest = useCallback(
    async (teamId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/approve-request`,
        {
          method: 'POST',
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to approve join request.');
      }

      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const denyJoinRequest = useCallback(
    async (teamId: string) => {
      const res = await fetch(
        `/api/host/games/${gameId}/teams/${teamId}/deny-request`,
        {
          method: 'POST',
        }
      );

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to deny join request.');
      }

      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const bootTeamSession = useCallback(
    async (teamId: string) => {
      if (!socket) {
        throw new Error('Socket unavailable.');
      }

      await new Promise<void>((resolve, reject) => {
        socket.emit(
          'host:bootTeamSession',
          { gameId, teamId },
          (response?: { ok?: boolean; error?: string }) => {
            if (!response?.ok) {
              reject(new Error(response?.error ?? 'Failed to boot team.'));
              return;
            }
            resolve();
          }
        );
      });

      await refreshTeamStatus();
    },
    [socket, gameId, refreshTeamStatus]
  );

  useEffect(() => {
    if (!socket || !gameId) return;

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const onConnect = () => {
      void joinAndRefresh();
    };

    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    socket.on('host:liveTeams', handleLiveTeams);
    socket.on('score:update', handleScoreUpdate);
    socket.on('host:teamReconnected', handleTeamReconnected);

    if (socket.connected) {
      queueMicrotask(() => {
        void joinAndRefresh();
      });
    }

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      socket.off('host:liveTeams', handleLiveTeams);
      socket.off('score:update', handleScoreUpdate);
      socket.off('host:teamReconnected', handleTeamReconnected);
    };
  }, [
    socket,
    gameId,
    joinAndRefresh,
    handleLiveTeams,
    handleScoreUpdate,
    handleTeamReconnected,
  ]);

  return {
    teamStatus,
    setTeamStatus,
    connectionStatus,
    revokeTeamSession,
    unlockTeamSession,
    resetTeamPin,
    setTeamTransferMode,
    approveJoinRequest,
    denyJoinRequest,
    bootTeamSession,
  };
}