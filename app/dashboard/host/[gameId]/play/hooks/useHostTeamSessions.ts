// File: app/dashboard/host/[gameId]/play/hooks/useHostTeamSessions.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
    HostConnectionStatus,
    HostTeamStatus,
} from '../types/host-play.types';

interface UseHostTeamSessionsArgs {
    gameId: string;
    socket: Socket | null;
}

interface LiveTeamsPayload {
    gameId: string;
    teams: { id: string; name: string }[];
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
        useState<HostConnectionStatus>('connected');

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

    useEffect(() => {
        if (!socket || !gameId) return;

        const onDisconnect = () => setConnectionStatus('disconnected');

        const onConnect = async () => {
            setConnectionStatus('connected');
            socket.emit('host:join', { gameId });
            socket.emit('host:requestLiveTeams', { gameId });
            await refreshTeamStatus();
        };

        socket.on('disconnect', onDisconnect);
        socket.on('connect', onConnect);
        socket.on('host:liveTeams', handleLiveTeams);
        socket.on('score:update', handleScoreUpdate);
        socket.on('host:teamReconnected', handleTeamReconnected);

        if (socket.connected) {
            socket.emit('host:join', { gameId });
            socket.emit('host:requestLiveTeams', { gameId });
            void refreshTeamStatus();
        } else {
            socket.once('connect', onConnect);
        }

        return () => {
            socket.off('disconnect', onDisconnect);
            socket.off('connect', onConnect);
            socket.off('host:liveTeams', handleLiveTeams);
            socket.off('score:update', handleScoreUpdate);
            socket.off('host:teamReconnected', handleTeamReconnected);
            socket.off('connect', onConnect);
        };
    }, [
        socket,
        gameId,
        refreshTeamStatus,
        handleLiveTeams,
        handleScoreUpdate,
        handleTeamReconnected,
    ]);

    return {
        teamStatus,
        setTeamStatus,
        connectionStatus,
        refreshTeamStatus,
        revokeTeamSession,
        unlockTeamSession,
    };
}