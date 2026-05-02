'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminPageHeader from '../../_components/AdminPageHeader';
import AdminSectionCard from '../../_components/AdminSectionCard';
import Breadcrumbs from '../../_components/Breadcrumbs';
import GameCreatePanel from '../../_components/GameCreatePanel';
import GamesTable from '../../_components/GamesTable';
import LoadingCard from '../../_components/LoadingCard';
import RecordTabs from '../../_components/RecordTabs';
import StatCard from '../../_components/StatCard';
import type { EventSummary, GameRow, SeasonSummary, SiteGroup, SiteRow, UserRow } from '../../_lib/types';
import { flattenGames } from '../../_lib/utils';

type SitePageProps = {
  params: Promise<{ siteId: string }>;
};

export default function AdminSiteDetailPage({ params }: SitePageProps) {
  const { siteId } = use(params);
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState<SiteRow | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [sitesRes, gamesRes, eventsRes, seasonsRes, usersRes] = await Promise.all([
        fetch('/api/admin/sites', { cache: 'no-store' }),
        fetch('/api/admin/games', { cache: 'no-store' }),
        fetch('/api/admin/events', { cache: 'no-store' }),
        fetch('/api/admin/seasons', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!sitesRes.ok || !gamesRes.ok || !eventsRes.ok || !seasonsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load site workspace.');
      }

      const siteRows = (await sitesRes.json()) as SiteRow[];
      const siteGroups = (await gamesRes.json()) as SiteGroup[];
      const eventRows = (await eventsRes.json()) as EventSummary[];
      const seasonRows = (await seasonsRes.json()) as SeasonSummary[];
      const userRows = (await usersRes.json()) as UserRow[];
      const foundSite = siteRows.find((candidate) => candidate.id === siteId) ?? null;
      const siteGames = flattenGames(siteGroups).filter((game) => game.siteId === siteId);

      setSite(foundSite);
      setGames(siteGames);
      setEvents(
        eventRows
          .filter((event) => event.siteId === siteId)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setSeasons(
        seasonRows
          .filter((season) => season.siteId === siteId)
          .sort((a, b) => {
            const eventCompare = a.eventName.localeCompare(b.eventName);
            if (eventCompare !== 0) return eventCompare;
            return a.name.localeCompare(b.name);
          })
      );
      setUsers(userRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load site.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = useMemo(
    () => [{ label: 'Overview', href: `/admin/sites/${siteId}` }],
    [siteId]
  );

  if (loading) {
    return <LoadingCard label="Loading site..." />;
  }

  if (error || !site) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error ?? 'Unable to load site.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Sites', href: '/admin/sites' },
          { label: site.name },
        ]}
      />

      <AdminPageHeader
        eyebrow="Location"
        title={site.name}
        description={site.address ?? 'No address on file'}
        actions={[{ href: '/admin/games', label: 'Schedule a Game', tone: 'primary' }]}
      />

      <RecordTabs tabs={tabs} currentPath={pathname} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Games" value={games.length} hint="Games tied to this location" />
        <StatCard label="Trivia Nights" value={events.length} hint="Recurring nights at this location" />
        <StatCard
          label="Address"
          value={site.address ? 'On file' : 'Missing'}
          hint={site.address ?? 'No address saved'}
        />
      </div>

      <AdminSectionCard
        title="Schedule a Game Here"
        description="Choose one of this location's trivia nights and seasons, then set the date and host."
      >
        <GameCreatePanel seasons={seasons} users={users} onCreated={loadData} submitLabel="Schedule Game" />
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <AdminSectionCard
          title="Trivia Nights"
          description="These are the recurring trivia nights or series at this location."
        >
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{event.name}</span>
                  <span>{event.gameCount} games</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No trivia nights are attached to this location yet.
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Games at this Location"
          description="Open a game plan, edit content, or switch into host view."
        >
          <GamesTable games={games} emptyMessage="No games exist for this location yet." />
        </AdminSectionCard>
      </div>
    </div>
  );
}
