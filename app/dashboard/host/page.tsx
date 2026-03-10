'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AppBackground from '@/components/AppBackground';

interface Game {
  id: string;
  title: string;
  scheduledFor: string | null;
  status: 'DRAFT' | 'LIVE' | 'CLOSED' | 'SCHEDULED' | 'CANCELED';
  event?: {
    id: string;
    name: string;
  } | null;
  site?: {
    id: string;
    name: string;
  } | null;
}

interface EventGroup {
  eventName: string;
  games: Game[];
}

interface SiteGroup {
  siteName: string;
  events: EventGroup[];
}

const STATUS_STYLES: Record<Game['status'], string> = {
  DRAFT:
    'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  LIVE:
    'border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  CLOSED:
    'border-slate-300 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  SCHEDULED:
    'border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  CANCELED:
    'border-rose-300 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

function getDateValue(date: string | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return new Date(date).getTime();
}

function groupGamesBySiteAndEvent(games: Game[]): SiteGroup[] {
  const sortedGames = [...games].sort((a, b) => {
    const siteA = a.site?.name ?? 'Unassigned Site';
    const siteB = b.site?.name ?? 'Unassigned Site';
    const siteCompare = siteA.localeCompare(siteB);
    if (siteCompare !== 0) return siteCompare;

    const eventA = a.event?.name ?? 'Unassigned Event';
    const eventB = b.event?.name ?? 'Unassigned Event';
    const eventCompare = eventA.localeCompare(eventB);
    if (eventCompare !== 0) return eventCompare;

    return getDateValue(a.scheduledFor) - getDateValue(b.scheduledFor);
  });

  const siteMap = new Map<string, Map<string, Game[]>>();

  for (const game of sortedGames) {
    const siteName = game.site?.name ?? 'Unassigned Site';
    const eventName = game.event?.name ?? 'Unassigned Event';

    if (!siteMap.has(siteName)) {
      siteMap.set(siteName, new Map<string, Game[]>());
    }

    const eventMap = siteMap.get(siteName);
    if (!eventMap) continue;

    if (!eventMap.has(eventName)) {
      eventMap.set(eventName, []);
    }

    const eventGames = eventMap.get(eventName);
    if (!eventGames) continue;

    eventGames.push(game);
  }

  return Array.from(siteMap.entries()).map(([siteName, eventMap]) => ({
    siteName,
    events: Array.from(eventMap.entries()).map(([eventName, eventGames]) => ({
      eventName,
      games: eventGames,
    })),
  }));
}

export default function HostDashboard() {
  const { user, isHost, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (!isHost && !isAdmin)) {
      router.push('/login');
    }
  }, [user, isHost, isAdmin, authLoading, router]);

  useEffect(() => {
    void loadGames();
  }, []);

  const handleResetGame = async (gameId: string) => {
    const confirmed = confirm('Are you sure you want to reset this game?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/host/debug/reset-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Game reset successfully.');
        await loadGames();
      } else {
        alert(result.error || 'Failed to reset game.');
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('An error occurred while resetting the game.');
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/host/games', { credentials: 'include' });
      if (!res.ok) {
        setGames([]);
        return;
      }

      const data: unknown = await res.json();

      if (Array.isArray(data)) {
        setGames(data as Game[]);
      } else if (
        data &&
        typeof data === 'object' &&
        'games' in data &&
        Array.isArray((data as { games?: unknown }).games)
      ) {
        setGames((data as { games: Game[] }).games);
      } else {
        setGames([]);
      }
    } catch (err) {
      console.error('Error fetching host games:', err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const now = useMemo(() => new Date(), []);

  const upcoming = useMemo(
    () =>
      games.filter((g) => g.scheduledFor && new Date(g.scheduledFor) >= now),
    [games, now]
  );

  const past = useMemo(
    () => games.filter((g) => g.scheduledFor && new Date(g.scheduledFor) < now),
    [games, now]
  );

  const groupedUpcoming = useMemo(
    () => groupGamesBySiteAndEvent(upcoming),
    [upcoming]
  );

  const groupedPast = useMemo(() => groupGamesBySiteAndEvent(past), [past]);

  const liveCount = games.filter((g) => g.status === 'LIVE').length;
  const draftCount = games.filter((g) => g.status === 'DRAFT').length;

  function formatDate(dt: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
  }

  if (authLoading || loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            {authLoading ? 'Checking login...' : 'Loading games...'}
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
                  Host Operations
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Quizam Host Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Manage upcoming games, launch live sessions, and review past
                  game activity from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAdmin ? (
                  <Link
                    href="/admin/workspace"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Admin Workspace
                  </Link>
                ) : null}

                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Home
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Games" value={games.length} />
            <StatCard label="Upcoming" value={upcoming.length} />
            <StatCard label="Live Now" value={liveCount} />
            <StatCard label="Drafts" value={draftCount} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Upcoming Games
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Games that are scheduled or still being prepared for launch.
                </p>
              </div>
            </div>

            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming games"
                description="Once games are scheduled, they’ll appear here for quick launch and editing."
              />
            ) : (
              <GameGroups
                groups={groupedUpcoming}
                formatDate={formatDate}
                renderActions={(game) => (
                  <>
                    <button
                      onClick={() => handleResetGame(game.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Reset Game
                    </button>

                    {(game.status === 'DRAFT' ||
                      game.status === 'SCHEDULED') && (
                        <Link
                          href={`/dashboard/host/games/${game.id}/edit`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                      )}

                    <Link
                      href={`/dashboard/host/${game.id}/command`}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Launch
                    </Link>
                  </>
                )}
              />
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Past Games
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Review previous sessions and open historical game details.
              </p>
            </div>

            {past.length === 0 ? (
              <EmptyState
                title="No past games yet"
                description="Completed games will show up here once you’ve hosted a session."
              />
            ) : (
              <GameGroups
                groups={groupedPast}
                formatDate={formatDate}
                renderActions={(game) => (
                  <Link
                    href={`/dashboard/host/games/${game.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View
                  </Link>
                )}
              />
            )}
          </section>
        </div>
      </div>
    </AppBackground>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-lg backdrop-blur-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}

function MetaPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
      <span className="font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function GameGroups({
  groups,
  formatDate,
  renderActions,
}: {
  groups: SiteGroup[];
  formatDate: (dt: string | null) => string;
  renderActions: (game: Game) => ReactNode;
}) {
  return (
    <div className="space-y-8">
      {groups.map((siteGroup) => (
        <div key={siteGroup.siteName} className="space-y-5">
          <div className="border-b border-slate-200/80 pb-2">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">
              {siteGroup.siteName}
            </h3>
          </div>

          <div className="space-y-6">
            {siteGroup.events.map((eventGroup) => (
              <div
                key={`${siteGroup.siteName}-${eventGroup.eventName}`}
                className="space-y-3"
              >
                <div className="pl-1">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {eventGroup.eventName}
                  </h4>
                </div>

                <div className="space-y-4">
                  {eventGroup.games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      dateLabel={formatDate(game.scheduledFor)}
                      actions={renderActions(game)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GameCard({
  game,
  dateLabel,
  actions,
}: {
  game: Game;
  dateLabel: string;
  actions: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-blue-600 to-cyan-500 opacity-80" />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trivia Game
              </div>

              <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">
                {game.title}
              </h3>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${STATUS_STYLES[game.status]}`}
            >
              {game.status}
            </span>
          </div>

          <div className="mt-4">
            <MetaPill label="When" value={dateLabel} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div>
      </div>
    </div>
  );
}