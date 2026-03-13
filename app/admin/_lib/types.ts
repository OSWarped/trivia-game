export interface SiteRow {
  id: string;
  name: string;
  address: string | null;
}

export interface GameListItem {
  id: string;
  title: string;
  joinCode: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  special: boolean;
  tag: string | null;
  season: {
    id: string;
    name: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface EventGroup {
  eventId: string;
  eventName: string;
  upcomingGames: GameListItem[];
  pastGames: GameListItem[];
}

export interface SiteGroup {
  siteId: string;
  siteName: string;
  events: EventGroup[];
}

export interface GameRow {
  id: string;
  title: string;
  siteId: string;
  siteName: string;
  eventId: string;
  eventName: string;
  seasonId: string;
  seasonName: string;
  scheduledFor: string | null;
  status: string;
  hostId: string | null;
  hostName: string | null;
  joinCode: string | null;
  special: boolean;
  tag: string | null;
}

export interface EventSummary {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  seasonCount: number;
  gameCount: number;
  upcomingCount: number;
}

export interface SeasonSummary {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  siteId: string;
  siteName: string;
  gameCount: number;
  upcomingCount: number;
  liveCount: number;
  firstScheduledFor: string | null;
  lastScheduledFor: string | null;
}

export interface SeasonStandingRow {
  rank: number;
  teamId: string;
  team: string;
  wins: number;
  gamesPlayed: number;
  points: number;
  averagePoints: number;
}

export interface UserRow {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface GameDetail {
  id: string;
  title: string;
  joinCode: string;
  special: boolean;
  tag: string | null;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  host: {
    id: string;
    name: string;
  } | null;
  season: {
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
  };
}

export interface EventDetail {
  id: string;
  name: string;
  site: {
    id: string;
    name: string;
    address: string | null;
  };
}

export interface SeasonDetail {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  championGameId: string | null;
  event: {
    id: string;
    name: string;
    site: {
      id: string;
      name: string;
    };
  };
}
