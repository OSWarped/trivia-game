'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBackground from '@/components/AppBackground';

type SuggestionSource = 'CURRENT_GAME' | 'KNOWN_SITE';
type SessionControlMode = 'NORMAL' | 'HOST_APPROVAL' | 'LOCKED';

interface JoinableTeam {
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
  lastKnownScreen: 'lobby' | 'play' | 'answer-reveal' | 'leaderboard';
  joinedAt: string;
  lastSeenAt: string;
}

interface StoredDeviceIdentity {
  deviceId: string;
  createdAt: string;
}

const STORAGE_PREFIX = 'trivia';
const JOINABLE_STATUSES = new Set(['SCHEDULED', 'LIVE']);

function normalizeTeamNameForCompare(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatScheduledFor(value: string | null): string {
  if (!value) return 'TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return date.toLocaleString();
}

function formatLastPlayed(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString();
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

function getSuggestionBadges(team: JoinableTeam): string[] {
  const badges: string[] = [];

  if (team.inCurrentGame) {
    badges.push('In this game');
  } else if (team.source === 'KNOWN_SITE') {
    badges.push('Known at this site');
  }

  if (team.pinProtected) {
    badges.push('PIN');
  }

  if (team.sessionControlMode === 'HOST_APPROVAL') {
    badges.push('Approval');
  }

  if (team.sessionControlMode === 'LOCKED') {
    badges.push('Locked');
  }

  return badges;
}

function getSubmitErrorMessage(data: SessionApiResponse): string {
  switch (data.code) {
    case 'HOST_APPROVAL_REQUIRED':
      return (
        data.error || 'This team requires host approval before joining.'
      );
    case 'TEAM_LOCKED':
      return (
        data.error || 'This team has been locked by the host for this game.'
      );
    case 'DEVICE_ALREADY_JOINED':
      return (
        data.error ||
        'This device is already joined to another team for this game. Resume that team instead of switching now.'
      );
    default:
      return data.error || 'Failed to join game.';
  }
}

export default function JoinPageClient({ joinCode }: { joinCode: string }) {
  const router = useRouter();

  const [game, setGame] = useState<JoinGamePayload | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttemptingResume, setIsAttemptingResume] = useState(false);

  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [approvalPending, setApprovalPending] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadGame = async () => {
      setIsLoading(true);
      setLoadError('');
      setSubmitError('');
      setApprovalPending(false);
      setApprovalMessage('');

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
                setSubmitError(getSubmitErrorMessage(resumeData));
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

  const normalizedQuery = useMemo(
    () => normalizeTeamNameForCompare(teamQuery),
    [teamQuery]
  );

  const selectedTeam = useMemo(() => {
    if (!game || !selectedTeamId) return null;
    return game.teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [game, selectedTeamId]);

  const exactNormalizedMatch = useMemo(() => {
    if (!game || !normalizedQuery) return null;

    return (
      game.teams.find((team) => team.normalizedKey === normalizedQuery) ?? null
    );
  }, [game, normalizedQuery]);

  const hintedTeam = selectedTeam ?? exactNormalizedMatch ?? null;

  const filteredTeams = useMemo(() => {
    if (!game) return [];

    if (!normalizedQuery) {
      return game.teams.slice(0, 8);
    }

    return game.teams
      .filter((team) => {
        const normalizedName = normalizeTeamNameForCompare(team.name);
        return (
          normalizedName.includes(normalizedQuery) ||
          team.normalizedKey.includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  }, [game, normalizedQuery]);

  useEffect(() => {
    if (!selectedTeam) return;

    if (selectedTeam.normalizedKey !== normalizedQuery) {
      setSelectedTeamId(null);
    }
  }, [selectedTeam, normalizedQuery]);

  const trimmedTeamName = teamQuery.trim();
  const trimmedPin = pin.trim();

  const isJoinable = game ? JOINABLE_STATUSES.has(game.status) : false;
  const isClosed = game ? !JOINABLE_STATUSES.has(game.status) : false;
  const isScheduled = game?.status === 'SCHEDULED';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');
    setApprovalPending(false);
    setApprovalMessage('');

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
      const resolvedTeamId = selectedTeamId ?? exactNormalizedMatch?.id ?? null;

      const res = await fetch(`/api/games/${game.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode,
          teamId: resolvedTeamId,
          teamName: trimmedTeamName,
          pin: trimmedPin || null,
          deviceId: storedDevice?.deviceId ?? null,
        }),
      });

      const raw = await res.text();

      let data: SessionApiResponse = {};
      try {
        data = raw ? (JSON.parse(raw) as SessionApiResponse) : {};
      } catch {
        setSubmitError(
          `Join request failed (${res.status}). The server did not return valid JSON.`
        );
        return;
      }

      if (!res.ok) {
        if (data.code === 'HOST_APPROVAL_REQUIRED') {
          setApprovalPending(true);
          setApprovalMessage(getSubmitErrorMessage(data));
          return;
        }

        setSubmitError(getSubmitErrorMessage(data));
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
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-sm text-slate-200">
            {isAttemptingResume
              ? 'Restoring your team session...'
              : 'Loading game info...'}
          </p>
        </div>
      </AppBackground>
    );
  }

  if (loadError || !game) {
    return (
      <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <h1 className="mb-2 text-2xl font-semibold text-white">
            Unable to join game
          </h1>
          <p className="text-sm text-red-200">
            {loadError || 'Game not found.'}
          </p>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="hero" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Team Join
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Join {game.title}
          </h1>
        </div>

        <div className="mb-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-200">
          <p>
            <span className="font-semibold text-white">Status:</span> {game.status}
          </p>
          <p>
            <span className="font-semibold text-white">Location:</span>{' '}
            {game.site?.name ?? 'Unknown'}
          </p>
          <p>
            <span className="font-semibold text-white">Scheduled:</span>{' '}
            {formatScheduledFor(game.scheduledFor)}
          </p>
          {game.site?.address ? (
            <p>
              <span className="font-semibold text-white">Address:</span>{' '}
              {game.site.address}
            </p>
          ) : null}
        </div>

        {isScheduled ? (
          <div className="mb-4 rounded-2xl border border-blue-300/30 bg-blue-500/10 p-3 text-sm text-blue-100">
            This game has not started yet. Join now and wait in the lobby for
            the host to begin.
          </div>
        ) : null}

        {isClosed ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            This game is not currently accepting team joins.
          </div>
        ) : null}

        {!isClosed ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <div className="relative">
              <label
                htmlFor="teamName"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
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
                  setSubmitError('');
                  setApprovalPending(false);
                  setApprovalMessage('');
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Choose an existing team or enter a new name"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                required
              />

              {showSuggestions && filteredTeams.length > 0 ? (
                <ul className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
                  {filteredTeams.map((team) => {
                    const isSelected = selectedTeamId === team.id;
                    const badges = getSuggestionBadges(team);
                    const lastPlayed = formatLastPlayed(team.lastPlayedAtSite);

                    return (
                      <li
                        key={team.id}
                        className={`cursor-pointer px-4 py-3 text-sm text-slate-100 transition hover:bg-slate-800 ${isSelected ? 'bg-slate-800/80' : ''
                          }`}
                        onMouseDown={() => {
                          setTeamQuery(team.name);
                          setSelectedTeamId(team.id);
                          setShowSuggestions(false);
                          setSubmitError('');
                          setApprovalPending(false);
                          setApprovalMessage('');
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {team.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {team.siteAppearanceCount > 1
                                ? `Used ${team.siteAppearanceCount} times at this site`
                                : team.source === 'KNOWN_SITE'
                                  ? 'Previously used at this site'
                                  : 'Already in this game'}
                              {lastPlayed ? ` • Last played ${lastPlayed}` : ''}
                            </div>
                          </div>

                          {badges.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1">
                              {badges.map((badge) => (
                                <span
                                  key={`${team.id}-${badge}`}
                                  className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-200"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {selectedTeam ? (
                <p className="mt-2 text-sm text-emerald-200">
                  Selected existing team:{' '}
                  <span className="font-semibold">{selectedTeam.name}</span>
                </p>
              ) : exactNormalizedMatch ? (
                <p className="mt-2 text-sm text-slate-300">
                  Exact match found:{' '}
                  <span className="font-semibold text-white">
                    {exactNormalizedMatch.name}
                  </span>
                </p>
              ) : trimmedTeamName ? (
                <p className="mt-2 text-sm text-slate-400">
                  No exact team match found. A new team may be created.
                </p>
              ) : null}

              {hintedTeam?.sessionControlMode === 'LOCKED' ? (
                <p className="mt-2 text-sm text-amber-200">
                  This team is currently locked by the host for this game.
                </p>
              ) : null}

              {hintedTeam?.sessionControlMode === 'HOST_APPROVAL' ? (
                <p className="mt-2 text-sm text-blue-200">
                  This team requires host approval before it can join.
                </p>
              ) : null}

              {hintedTeam?.pinProtected ? (
                <p className="mt-2 text-sm text-slate-300">
                  This team name is PIN protected.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="pin"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Team PIN <span className="text-slate-400">(optional)</span>
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
                  setSubmitError('');
                  setApprovalPending(false);
                  setApprovalMessage('');
                }}
                placeholder="Optional 4-digit PIN"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
              />
              <p className="mt-2 text-sm text-slate-400">
                Use a PIN if you want to protect this team name for future games.
              </p>
            </div>

            {approvalPending ? (
              <div className="rounded-2xl border border-blue-300/30 bg-blue-500/10 p-3 text-sm text-blue-100">
                <p className="font-semibold">Host approval required</p>
                <p className="mt-1">
                  {approvalMessage ||
                    'Your request has been sent to the host. Please wait for approval, then try joining again.'}
                </p>
              </div>
            ) : null}

            {game.teams.length === 0 ? (
              <p className="text-sm text-slate-400">
                No saved team names were found for this game or site. You can still
                enter a new team name and join.
              </p>
            ) : null}

            {submitError ? (
              <div className="rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
                {submitError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !trimmedTeamName}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Joining...'
                : approvalPending
                  ? 'Retry Join'
                  : 'Join Game'}
            </button>
          </form>
        ) : null}
      </div>
    </AppBackground>
  );
}