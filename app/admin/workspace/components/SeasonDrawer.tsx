'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DrawerShell from './ui/DrawerShell';
import ToolbarButton from './ui/ToolbarButton';
import { formatDateTime } from '../utils/workspace.helpers';

interface SeasonDrawerProps {
  seasonId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (seasonId: string) => void;
  onOpenGame?: (gameId: string) => void;
}

interface SeasonDetailResponse {
  id: string;
  name: string;
  event: {
    id: string;
    name: string;
    site: {
      id: string;
      name: string;
    };
  };
}

interface SeasonGamesResponseItem {
  id: string;
  title: string;
  status: string;
  scheduledFor: string | null;
  joinCode?: string | null;
  host?: {
    id: string;
    name: string;
  } | null;
  season?: {
    id: string;
  };
}

export default function SeasonDrawer({
  seasonId,
  open,
  onClose,
  onEdit,
  onOpenGame,
}: SeasonDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [season, setSeason] = useState<SeasonDetailResponse | null>(null);
  const [games, setGames] = useState<SeasonGamesResponseItem[]>([]);

  useEffect(() => {
    if (!open || !seasonId) return;

    let cancelled = false;

    const loadSeason = async () => {
      try {
        setLoading(true);
        setError('');

        const [seasonRes, gamesRes] = await Promise.all([
          fetch(`/api/admin/seasons/${seasonId}`, {
            cache: 'no-store',
          }),
          fetch('/api/admin/games', {
            cache: 'no-store',
          }),
        ]);

        if (!seasonRes.ok) {
          const data = (await seasonRes.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load season.');
        }

        if (!gamesRes.ok) {
          const data = (await gamesRes.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load games.');
        }

        const seasonData = (await seasonRes.json()) as SeasonDetailResponse;
        const groupedGames = (await gamesRes.json()) as Array<{
          siteId: string;
          siteName: string;
          events: Array<{
            eventId: string;
            eventName: string;
            upcomingGames: SeasonGamesResponseItem[];
            pastGames: SeasonGamesResponseItem[];
          }>;
        }>;

        const flattenedGames = groupedGames.flatMap((site) =>
          site.events.flatMap((event) => [
            ...event.upcomingGames,
            ...event.pastGames,
          ])
        );

        const filteredGames = flattenedGames.filter(
          (game) => game.season?.id === seasonId
        );

        if (!cancelled) {
          setSeason(seasonData);
          setGames(filteredGames);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load season.');
          setSeason(null);
          setGames([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSeason();

    return () => {
      cancelled = true;
    };
  }, [open, seasonId]);

  return (
    <DrawerShell
      open={open}
      title={season?.name ?? 'Season Details'}
      subtitle="Games and season context."
      meta={
        season
          ? `Season • ${season.event.site.name} / ${season.event.name}`
          : 'Season'
      }
      widthClassName="max-w-lg"
      zIndexClassName="z-[60]"
      onClose={onClose}
      actions={
        season ? (
          <ToolbarButton
            label="Edit Season"
            onClick={() => {
              onClose();
              onEdit(season.id);
            }}
          />
        ) : undefined
      }
    >
      {loading ? (
        <div className="text-sm text-slate-600">Loading season details...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : season ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Site</div>
            <div className="mt-1 font-medium text-slate-900">
              {season.event.site.name}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Event</div>
            <div className="mt-1 font-medium text-slate-900">
              {season.event.name}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Games
            </div>

            {games.length === 0 ? (
              <div className="text-sm text-slate-500">
                No games found for this season.
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {game.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatDateTime(game.scheduledFor)} · {game.status}
                        </div>
                        {game.host?.name ? (
                          <div className="mt-1 text-sm text-slate-500">
                            Host: {game.host.name}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {onOpenGame ? (
                          <ToolbarButton
                            label="Open Game"
                            onClick={() => onOpenGame(game.id)}
                          />
                        ) : null}

                        <Link
                          href={`/admin/games/${game.id}/editor`}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          Edit Content
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/seasons/${season.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open Season Page
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">No season selected.</div>
      )}
    </DrawerShell>
  );
}