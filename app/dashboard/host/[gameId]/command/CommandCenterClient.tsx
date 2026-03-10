'use client';

import React, { JSX, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import {
  Radio,
  QrCode,
  Users,
  ArrowRight,
  WifiOff,
} from 'lucide-react';

import AppBackground from '@/components/AppBackground';
import { useSocket } from '@/components/SocketProvider';
import { useHostSocket } from '@/app/hooks/useHostSocket';

interface Team {
  id: string;
  name: string;
  status?: 'ACTIVE' | 'RECONNECTING' | 'OFFLINE';
  lastSeenAt?: string;
}

interface Game {
  id: string;
  title: string;
  status: string;
  scheduledFor: string;
  joinCode: string;
}

interface Props {
  gameId: string;
}

function getStatusBadgeClass(status?: Team['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'RECONNECTING':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'OFFLINE':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    default:
      return 'border-blue-300 bg-blue-50 text-blue-700';
  }
}

function getStatusLabel(status?: Team['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Online';
    case 'RECONNECTING':
      return 'Reconnecting';
    case 'OFFLINE':
      return 'Offline';
    default:
      return 'Connected';
  }
}

function getGameStatusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'LIVE':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'SCHEDULED':
      return 'border-blue-300 bg-blue-50 text-blue-700';
    case 'DRAFT':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'CLOSED':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    case 'CANCELED':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
}

export default function CommandCenterClient({ gameId }: Props): JSX.Element {
  const router = useRouter();
  const socket = useSocket();

  useHostSocket(true, gameId);

  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && game?.joinCode) {
      setJoinUrl(`${window.location.origin}/join/${game.joinCode}`);
    }
  }, [game?.joinCode]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}`, { cache: 'no-store' });
        if (res.ok) {
          setGame((await res.json()) as Game);
        }
      } catch (error) {
        console.error('Failed to load game metadata:', error);
      }
    })();
  }, [gameId]);

  useEffect(() => {
    if (!socket || !gameId) return;

    const requestRoster = () => {
      socket.emit('host:requestLiveTeams', { gameId });
    };

    const handleConnect = () => {
      setConnectionStatus('connected');
      requestRoster();
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleLiveTeams = ({
      gameId: incomingGameId,
      teams: incomingTeams,
    }: {
      gameId: string;
      teams: Team[];
    }): void => {
      if (incomingGameId === gameId) {
        setTeams(incomingTeams);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('host:liveTeams', handleLiveTeams);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('host:liveTeams', handleLiveTeams);
    };
  }, [socket, gameId]);

  const connectedCount = useMemo(
    () => teams.filter((team) => team.status === 'ACTIVE').length,
    [teams]
  );

  if (!game) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading command center...
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Host Command Center
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {game.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${getGameStatusBadgeClass(
                      game.status
                    )}`}
                  >
                    {game.status}
                  </span>

                  <span>
                    Scheduled:{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(game.scheduledFor).toLocaleString()}
                    </span>
                  </span>

                  <span>
                    Join Code:{' '}
                    <span className="font-mono font-medium text-slate-800">
                      {game.joinCode}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                <StatCard label="Teams Joined" value={teams.length} />
                <StatCard label="Online Now" value={connectedCount} />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4 xl:col-span-3">
              <section className="h-full rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Teams in Lobby
                    </h2>
                    <p className="text-sm text-slate-600">
                      Live roster for this game session.
                    </p>
                  </div>
                </div>

                {connectionStatus === 'disconnected' && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <WifiOff size={16} />
                    Reconnecting to live roster…
                  </div>
                )}

                {teams.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
                    <div className="text-base font-semibold text-slate-900">
                      No teams yet
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Teams will appear here as soon as they join the lobby.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {teams.map((team) => (
                      <li
                        key={team.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            {team.name}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                              team.status
                            )}`}
                          >
                            {getStatusLabel(team.status)}
                          </span>
                        </div>

                        {team.lastSeenAt ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Last seen:{' '}
                            {new Date(team.lastSeenAt).toLocaleTimeString()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>

            <main className="space-y-6 lg:col-span-8 xl:col-span-9">
              <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Share with Players
                    </h2>
                    <p className="text-sm text-slate-600">
                      Teams can scan the QR code or use the direct join URL.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
                  <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    {joinUrl ? (
                      <QRCode value={joinUrl} className="h-64 w-64" />
                    ) : (
                      <div className="flex h-64 w-64 items-center justify-center text-sm text-slate-500">
                        Preparing QR code…
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="mb-1 text-sm font-medium text-slate-700">
                        Join URL
                      </div>
                      <div className="break-all text-sm text-slate-800">
                        {joinUrl || 'Preparing join link...'}
                      </div>
                    </div>

                    {joinUrl ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(joinUrl);
                            setCopied(true);
                            window.setTimeout(() => setCopied(false), 2000);
                          } catch (error) {
                            console.error('Failed to copy join URL', error);
                          }
                        }}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {copied ? 'Copied Join URL' : 'Copy Join URL'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                    <Radio size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Game Controls
                    </h2>
                    <p className="text-sm text-slate-600">
                      Rejoin an active game or launch the live play flow.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {game.status === 'LIVE' ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/host/${gameId}/play`)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <ArrowRight size={16} />
                      Rejoin Live Game
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const startRes = await fetch(
                            `/api/host/games/${gameId}/start`,
                            {
                              method: 'PATCH',
                            }
                          );

                          if (!startRes.ok) {
                            throw new Error('Failed to start game');
                          }

                          const displayModeRes = await fetch(
                            `/api/host/games/${gameId}/display-mode`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ displayMode: 'QUESTION' }),
                            }
                          );

                          if (!displayModeRes.ok) {
                            throw new Error(
                              'Failed to set display mode to QUESTION'
                            );
                          }

                          socket?.emit('host:gameStarted', { gameId });
                          socket?.emit('host:showQuestion', { gameId });

                          router.push(`/dashboard/host/${gameId}/play`);
                        } catch (error) {
                          console.error('Failed to start game flow', error);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <ArrowRight size={16} />
                      Start Game
                    </button>
                  )}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </AppBackground>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}