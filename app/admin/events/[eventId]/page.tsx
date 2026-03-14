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
import type { EventDetail, GameRow, SeasonSummary, SiteGroup, UserRow } from '../../_lib/types';
import { flattenGames } from '../../_lib/utils';

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default function AdminEventDetailPage({ params }: EventPageProps) {
  const { eventId } = use(params);
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [eventRes, gamesRes, seasonsRes, usersRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`, { cache: 'no-store' }),
        fetch('/api/admin/games', { cache: 'no-store' }),
        fetch('/api/admin/seasons', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!eventRes.ok || !gamesRes.ok || !seasonsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load event workspace.');
      }

      const eventData = (await eventRes.json()) as EventDetail;
      const siteGroups = (await gamesRes.json()) as SiteGroup[];
      const eventGames = flattenGames(siteGroups).filter((game) => game.eventId === eventId);
      const seasonRows = (await seasonsRes.json()) as SeasonSummary[];
      const userRows = (await usersRes.json()) as UserRow[];

      setEvent(eventData);
      setGames(eventGames);
      setSeasons(
        seasonRows
          .filter((season) => season.eventId === eventId)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setUsers(userRows);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load event.'
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = useMemo(
    () => [{ label: 'Overview', href: `/admin/events/${eventId}` }],
    [eventId]
  );

  if (loading) {
    return <LoadingCard label="Loading event..." />;
  }

  if (error || !event) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error ?? 'Unable to load event.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Events', href: '/admin/events' },
          { label: event.name },
        ]}
      />

      <AdminPageHeader
        eyebrow="Event Workspace"
        title={event.name}
        description={`${event.site.name}${event.site.address ? ` • ${event.site.address}` : ''}`}
        actions={[{ href: '/admin/games', label: 'Open Games', tone: 'primary' }]}
      />

      <RecordTabs tabs={tabs} currentPath={pathname} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Games" value={games.length} hint="Games tied to this event" />
        <StatCard label="Seasons" value={seasons.length} hint="Season containers in this event" />
        <StatCard label="Site" value={event.site.name} hint={event.site.address ?? 'No address saved'} />
      </div>

      <AdminSectionCard
        title="Add Game in this Event"
        description="Pick any season in this event and create the next scheduled game without leaving the event workspace."
      >
        <GameCreatePanel seasons={seasons} users={users} onCreated={loadData} submitLabel="Add Game to Event" />
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <AdminSectionCard
          title="Seasons"
          description="Seasons organize the event, but every season still leads back to a direct game workflow."
        >
          <div className="space-y-3">
            {seasons.map((season) => (
              <Link
                key={season.id}
                href={`/admin/seasons/${season.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{season.name}</span>
                <span>{season.gameCount} games</span>
              </Link>
            ))}

            {seasons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No seasons found for this event yet.
              </div>
            ) : null}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Games"
          description="Even inside the event workspace, the game table keeps the fast actions front and center."
        >
          <GamesTable games={games} emptyMessage="No games are attached to this event yet." />
        </AdminSectionCard>
      </div>
    </div>
  );
}
