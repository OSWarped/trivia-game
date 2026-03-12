'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import AdminPageHeader from '../../_components/AdminPageHeader';
import AdminSectionCard from '../../_components/AdminSectionCard';
import Breadcrumbs from '../../_components/Breadcrumbs';
import GamesTable from '../../_components/GamesTable';
import LoadingCard from '../../_components/LoadingCard';
import RecordTabs from '../../_components/RecordTabs';
import StatCard from '../../_components/StatCard';
import type { GameRow, SeasonDetail } from '../../_lib/types';
import { formatDate } from '../../_lib/utils';

export default function AdminSeasonDetailPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const seasonId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<SeasonDetail | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [seasonRes, gamesRes] = await Promise.all([
        fetch(`/api/admin/seasons/${seasonId}`, { cache: 'no-store' }),
        fetch(`/api/admin/seasons/${seasonId}/games`, { cache: 'no-store' }),
      ]);

      if (!seasonRes.ok || !gamesRes.ok) {
        throw new Error('Failed to load season workspace.');
      }

      const seasonData = (await seasonRes.json()) as SeasonDetail;
      const gameRows = (await gamesRes.json()) as GameRow[];

      setSeason(seasonData);
      setGames(gameRows);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load season.'
      );
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = useMemo(
    () => [{ label: 'Overview', href: `/admin/seasons/${seasonId}` }],
    [seasonId]
  );

  if (loading) {
    return <LoadingCard label="Loading season..." />;
  }

  if (error || !season) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error ?? 'Unable to load season.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Seasons', href: '/admin/seasons' },
          { label: season.name },
        ]}
      />

      <AdminPageHeader
        eyebrow="Season Workspace"
        title={season.name}
        description={`${season.event.site.name} • ${season.event.name}`}
      />

      <RecordTabs tabs={tabs} currentPath={pathname} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Start" value={formatDate(season.startsAt)} />
        <StatCard label="End" value={formatDate(season.endsAt)} />
        <StatCard label="Active" value={season.active ? 'Yes' : 'No'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <AdminSectionCard
          title="Context"
          description="Season context stays visible here, but you can still jump straight to any game."
        >
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              Site: {season.event.site.name}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              Event: {season.event.name}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              Active season: {season.active ? 'Yes' : 'No'}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              Champion Game ID: {season.championGameId ?? 'Not assigned'}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Games"
          description="Season views are still game-first: every row keeps the primary game actions."
        >
          <GamesTable games={games} emptyMessage="No games have been created for this season yet." />
        </AdminSectionCard>
      </div>
    </div>
  );
}
