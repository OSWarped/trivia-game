'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrawerShell from './ui/DrawerShell';
import ToolbarButton from './ui/ToolbarButton';
import { formatDateTime } from '../utils/workspace.helpers';

interface EventDrawerProps {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (eventId: string) => void;
  onOpenSeason: (seasonId: string) => void;
  onOpenGame: (gameId: string) => void;
}

interface EventDetailResponse {
  id: string;
  name: string;
  site: {
    id: string;
    name: string;
    address: string | null;
  };
  seasons: {
    id: string;
    name: string;
    games: {
      id: string;
      title: string;
      scheduledFor: string | null;
      status: string;
    }[];
  }[];
}

export default function EventDrawer({
  eventId,
  open,
  onClose,
  onEdit,
  onOpenSeason,
  onOpenGame,
}: EventDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventDetailResponse | null>(null);

  useEffect(() => {
    if (!open || !eventId) return;

    let cancelled = false;

    const loadEvent = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/admin/events/${eventId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to load event.');
        }

        const data = (await res.json()) as EventDetailResponse;

        if (!cancelled) {
          setEvent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load event.');
          setEvent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadEvent();

    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  return (
    <DrawerShell
      open={open}
      title={event?.name ?? 'Event Details'}
      subtitle="Seasons and recent games for this event."
      meta={event ? `Event • ${event.site.name}` : 'Event'}
      widthClassName="max-w-xl"
      zIndexClassName="z-50"
      onClose={onClose}
      actions={
        event ? (
          <ToolbarButton
            label="Edit Event"
            onClick={() => {
              onClose();
              onEdit(event.id);
            }}
          />
        ) : undefined
      }
    >
      {loading ? (
        <div className="text-sm text-slate-600">Loading event details...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : event ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Site</div>
            <div className="mt-1 font-medium text-slate-900">{event.site.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {event.site.address ?? 'No address on file'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Seasons
            </div>

            {event.seasons.length === 0 ? (
              <div className="text-sm text-slate-500">
                No seasons found for this event.
              </div>
            ) : (
              <div className="space-y-4">
                {event.seasons.map((season) => (
                  <div
                    key={season.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{season.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {season.games.length} recent game
                          {season.games.length === 1 ? '' : 's'}
                        </div>
                      </div>

                      <ToolbarButton
                        label="Open Season"
                        onClick={() => onOpenSeason(season.id)}
                      />
                    </div>

                    {season.games.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {season.games.map((game) => (
                          <div
                            key={game.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900">
                                  {game.title}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {formatDateTime(game.scheduledFor)} · {game.status}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <ToolbarButton
                                  label="Open Game"
                                  onClick={() => onOpenGame(game.id)}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/admin/games/${game.id}/editor`)
                                  }
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                                >
                                  Edit Content
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">No event selected.</div>
      )}
    </DrawerShell>
  );
}