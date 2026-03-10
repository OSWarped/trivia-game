import type { SiteGroup, SiteRow, GameRow } from '../types/workspace.types';

export function formatDateTime(date: string | null): string {
  if (!date) return 'Unscheduled';
  return new Date(date).toLocaleString();
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function normalizeSiteRows(
  siteGroups: SiteGroup[],
  siteRecords: SiteRow[]
): SiteRow[] {
  const siteMap = new Map<string, SiteRow>();

  for (const site of siteRecords) {
    siteMap.set(site.id, {
      ...site,
      status: 'ACTIVE',
      upcomingGames: 0,
      activeEvent: null,
    });
  }

  for (const group of siteGroups) {
    const existing = siteMap.get(group.siteId);

    const upcomingGames = group.events.reduce(
      (sum, event) => sum + event.upcomingGames.length,
      0
    );

    const activeEvent =
      group.events.find((event) => event.upcomingGames.length > 0)?.eventName ??
      group.events[0]?.eventName ??
      existing?.activeEvent ??
      null;

    siteMap.set(group.siteId, {
      id: group.siteId,
      name: group.siteName,
      address: existing?.address ?? null,
      status: existing?.status ?? 'ACTIVE',
      upcomingGames,
      activeEvent,
    });
  }

  return Array.from(siteMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function flattenGames(siteGroups: SiteGroup[]): GameRow[] {
  return siteGroups.flatMap((site) =>
    site.events.flatMap((event) =>
      [...event.upcomingGames, ...event.pastGames].map((game) => ({
        id: game.id,
        title: game.title,
        siteId: site.siteId,
        siteName: site.siteName,
        eventId: event.eventId,
        eventName: event.eventName,
        seasonId: game.season.id,
        seasonName: game.season.name,
        scheduledFor: game.scheduledFor,
        status: game.status,
        hostId: game.host?.id ?? null,
        hostName: game.host?.name ?? null,
        joinCode: game.joinCode ?? null,
        special: game.special,
        tag: game.tag ?? null,
      }))
    )
  );
}