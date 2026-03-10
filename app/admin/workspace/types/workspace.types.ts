export type AdminTab = 'sites' | 'games' | 'users';

export type ModalType =
  | null
  | 'add-site'
  | 'edit-site'
  | 'add-user'
  | 'edit-user'
  | 'edit-game';

export interface SiteRow {
  id: string;
  name: string;
  address: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  upcomingGames?: number;
  activeEvent?: string | null;
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