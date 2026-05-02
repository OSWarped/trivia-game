'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminPageHeader from '../../_components/AdminPageHeader';
import AdminSectionCard from '../../_components/AdminSectionCard';
import Breadcrumbs from '../../_components/Breadcrumbs';
import LoadingCard from '../../_components/LoadingCard';
import RecordTabs from '../../_components/RecordTabs';
import StatCard from '../../_components/StatCard';
import StatusBadge from '../../_components/StatusBadge';
import type { GameDetail, UserRow } from '../../_lib/types';
import { toDateTimeLocal } from '../../_lib/utils';
import GameJsonImportPanel from './components/GameJsonImportPanel';

type AdminGameWorkspacePageProps = {
  params: Promise<{ id: string }>;
};

export default function AdminGameWorkspacePage({ params }: AdminGameWorkspacePageProps) {
  const { id: gameId } = use(params);
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [game, setGame] = useState<GameDetail | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [title, setTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [hostId, setHostId] = useState('');
  const [special, setSpecial] = useState(false);
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('DRAFT');

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [gameRes, usersRes] = await Promise.all([
        fetch(`/api/admin/games/${gameId}`, { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);

      if (!gameRes.ok || !usersRes.ok) {
        throw new Error('Failed to load game workspace.');
      }

      const gameData = (await gameRes.json()) as GameDetail;
      const userRows = (await usersRes.json()) as UserRow[];

      setGame(gameData);
      setUsers(userRows);
      setTitle(gameData.title);
      setScheduledFor(toDateTimeLocal(gameData.scheduledFor));
      setHostId(gameData.host?.id ?? '');
      setSpecial(gameData.special);
      setTag(gameData.tag ?? '');
      setStatus(gameData.status);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load game.'
      );
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tabs = useMemo(
    () => [
      { label: 'Overview', href: `/admin/games/${gameId}` },
      { label: 'Content', href: `/admin/games/${gameId}/editor` },
    ],
    [gameId]
  );

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setNotice('Game title is required.');
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          scheduledFor: scheduledFor || null,
          hostId: hostId || null,
          special,
          tag: tag.trim() || null,
          status,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save game.');
      }

      setNotice('Game details saved.');
      await loadData();
    } catch (saveError) {
      setNotice(
        saveError instanceof Error ? saveError.message : 'Failed to save game.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingCard label="Loading game workspace..." />;
  }

  if (error || !game) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error ?? 'Unable to load game.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Games', href: '/admin/games' },
          { label: game.title },
        ]}
      />

      <AdminPageHeader
        eyebrow="Game Workspace"
        title={game.title}
        description={`${game.season.event.site.name} • ${game.season.event.name} • ${game.season.name}`}
        actions={[
          { href: `/admin/games/${gameId}/editor`, label: 'Edit Content', tone: 'primary' },
          { href: `/dashboard/host/${gameId}/command`, label: 'Host View' },
        ]}
      />

      <RecordTabs tabs={tabs} currentPath={pathname} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Status" value={game.status} />
        <StatCard label="Join Code" value={game.joinCode} />
        <StatCard label="Host" value={game.host?.name ?? 'Unassigned'} />
        <StatCard
          label="Schedule"
          value={game.scheduledFor ? new Date(game.scheduledFor).toLocaleString() : 'Unscheduled'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminSectionCard
          title="Game Details"
          description="This page is the game home. Use it for metadata and jump to the editor for content work."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Scheduled For
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Host
                <select
                  value={hostId}
                  onChange={(event) => setHostId(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="LIVE">Live</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tag
              <input
                type="text"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={special}
                onChange={(event) => setSpecial(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Special game
            </label>

            {notice ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {notice}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save Details'}
              </button>
              <Link
                href={`/admin/games/${gameId}/editor`}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open Content Editor
              </Link>
            </div>
          </div>
        </AdminSectionCard>

        <div className="space-y-6">
          <AdminSectionCard
            title="Context"
            description="Hierarchy stays visible here without slowing down day-to-day navigation."
          >
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span>Location</span>
                <Link href={`/admin/sites/${game.season.event.site.id}`} className="font-medium text-slate-900 transition hover:underline">
                  {game.season.event.site.name}
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span>Trivia Night</span>
                <Link href={`/admin/events/${game.season.event.id}`} className="font-medium text-slate-900 transition hover:underline">
                  {game.season.event.name}
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span>Season</span>
                <Link href={`/admin/seasons/${game.season.id}`} className="font-medium text-slate-900 transition hover:underline">
                  {game.season.name}
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span>Status</span>
                <StatusBadge status={game.status} />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="JSON Tools"
            description="Preserve the working import workflow while the rest of the admin area gets cleaned up."
          >
            <GameJsonImportPanel gameId={gameId} />
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}
