// File: app/dashboard/host/[gameId]/play/hooks/useHostTeamSessions.ts
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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

interface TeamActivityPayload {
  gameId: string;
  teamId?: string;
}

interface TeamActivityChangedPayload {
  gameId: string;
  teamId: string;
  visibilityState?: 'visible' | 'hidden';
}


function normalizeHostTeamStatus(team: HostTeamStatus): HostTeamStatus {
  return {
    ...team,
    score: team.score ?? 0,
    submitted: team.submitted ?? false,
    hasDispute: team.hasDispute ?? false,
    hasPendingApproval: team.hasPendingApproval ?? false,

    isInactiveNow: team.isInactiveNow ?? false,
    inactiveStartedAt: team.inactiveStartedAt ?? null,
    inactiveDurationMsCurrent: team.inactiveDurationMsCurrent ?? 0,
    lastSeenAt: team.lastSeenAt ?? null,
    lastRecoveredAt: team.lastRecoveredAt ?? null,
    lastInactiveReason: team.lastInactiveReason ?? null,
    activitySeverity: team.activitySeverity ?? 'NONE',

    inactiveEventCountThisQuestion: team.inactiveEventCountThisQuestion ?? 0,
    inactiveTotalMsThisQuestion: team.inactiveTotalMsThisQuestion ?? 0,
    inactiveEventCountThisGame: team.inactiveEventCountThisGame ?? 0,
    inactiveTotalMsThisGame: team.inactiveTotalMsThisGame ?? 0,

    inactiveDuringLiveQuestion: team.inactiveDuringLiveQuestion ?? false,
    inactiveBeforeSubmission: team.inactiveBeforeSubmission ?? false,
    inactiveAfterSubmission: team.inactiveAfterSubmission ?? false,
    highConcernThisQuestion: team.highConcernThisQuestion ?? false,

    recentActivityEvents: team.recentActivityEvents ?? [],
  };
}

function withLiveInactiveDuration(
  team: HostTeamStatus,
  nowMs: number
): HostTeamStatus {
  if (!team.isInactiveNow || !team.inactiveStartedAt) {
    return team;
  }

  const inactiveStartedAtMs = Date.parse(team.inactiveStartedAt);

  if (Number.isNaN(inactiveStartedAtMs)) {
    return team;
  }

  const liveDurationMs = Math.max(0, nowMs - inactiveStartedAtMs);

  return {
    ...team,
    inactiveDurationMsCurrent: Math.max(
      team.inactiveDurationMsCurrent ?? 0,
      liveDurationMs
    ),
  };
}

function isFlaggedTeam(team: HostTeamStatus): boolean {
  return (
    team.highConcernThisQuestion === true ||
    team.activitySeverity === 'MEDIUM' ||
    team.activitySeverity === 'HIGH'
  );
}

export function useHostTeamSessions({
  gameId,
  socket,
}: UseHostTeamSessionsArgs) {
  const [rawTeamStatus, setRawTeamStatus] = useState<HostTeamStatus[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<HostConnectionStatus>(() =>
      socket?.connected ? 'connected' : 'disconnected'
    );
  const [timerNowMs, setTimerNowMs] = useState<number>(() => Date.now());

  const setTeamStatus: Dispatch<SetStateAction<HostTeamStatus[]>> = useCallback(
    (value) => {
      setRawTeamStatus((prev) => {
        const next =
          typeof value === 'function'
            ? (value as (prevState: HostTeamStatus[]) => HostTeamStatus[])(prev)
            : value;

        return next.map(normalizeHostTeamStatus);
      });
    },
    []
  );

  const teamStatus = useMemo(
    () =>
      rawTeamStatus.map((team) =>
        withLiveInactiveDuration(team, timerNowMs)
      ),
    [rawTeamStatus, timerNowMs]
  );

  const inactiveTeamCount = useMemo(
    () => teamStatus.filter((team) => team.isInactiveNow).length,
    [teamStatus]
  );

  const flaggedTeamCount = useMemo(
    () => teamStatus.filter(isFlaggedTeam).length,
    [teamStatus]
  );

  const pendingApprovalCount = useMemo(
    () => teamStatus.filter((team) => team.hasPendingApproval).length,
    [teamStatus]
  );

  const lockedTeamCount = useMemo(
    () => teamStatus.filter((team) => team.transferMode === 'LOCKED').length,
    [teamStatus]
  );

  const refreshTeamStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/games/${gameId}/team-status`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error(`Failed to load team status for game ${gameId}`);
        return;
      }

      const dto = (await res.json()) as HostTeamStatus[];

      setRawTeamStatus((prev) =>
        dto.map((incoming) => {
          const existing = prev.find((team) => team.id === incoming.id);
          const normalizedIncoming = normalizeHostTeamStatus(incoming);

          return normalizeHostTeamStatus({
            ...normalizedIncoming,
            submitted: existing?.submitted ?? normalizedIncoming.submitted,
          });
        })
      );
    } catch (error) {
      console.error(`Failed to refresh team status for game ${gameId}`, error);
    }
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

  const handleTeamActivityChanged = useCallback(
  async ({ gameId: incomingGameId }: TeamActivityChangedPayload) => {
    if (incomingGameId !== gameId) return;
    await refreshTeamStatus();
  },
  [gameId, refreshTeamStatus]
);

  const handleTeamBecameInactive = useCallback(
    async ({ gameId: incomingGameId }: TeamActivityPayload) => {
      if (incomingGameId !== gameId) return;
      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const handleTeamRecovered = useCallback(
    async ({ gameId: incomingGameId }: TeamActivityPayload) => {
      if (incomingGameId !== gameId) return;
      await refreshTeamStatus();
    },
    [gameId, refreshTeamStatus]
  );

  const handleScoreUpdate = useCallback(
    ({ teamId, newScore }: ScoreUpdatePayload) => {
      setRawTeamStatus((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? normalizeHostTeamStatus({ ...team, score: newScore })
            : team
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
    const hasInactiveTeams = rawTeamStatus.some(
      (team) => team.isInactiveNow && team.inactiveStartedAt
    );

    if (!hasInactiveTeams) {
      setTimerNowMs(Date.now());
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [rawTeamStatus]);

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
    socket.on('host:teamActivityChanged', handleTeamActivityChanged);
    socket.on('host:teamBecameInactive', handleTeamBecameInactive);
    socket.on('host:teamRecovered', handleTeamRecovered);
    socket.on('score:update', handleScoreUpdate);
    socket.on('host:teamReconnected', handleTeamReconnected);
    socket.on('host:teamActivityChanged', handleTeamActivityChanged);

    if (socket.connected) {
      queueMicrotask(() => {
        void joinAndRefresh();
      });
    }

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      socket.off('host:liveTeams', handleLiveTeams);
      socket.off('host:teamActivityChanged', handleTeamActivityChanged);
      socket.off('host:teamBecameInactive', handleTeamBecameInactive);
      socket.off('host:teamRecovered', handleTeamRecovered);
      socket.off('score:update', handleScoreUpdate);
      socket.off('host:teamReconnected', handleTeamReconnected);
      socket.off('host:teamActivityChanged', handleTeamActivityChanged);
    };
  }, [
    socket,
    gameId,
    joinAndRefresh,
    handleLiveTeams,
    handleTeamActivityChanged,
    handleTeamBecameInactive,
    handleTeamRecovered,
    handleScoreUpdate,
    handleTeamReconnected,
  ]);

  return {
    teamStatus,
    setTeamStatus,
    connectionStatus,
    inactiveTeamCount,
    flaggedTeamCount,
    pendingApprovalCount,
    lockedTeamCount,
    refreshTeamStatus,
    revokeTeamSession,
    unlockTeamSession,
    resetTeamPin,
    setTeamTransferMode,
    approveJoinRequest,
    denyJoinRequest,
    bootTeamSession,
  };
}