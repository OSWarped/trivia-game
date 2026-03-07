'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinableTeam {
  id: string;
  name: string;
}

interface JoinGamePayload {
  id: string;
  title: string;
  status: string;
  scheduledFor: string | null;
  site?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
  teams: JoinableTeam[];
}

interface JoinSessionPayload {
  sessionToken: string;
  deviceId: string;
  status: string;
  joinedAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface SessionApiResponse {
  ok?: boolean;
  teamId?: string;
  teamName?: string;
  gameId?: string;
  gameStatus?: string;
  route?: string;
  redirectTo?: string;
  session?: JoinSessionPayload;
  error?: string;
  code?: string;
  clearStoredSession?: boolean;
}

interface StoredTeamSession {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionToken: string;
  deviceId: string;
  lastKnownStatus: string;
  lastKnownScreen: 'lobby' | 'play';
  joinedAt: string;
  lastSeenAt: string;
}

interface StoredDeviceIdentity {
  deviceId: string;
  createdAt: string;
}

const STORAGE_PREFIX = 'trivia';
const JOINABLE_STATUSES = new Set(['SCHEDULED', 'LIVE']);

function formatScheduledFor(value: string | null): string {
  if (!value) return 'TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return date.toLocaleString();
}

function getStoredDeviceIdentity(): StoredDeviceIdentity | null {
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

function getStoredGameSession(gameId: string): StoredTeamSession | null {
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
      (parsed.lastKnownScreen !== 'lobby' && parsed.lastKnownScreen !== 'play') ||
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

function clearStoredGameSession(gameId: string): void {
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

function persistSession(
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

  // Legacy compatibility while other pages are still being updated.
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

export default function JoinPageClient({ joinCode }: { joinCode: string }) {
  const router = useRouter();

  const [game, setGame] = useState<JoinGamePayload | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [pin, setPin] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttemptingResume, setIsAttemptingResume] = useState(false);

  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadGame = async () => {
      setIsLoading(true);
      setLoadError('');
      setSubmitError('');

      try {
        const res = await fetch(`/api/games/join-code/${joinCode}`, {
          cache: 'no-store',
        });

        const data = (await res.json()) as Partial<JoinGamePayload> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Unable to load game');
        }

        const normalizedGame: JoinGamePayload = {
          id: data.id ?? '',
          title: data.title ?? 'Trivia Game',
          status: data.status ?? 'UNKNOWN',
          scheduledFor: data.scheduledFor ?? null,
          site: data.site ?? null,
          teams: Array.isArray(data.teams) ? data.teams : [],
        };

        if (
          JOINABLE_STATUSES.has(normalizedGame.status) &&
          typeof window !== 'undefined'
        ) {
          const storedSession = getStoredGameSession(normalizedGame.id);

          if (storedSession) {
            if (cancelled) return;

            setIsAttemptingResume(true);

            try {
              const resumeRes = await fetch(
                `/api/games/${normalizedGame.id}/resume`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    gameId: normalizedGame.id,
                    teamId: storedSession.teamId,
                    sessionToken: storedSession.sessionToken,
                    deviceId: storedSession.deviceId,
                  }),
                }
              );

              const resumeData =
                (await resumeRes.json()) as SessionApiResponse;

              if (
                resumeRes.ok &&
                resumeData.teamId &&
                resumeData.session?.sessionToken &&
                resumeData.session.deviceId
              ) {
                const resumedStatus =
                  resumeData.gameStatus ?? normalizedGame.status;
                const resumedTeamName =
                  resumeData.teamName ?? storedSession.teamName;
                const nextUrl =
                  resumeData.route ??
                  resumeData.redirectTo ??
                  (resumedStatus === 'LIVE'
                    ? `/games/${normalizedGame.id}/play`
                    : `/games/${normalizedGame.id}/lobby`);

                const refreshedSession: StoredTeamSession = {
                  gameId: normalizedGame.id,
                  teamId: resumeData.teamId,
                  teamName: resumedTeamName,
                  sessionToken: resumeData.session.sessionToken,
                  deviceId: resumeData.session.deviceId,
                  lastKnownStatus: resumedStatus,
                  lastKnownScreen: resumedStatus === 'LIVE' ? 'play' : 'lobby',
                  joinedAt: resumeData.session.joinedAt,
                  lastSeenAt: resumeData.session.lastSeenAt,
                };

                persistSession(
                  normalizedGame.id,
                  joinCode,
                  refreshedSession,
                  getStoredDeviceIdentity()?.createdAt
                );

                router.replace(nextUrl);
                return;
              }

              if (resumeData.clearStoredSession) {
                clearStoredGameSession(normalizedGame.id);
              }

              if (!cancelled && resumeData.error) {
                setSubmitError(resumeData.error);
              }
            } catch {
              if (!cancelled) {
                setSubmitError(
                  'We could not restore your previous session. Please join again.'
                );
              }
            } finally {
              if (!cancelled) {
                setIsAttemptingResume(false);
              }
            }
          }
        }

        if (!cancelled) {
          setGame(normalizedGame);

          if (!JOINABLE_STATUSES.has(normalizedGame.status)) {
            setSubmitError('This game is not open for joining.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Unable to load game'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [joinCode, router]);

  const filteredTeams = useMemo(() => {
    if (!game) return [];

    const query = teamQuery.trim().toLowerCase();

    if (!query) {
      return game.teams;
    }

    return game.teams.filter((team) =>
      team.name.toLowerCase().includes(query)
    );
  }, [game, teamQuery]);

  const matchedTeam = useMemo(() => {
    if (!game) return null;

    const normalizedQuery = teamQuery.trim().toLowerCase();
    if (!normalizedQuery) return null;

    return (
      game.teams.find(
        (team) => team.name.trim().toLowerCase() === normalizedQuery
      ) ?? null
    );
  }, [game, teamQuery]);

  const trimmedTeamName = teamQuery.trim();
  const trimmedPin = pin.trim();

  const isJoinable = game ? JOINABLE_STATUSES.has(game.status) : false;
  const isClosed = game ? !JOINABLE_STATUSES.has(game.status) : false;
  const isScheduled = game?.status === 'SCHEDULED';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    if (!game) {
      setSubmitError('Game information is not loaded yet.');
      return;
    }

    if (!isJoinable) {
      setSubmitError('This game is not open for joining.');
      return;
    }

    if (!trimmedTeamName) {
      setSubmitError('Please enter a team name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const storedDevice = getStoredDeviceIdentity();

      const res = await fetch(`/api/games/${game.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode,
          teamId: matchedTeam?.id ?? null,
          teamName: trimmedTeamName,
          pin: trimmedPin || null,
          deviceId: storedDevice?.deviceId ?? null,
        }),
      });

      const data = (await res.json()) as SessionApiResponse;

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to join game.');
        return;
      }

      if (!data.teamId || !data.session?.sessionToken || !data.session.deviceId) {
        setSubmitError('Join succeeded, but the session payload was incomplete.');
        return;
      }

      const resolvedStatus = data.gameStatus ?? game.status;
      const resolvedTeamName = data.teamName ?? trimmedTeamName;
      const nextUrl =
        data.route ??
        data.redirectTo ??
        (resolvedStatus === 'LIVE'
          ? `/games/${game.id}/play`
          : `/games/${game.id}/lobby`);

      const storedSession: StoredTeamSession = {
        gameId: game.id,
        teamId: data.teamId,
        teamName: resolvedTeamName,
        sessionToken: data.session.sessionToken,
        deviceId: data.session.deviceId,
        lastKnownStatus: resolvedStatus,
        lastKnownScreen: resolvedStatus === 'LIVE' ? 'play' : 'lobby',
        joinedAt: data.session.joinedAt,
        lastSeenAt: data.session.lastSeenAt,
      };

      persistSession(
        game.id,
        joinCode,
        storedSession,
        storedDevice?.createdAt
      );

      router.replace(nextUrl);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to join game.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            {isAttemptingResume
              ? 'Restoring your team session...'
              : 'Loading game info...'}
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !game) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-bold">Unable to join game</h1>
          <p className="text-sm text-red-600">
            {loadError || 'Game not found.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold">Join {game.title}</h1>

        <div className="mb-4 space-y-2 text-sm text-gray-600">
          <p>
            <strong>Status:</strong> {game.status}
          </p>
          <p>
            <strong>Location:</strong> {game.site?.name ?? 'Unknown'}
          </p>
          <p>
            <strong>Scheduled:</strong> {formatScheduledFor(game.scheduledFor)}
          </p>
          {game.site?.address ? (
            <p>
              <strong>Address:</strong> {game.site.address}
            </p>
          ) : null}
        </div>

        {isScheduled ? (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            This game has not started yet. Join now and wait in the lobby for
            the host to begin.
          </div>
        ) : null}

        {isClosed ? (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            This game is not currently accepting team joins.
          </div>
        ) : null}

        {!isClosed ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="relative">
              <label htmlFor="teamName" className="mb-1 block font-medium">
                Team Name
              </label>
              <input
                id="teamName"
                type="text"
                autoComplete="off"
                value={teamQuery}
                onChange={(e) => {
                  setTeamQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Enter your team name"
                className="w-full rounded border p-2"
                required
              />

              {showSuggestions && filteredTeams.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border bg-white shadow">
                  {filteredTeams.slice(0, 8).map((team) => (
                    <li
                      key={team.id}
                      className="cursor-pointer px-3 py-2 hover:bg-blue-100"
                      onMouseDown={() => {
                        setTeamQuery(team.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {team.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <label htmlFor="pin" className="mb-1 block font-medium">
                Team PIN <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="pin"
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(digitsOnly);
                }}
                placeholder="Optional 4-digit PIN"
                className="w-full rounded border p-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                Use a PIN if you want to protect this team name for future games.
              </p>
            </div>

            {game.teams.length === 0 ? (
              <p className="text-sm text-gray-500">
                No saved team names were found for this game. You can still
                enter your team name and join.
              </p>
            ) : null}

            {submitError ? (
              <p className="text-sm text-red-600">{submitError}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !trimmedTeamName}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}