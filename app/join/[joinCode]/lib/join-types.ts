export type SuggestionSource = 'CURRENT_GAME' | 'KNOWN_SITE';
export type SessionControlMode = 'NORMAL' | 'HOST_APPROVAL' | 'LOCKED';

export interface JoinableTeam {
  id: string;
  name: string;
  normalizedKey: string;
  source: SuggestionSource;
  inCurrentGame: boolean;
  pinProtected: boolean;
  siteAppearanceCount: number;
  lastPlayedAtSite: string | null;
  currentGameTeamGameId: string | null;
  sessionControlMode: SessionControlMode | null;
}

export interface JoinGamePayload {
  id: string;
  title: string;
  status: string;
  scheduledFor: string | null;
  joinCode: string;
  site: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  teams: JoinableTeam[];
}

export interface JoinSessionPayload {
  sessionToken: string;
  deviceId: string;
  status: string;
  joinedAt: string;
  lastSeenAt: string;
  expiresAt?: string;
}

export interface SessionApiResponse {
  ok?: boolean;
  code?: string;
  error?: string;
  teamId?: string;
  teamName?: string;
  gameId?: string;
  gameStatus?: string;
  route?: string;
  redirectTo?: string;
  session?: JoinSessionPayload;
}

export interface StoredTeamSession {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionToken: string;
  deviceId: string;
  lastKnownStatus: string;
  lastKnownScreen: 'lobby' | 'play' | 'answer-reveal' | 'leaderboard';
  joinedAt: string;
  lastSeenAt: string;
}