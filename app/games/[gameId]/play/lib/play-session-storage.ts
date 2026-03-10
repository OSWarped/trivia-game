const STORAGE_PREFIX = 'trivia';

export type StoredScreen = 'lobby' | 'play';

export interface StoredTeamSession {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionToken: string;
  deviceId: string;
  lastKnownStatus: string;
  lastKnownScreen: StoredScreen;
  joinedAt: string;
  lastSeenAt: string;
}

export interface StoredDeviceIdentity {
  deviceId: string;
  createdAt: string;
}

export function getStoredGameSession(gameId: string): StoredTeamSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${gameId}:session`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredTeamSession>;

    if (
      typeof parsed.gameId !== 'string' ||
      typeof parsed.teamId !== 'string' ||
      typeof parsed.teamName !== 'string' ||
      typeof parsed.sessionToken !== 'string' ||
      typeof parsed.deviceId !== 'string' ||
      typeof parsed.lastKnownStatus !== 'string' ||
      (parsed.lastKnownScreen !== 'lobby' &&
        parsed.lastKnownScreen !== 'play' &&
        parsed.lastKnownScreen !== 'answer-reveal' &&
        parsed.lastKnownScreen !== 'leaderboard') ||
      typeof parsed.joinedAt !== 'string' ||
      typeof parsed.lastSeenAt !== 'string'
    ) {
      return null;
    }

    return {
      gameId: parsed.gameId,
      teamId: parsed.teamId,
      teamName: parsed.teamName,
      sessionToken: parsed.sessionToken,
      deviceId: parsed.deviceId,
      lastKnownStatus: parsed.lastKnownStatus,
      lastKnownScreen: parsed.lastKnownScreen,
      joinedAt: parsed.joinedAt,
      lastSeenAt: parsed.lastSeenAt,
    };
  } catch {
    return null;
  }
}

export function getStoredDeviceIdentity(): StoredDeviceIdentity | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:device`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDeviceIdentity>;

    if (!parsed.deviceId || typeof parsed.deviceId !== 'string') {
      return null;
    }

    return {
      deviceId: parsed.deviceId,
      createdAt:
        typeof parsed.createdAt === 'string'
          ? parsed.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearStoredGameSession(gameId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:session`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:teamId`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:teamName`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:gameId`);
  localStorage.removeItem(`${STORAGE_PREFIX}:${gameId}:joinCode`);

  try {
    const lastSessionRaw = localStorage.getItem(`${STORAGE_PREFIX}:lastSession`);
    if (lastSessionRaw) {
      const parsed = JSON.parse(lastSessionRaw) as { gameId?: string };
      if (parsed.gameId === gameId) {
        localStorage.removeItem(`${STORAGE_PREFIX}:lastSession`);
      }
    }
  } catch {
    localStorage.removeItem(`${STORAGE_PREFIX}:lastSession`);
  }

  if (localStorage.getItem('gameId') === gameId) {
    localStorage.removeItem('teamId');
    localStorage.removeItem('teamName');
    localStorage.removeItem('gameId');
    localStorage.removeItem('teamSession');
  }
}

export function persistSession(
  gameId: string,
  joinCode: string,
  storedSession: StoredTeamSession,
  deviceCreatedAt?: string
): void {
  if (typeof window === 'undefined') return;

  const createdAt = deviceCreatedAt ?? new Date().toISOString();

  localStorage.setItem(
    `${STORAGE_PREFIX}:${gameId}:session`,
    JSON.stringify(storedSession)
  );

  localStorage.setItem(
    `${STORAGE_PREFIX}:device`,
    JSON.stringify({
      deviceId: storedSession.deviceId,
      createdAt,
    } as StoredDeviceIdentity)
  );

  localStorage.setItem(
    `${STORAGE_PREFIX}:lastSession`,
    JSON.stringify({
      gameId,
      updatedAt: new Date().toISOString(),
    })
  );

  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:teamId`, storedSession.teamId);
  localStorage.setItem(
    `${STORAGE_PREFIX}:${gameId}:teamName`,
    storedSession.teamName
  );
  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:gameId`, gameId);
  localStorage.setItem(`${STORAGE_PREFIX}:${gameId}:joinCode`, joinCode);

  localStorage.setItem('teamId', storedSession.teamId);
  localStorage.setItem('teamName', storedSession.teamName);
  localStorage.setItem('gameId', gameId);
  localStorage.setItem(
    'teamSession',
    JSON.stringify({
      gameId,
      teamId: storedSession.teamId,
      teamName: storedSession.teamName,
    })
  );
}