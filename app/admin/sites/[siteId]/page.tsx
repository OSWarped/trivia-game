'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminPageHeader from '../../_components/AdminPageHeader';
import AdminSectionCard from '../../_components/AdminSectionCard';
import Breadcrumbs from '../../_components/Breadcrumbs';
import GamesTable from '../../_components/GamesTable';
import LoadingCard from '../../_components/LoadingCard';
import RecordTabs from '../../_components/RecordTabs';
import StatCard from '../../_components/StatCard';
import type { GameRow, SiteGroup, SiteRow } from '../../_lib/types';
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

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [sitesRes, gamesRes] = await Promise.all([
        fetch('/api/admin/sites', { cache: 'no-store' }),
        fetch('/api/admin/games', { cache: 'no-store' }),
      ]);

      if (!sitesRes.ok || !gamesRes.ok) {
        throw new Error('Failed to load site workspace.');
      }

      const siteRows = (await sitesRes.json()) as SiteRow[];
      const siteGroups = (await gamesRes.json()) as SiteGroup[];
      const foundSite = siteRows.find((candidate) => candidate.id === siteId) ?? null;
      const siteGames = flattenGames(siteGroups).filter((game) => game.siteId === siteId);

      setSite(foundSite);
      setGames(siteGames);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load site.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const events = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();

    for (const game of games) {
      const existing = map.get(game.eventId);
      if (existing) {
        map.set(game.eventId, { ...existing, count: existing.count + 1 });
      } else {
        map.set(game.eventId, { id: game.eventId, name: game.eventName, count: 1 });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

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
        eyebrow="Site Workspace"
        title={site.name}
        description={site.address ?? 'No address on file'}
        actions={[{ href: '/admin/games', label: 'Open Games', tone: 'primary' }]}
      />

      <RecordTabs tabs={tabs} currentPath={pathname} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Games" value={games.length} hint="Games tied to this site" />
        <StatCard label="Events" value={events.length} hint="Event containers at this site" />
        <StatCard
          label="Address"
          value={site.address ? 'On file' : 'Missing'}
          hint={site.address ?? 'No address saved'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <AdminSectionCard
          title="Events at this Site"
          description="These event containers stay available, but they no longer block the path to game work."
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
                  <span>{event.count} games</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No events are attached to this site yet.
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Games at this Site"
          description="This keeps the site workspace useful without forcing you through multiple pages before editing a game."
        >
          <GamesTable games={games} emptyMessage="No games exist for this site yet." />
        </AdminSectionCard>
      </div>
    </div>
  );
}
