'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import AdminPageHeader from './_components/AdminPageHeader';
import AdminSectionCard from './_components/AdminSectionCard';
import LoadingCard from './_components/LoadingCard';
import StatCard from './_components/StatCard';
import StatusBadge from './_components/StatusBadge';
import type { GameRow, SiteGroup, SiteRow, UserRow } from './_lib/types';
import {
  buildEventSummaries,
  filterGames,
  flattenGames,
  sortGamesBySchedule,
} from './_lib/utils';

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [games, setGames] = useState<GameRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const [gamesRes, sitesRes, usersRes] = await Promise.all([
          fetch('/api/admin/games', { cache: 'no-store' }),
          fetch('/api/admin/sites', { cache: 'no-store' }),
          fetch('/api/admin/users', { cache: 'no-store' }),
        ]);

        if (!gamesRes.ok || !sitesRes.ok || !usersRes.ok) {
          throw new Error('Failed to load admin overview data.');
        }

        const gameGroups = (await gamesRes.json()) as SiteGroup[];
        const siteRows = (await sitesRes.json()) as SiteRow[];
        const userRows = (await usersRes.json()) as UserRow[];

        setGames(sortGamesBySchedule(flattenGames(gameGroups)));
        setSites(siteRows);
        setUsers(userRows);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load admin overview.'
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredSearchResults = useMemo(() => {
    return filterGames(games, {
      search,
      status: 'ALL',
      siteId: 'ALL',
      datePreset: 'ALL',
    }).slice(0, 6);
  }, [games, search]);

  const upcomingGames = useMemo(() => {
    return games
      .filter((game) => {
        if (!game.scheduledFor) {
          return false;
        }

        return new Date(game.scheduledFor) >= new Date();
      })
      .slice(0, 8);
  }, [games]);

  const draftGames = useMemo(() => {
    return games
      .filter((game) => game.status.toUpperCase() === 'DRAFT')
      .slice(0, 6);
  }, [games]);

  const needsAttention = useMemo(() => {
    return games
      .filter((game) => {
        const status = game.status.toUpperCase();
        return !game.scheduledFor || !game.hostName || status === 'DRAFT';
      })
      .slice(0, 8);
  }, [games]);

  const eventCount = useMemo(() => buildEventSummaries(games).length, [games]);

  const liveCount = useMemo(
    () => games.filter((game) => game.status.toUpperCase() === 'LIVE').length,
    [games]
  );

  if (loading) {
    return <LoadingCard label="Loading admin overview..." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations Home"
        title="Admin Overview"
        description="Jump back into games quickly, scan what is coming up, and keep the admin space focused on real work."
        actions={[
          { href: '/admin/games', label: 'Open Games', tone: 'primary' },
          { href: '/admin/sites', label: 'Manage Sites' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Games" value={games.length} hint="All known games" />
        <StatCard label="Live" value={liveCount} hint="Currently active" />
        <StatCard label="Sites" value={sites.length} hint="Venue count" />
        <StatCard label="Events" value={eventCount} hint="Distinct event containers" />
        <StatCard label="Users" value={users.length} hint="Admin and host access" />
      </div>

      <AdminSectionCard
        title="Quick Jump"
        description="Search by game title, site, event, season, join code, or host."
      >
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a game fast..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />

          {search.trim() ? (
            filteredSearchResults.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredSearchResults.map((game) => (
                  <CompactGameCard key={game.id} game={game} subtitle="Quick match" />
                ))}
              </div>
            ) : (
              <EmptyState message="No games matched that search yet." />
            )
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <QuickLinkCard href="/admin/games">Browse Games</QuickLinkCard>
              <QuickLinkCard href="/admin/events">Browse Events</QuickLinkCard>
              <QuickLinkCard href="/admin/seasons">Browse Seasons</QuickLinkCard>
              <QuickLinkCard href="/admin/users">Manage Users</QuickLinkCard>
            </div>
          )}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          title="Upcoming Games"
          description="The next scheduled games, presented as a quick agenda instead of a dense table."
        >
          {upcomingGames.length > 0 ? (
            <div className="space-y-3">
              {upcomingGames.map((game) => (
                <UpcomingGameRow key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <EmptyState message="No upcoming games right now." />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Needs Attention"
          description="Drafts, unscheduled games, or games missing a host assignment."
        >
          {needsAttention.length > 0 ? (
            <div className="space-y-3">
              {needsAttention.map((game) => (
                <NeedsAttentionCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <EmptyState message="Nothing needs attention right now." />
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Continue Editing"
          description="Draft games are the most likely place to resume work."
        >
          {draftGames.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {draftGames.map((game) => (
                <CompactGameCard key={game.id} game={game} subtitle="Resume content work" />
              ))}
            </div>
          ) : (
            <EmptyState message="No draft games to continue." />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Structure Areas"
          description="The supporting structure for organizing venues, events, and seasons."
        >
          <div className="grid gap-3">
            <QuickLinkCard href="/admin/sites">Sites</QuickLinkCard>
            <QuickLinkCard href="/admin/events">Events</QuickLinkCard>
            <QuickLinkCard href="/admin/seasons">Seasons</QuickLinkCard>
            <QuickLinkCard href="/admin/users">Users</QuickLinkCard>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}

function QuickLinkCard({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function CompactGameCard({ game, subtitle }: { game: GameRow; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {subtitle ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {subtitle}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{game.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {game.siteName} • {game.eventName} • {game.seasonName}
          </p>
        </div>
        <StatusBadge status={game.status} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-600">
        <div>
          <span className="font-medium text-slate-700">Scheduled:</span>{' '}
          {formatSchedule(game.scheduledFor)}
        </div>
        <div>
          <span className="font-medium text-slate-700">Host:</span>{' '}
          {game.hostName ?? 'Unassigned'}
        </div>
      </div>

      <div className="mt-4">
        <GameActionButtons game={game} />
      </div>
    </div>
  );
}

function UpcomingGameRow({ game }: { game: GameRow }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="min-w-[90px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {formatMonthDay(game.scheduledFor)}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-800">
              {formatTime(game.scheduledFor)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{game.title}</h3>
              <StatusBadge status={game.status} />
            </div>

            <p className="mt-1 text-sm text-slate-600">
              {game.siteName} • {game.eventName} • {game.seasonName}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Host:{' '}
              <span className="font-medium text-slate-800">{game.hostName ?? 'Unassigned'}</span>
            </p>
          </div>
        </div>

        <div className="lg:min-w-[320px]">
          <GameActionButtons game={game} />
        </div>
      </div>
    </div>
  );
}

function NeedsAttentionCard({ game }: { game: GameRow }) {
  const reasons = buildAttentionReasons(game);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            {buildAttentionHeadline(reasons)}
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{game.title}</h3>
          <p className="mt-1 text-sm text-slate-700">
            {game.siteName} • {game.eventName} • {game.seasonName}
          </p>
        </div>

        <StatusBadge status={game.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span
            key={`${game.id}-${reason}`}
            className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800"
          >
            {reason}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <div>
          <span className="font-medium text-slate-800">Scheduled:</span>{' '}
          {formatSchedule(game.scheduledFor)}
        </div>
        <div>
          <span className="font-medium text-slate-800">Host:</span>{' '}
          {game.hostName ?? 'Unassigned'}
        </div>
      </div>

      <div className="mt-4">
        <GameActionButtons game={game} />
      </div>
    </div>
  );
}

function GameActionButtons({ game }: { game: GameRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/games/${game.id}/editor`}
        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
      >
        Edit Content
      </Link>
      <Link
        href={`/admin/games/${game.id}`}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Open Game
      </Link>
      <Link
        href={`/dashboard/host/${game.id}/command`}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Host View
      </Link>
    </div>
  );
}

function buildAttentionReasons(game: GameRow): string[] {
  const reasons: string[] = [];

  if (game.status.toUpperCase() === 'DRAFT') {
    reasons.push('Draft');
  }
  if (!game.scheduledFor) {
    reasons.push('Unscheduled');
  }
  if (!game.hostName) {
    reasons.push('Missing host');
  }

  return reasons;
}

function buildAttentionHeadline(reasons: string[]): string {
  if (reasons.includes('Draft') && reasons.includes('Unscheduled')) {
    return 'Game setup incomplete';
  }
  if (reasons.includes('Missing host')) {
    return 'Host assignment needed';
  }
  if (reasons.includes('Unscheduled')) {
    return 'Schedule needed';
  }
  if (reasons.includes('Draft')) {
    return 'Draft ready to finish';
  }

  return 'Needs attention';
}

function formatSchedule(value: string | null): string {
  if (!value) {
    return 'Unscheduled';
  }
  return new Date(value).toLocaleString();
}

function formatMonthDay(value: string | null): string {
  if (!value) {
    return 'No date';
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'TBD';
  }
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
