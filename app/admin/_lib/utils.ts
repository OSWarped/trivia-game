import type {
  EventSummary,
  GameRow,
  SeasonSummary,
  SiteGroup,
  SiteRow,
} from './types';

export function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Unscheduled';
  }

  return new Date(value).toLocaleString();
}

export function formatDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function getStatusBadgeClasses(status: string): string {
  switch (status.toUpperCase()) {
    case 'LIVE':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'CLOSED':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    case 'DRAFT':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'SCHEDULED':
      return 'border-blue-300 bg-blue-50 text-blue-700';
    case 'CANCELED':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-600';
  }
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
        tag: game.tag,
      }))
    )
  );
}

export function buildEventSummaries(games: GameRow[]): EventSummary[] {
  const map = new Map<string, EventSummary>();

  for (const game of games) {
    const existing = map.get(game.eventId);

    if (!existing) {
      map.set(game.eventId, {
        id: game.eventId,
        name: game.eventName,
        siteId: game.siteId,
        siteName: game.siteName,
        seasonCount: 1,
        gameCount: 1,
        upcomingCount: isUpcoming(game.scheduledFor) ? 1 : 0,
      });
      continue;
    }

    const seasonCount = existing.seasonCount;
    const seenSeason = games.some(
      (candidate) =>
        candidate.eventId === game.eventId &&
        candidate.seasonId === game.seasonId &&
        candidate.id !== game.id
    );

    map.set(game.eventId, {
      ...existing,
      seasonCount: seenSeason ? seasonCount : seasonCount + 1,
      gameCount: existing.gameCount + 1,
      upcomingCount:
        existing.upcomingCount + (isUpcoming(game.scheduledFor) ? 1 : 0),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSeasonSummaries(games: GameRow[]): SeasonSummary[] {
  const map = new Map<string, SeasonSummary>();

  for (const game of games) {
    const existing = map.get(game.seasonId);

    if (!existing) {
      map.set(game.seasonId, {
        id: game.seasonId,
        name: game.seasonName,
        eventId: game.eventId,
        eventName: game.eventName,
        siteId: game.siteId,
        siteName: game.siteName,
        gameCount: 1,
        upcomingCount: isUpcoming(game.scheduledFor) ? 1 : 0,
        liveCount: game.status.toUpperCase() === 'LIVE' ? 1 : 0,
        firstScheduledFor: game.scheduledFor,
        lastScheduledFor: game.scheduledFor,
      });
      continue;
    }

    map.set(game.seasonId, {
      ...existing,
      gameCount: existing.gameCount + 1,
      upcomingCount:
        existing.upcomingCount + (isUpcoming(game.scheduledFor) ? 1 : 0),
      liveCount: existing.liveCount + (game.status.toUpperCase() === 'LIVE' ? 1 : 0),
      firstScheduledFor: minDate(existing.firstScheduledFor, game.scheduledFor),
      lastScheduledFor: maxDate(existing.lastScheduledFor, game.scheduledFor),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSiteSummaries(
  sites: SiteRow[],
  games: GameRow[]
): Array<SiteRow & { eventCount: number; gameCount: number; upcomingCount: number }> {
  return sites
    .map((site) => {
      const siteGames = games.filter((game) => game.siteId === site.id);
      const eventIds = new Set(siteGames.map((game) => game.eventId));

      return {
        ...site,
        eventCount: eventIds.size,
        gameCount: siteGames.length,
        upcomingCount: siteGames.filter((game) => isUpcoming(game.scheduledFor)).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isUpcoming(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return new Date(value) >= new Date();
}

export function minDate(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return new Date(a) <= new Date(b) ? a : b;
}

export function maxDate(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return new Date(a) >= new Date(b) ? a : b;
}

export function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export interface GameFilters {
  search: string;
  status: string;
  siteId: string;
  datePreset: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30';
}

export function filterGames(games: GameRow[], filters: GameFilters): GameRow[] {
  const now = new Date();
  const nextThirty = new Date();
  nextThirty.setDate(nextThirty.getDate() + 30);

  return games.filter((game) => {
    if (filters.status !== 'ALL' && game.status.toUpperCase() !== filters.status) {
      return false;
    }

    if (filters.siteId !== 'ALL' && game.siteId !== filters.siteId) {
      return false;
    }

    if (filters.datePreset === 'UPCOMING') {
      if (!game.scheduledFor || new Date(game.scheduledFor) < now) {
        return false;
      }
    }

    if (filters.datePreset === 'PAST') {
      if (!game.scheduledFor || new Date(game.scheduledFor) >= now) {
        return false;
      }
    }

    if (filters.datePreset === 'LIVE' && game.status.toUpperCase() !== 'LIVE') {
      return false;
    }

    if (filters.datePreset === 'NEXT_30') {
      if (!game.scheduledFor) {
        return false;
      }

      const scheduled = new Date(game.scheduledFor);
      if (scheduled < now || scheduled > nextThirty) {
        return false;
      }
    }

    if (!filters.search.trim()) {
      return true;
    }

    const searchText = [
      game.title,
      game.siteName,
      game.eventName,
      game.seasonName,
      game.joinCode ?? '',
      game.hostName ?? '',
    ].join(' ');

    return includesText(searchText, filters.search);
  });
}

export function sortGamesBySchedule(games: GameRow[]): GameRow[] {
  return [...games].sort((a, b) => {
    if (!a.scheduledFor && !b.scheduledFor) {
      return a.title.localeCompare(b.title);
    }

    if (!a.scheduledFor) {
      return 1;
    }

    if (!b.scheduledFor) {
      return -1;
    }

    return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
  });
}
