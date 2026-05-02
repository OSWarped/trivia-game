'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../_components/AdminPageHeader';
import AdminSectionCard from '../_components/AdminSectionCard';
import GameCreatePanel from '../_components/GameCreatePanel';
import GamesFiltersBar from '../_components/GamesFiltersBar';
import GamesTable from '../_components/GamesTable';
import LoadingCard from '../_components/LoadingCard';
import QuickFilterChips from '../_components/QuickFilterChips';
import type { GameRow, SeasonSummary, SiteGroup, SiteRow, UserRow } from '../_lib/types';
import { filterGames, flattenGames, sortGamesBySchedule } from '../_lib/utils';

export default function AdminGamesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [siteId, setSiteId] = useState('ALL');
  const [datePreset, setDatePreset] = useState<
    'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30'
  >('NEXT_30');

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const [gamesRes, sitesRes, seasonsRes, usersRes] = await Promise.all([
        fetch('/api/admin/games', { cache: 'no-store' }),
        fetch('/api/admin/sites', { cache: 'no-store' }),
        fetch('/api/admin/seasons', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!gamesRes.ok || !sitesRes.ok || !seasonsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load game index.');
      }

      const gameGroups = (await gamesRes.json()) as SiteGroup[];
      const siteRows = (await sitesRes.json()) as SiteRow[];
      const seasonRows = (await seasonsRes.json()) as SeasonSummary[];
      const userRows = (await usersRes.json()) as UserRow[];

      setGames(sortGamesBySchedule(flattenGames(gameGroups)));
      setSites(siteRows.sort((a, b) => a.name.localeCompare(b.name)));
      setSeasons(
        [...seasonRows].sort((a, b) => {
          const siteCompare = a.siteName.localeCompare(b.siteName);
          if (siteCompare !== 0) return siteCompare;
          const eventCompare = a.eventName.localeCompare(b.eventName);
          if (eventCompare !== 0) return eventCompare;
          return a.name.localeCompare(b.name);
        })
      );
      setUsers(userRows);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load games.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredGames = useMemo(() => {
    return filterGames(games, {
      search,
      status,
      siteId,
      datePreset,
    });
  }, [datePreset, games, search, siteId, status]);

  const draftCount = useMemo(
    () => games.filter((game) => game.status.toUpperCase() === 'DRAFT').length,
    [games]
  );

  const liveCount = useMemo(
    () => games.filter((game) => game.status.toUpperCase() === 'LIVE').length,
    [games]
  );

  const upcomingCount = useMemo(
    () =>
      games.filter((game) => {
        if (!game.scheduledFor) {
          return false;
        }

        return new Date(game.scheduledFor) >= new Date();
      }).length,
    [games]
  );

  if (loading) {
    return <LoadingCard label="Loading games..." />;
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
        eyebrow="Daily Work"
        title="Games"
        description="Start here to schedule trivia, finish drafts, find upcoming games, or jump into hosting."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Upcoming
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {upcomingCount}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Drafts
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {draftCount}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Live
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {liveCount}
          </div>
        </div>
      </div>

      <AdminSectionCard
        title="Schedule a Game"
        description="Pick where the game belongs, set the date and host, then add questions when you are ready."
      >
        <GameCreatePanel
          seasons={seasons}
          users={users}
          onCreated={loadData}
          title="New Trivia Game"
          description="Choose the location, trivia night, and season in one step. If something is missing, add it from Locations first."
          submitLabel="Schedule Game"
        />
      </AdminSectionCard>

      <AdminSectionCard
        title="Find Games"
        description="Use quick filters when you know what you are looking for, or search by game, location, trivia night, season, join code, or host."
      >
        <div className="space-y-4">
          <GamesFiltersBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            siteId={siteId}
            onSiteIdChange={setSiteId}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            sites={sites}
          />

          <QuickFilterChips active={datePreset} onSelect={setDatePreset} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Results"
        description="Open the game plan, edit its questions, or switch to the host view."
      >
        <GamesTable games={filteredGames} />
      </AdminSectionCard>
    </div>
  );
}
