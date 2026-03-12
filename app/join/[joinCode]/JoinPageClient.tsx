'use client';

import { useEffect, useMemo, useState } from 'react';
import AppBackground from '@/components/AppBackground';
import JoinForm from './components/JoinForm';
import JoinStatusPanel from './components/JoinStatusPanel';
import TeamSuggestions from './components/TeamSuggestions';
import { useJoinResume } from './hooks/useJoinResume';
import { useJoinSubmit } from './hooks/useJoinSubmit';
import type { JoinGamePayload } from './lib/join-types';
import {
  JOINABLE_STATUSES,
  normalizeTeamNameForCompare,
} from './lib/join-utils';

export default function JoinPageClient({ joinCode }: { joinCode: string }) {
  const [game, setGame] = useState<JoinGamePayload | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadGame = async () => {
      setIsLoading(true);
      setLoadError('');

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
          joinCode: data.joinCode ?? joinCode,
          site: data.site ?? null,
          teams: Array.isArray(data.teams) ? data.teams : [],
        };

        if (!cancelled) {
          setGame(normalizedGame);
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
  }, [joinCode]);

  const normalizedQuery = useMemo(
    () => normalizeTeamNameForCompare(teamName),
    [teamName]
  );

  const selectedTeam = useMemo(() => {
    if (!game || !selectedTeamId) return null;
    return game.teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [game, selectedTeamId]);

  const exactNormalizedMatches = useMemo(() => {
    if (!game || !normalizedQuery) return [];

    return game.teams.filter((team) => team.normalizedKey === normalizedQuery);
  }, [game, normalizedQuery]);

  const exactNormalizedMatch =
    exactNormalizedMatches.length === 1 ? exactNormalizedMatches[0] : null;
  const hasAmbiguousExactMatch = exactNormalizedMatches.length > 1;
  const hintedTeam = selectedTeam ?? exactNormalizedMatch ?? null;

  const filteredSuggestions = useMemo(() => {
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

  const {
  isAttemptingResume,
  resumeError,
} = useJoinResume({
  game,
  joinCode,
});

  const {
    isSubmitting,
    approvalPending,
    approvalMessage,
    submitError,
    setApprovalPending,
    setApprovalMessage,
    setSubmitError,
    handleSubmit,
  } = useJoinSubmit({
    game,
    joinCode,
    teamName,
    pin,
    selectedTeamId,
    exactNormalizedMatch,
    hasAmbiguousExactMatch,
    isAttemptingResume,
  });

  const trimmedTeamName = teamName.trim();
  const isJoinable = game ? JOINABLE_STATUSES.has(game.status) : false;
  const isClosed = game ? !JOINABLE_STATUSES.has(game.status) : false;

  if (isLoading) {
    return (
      <AppBackground
        variant="hero"
        className="flex min-h-screen items-center justify-center px-6 py-12"
      >
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
      <AppBackground
        variant="hero"
        className="flex min-h-screen items-center justify-center px-6 py-12"
      >
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
    <AppBackground
      variant="hero"
      className="flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-2xl space-y-6">
        <JoinStatusPanel
          title={game.title}
          siteName={game.site?.name ?? null}
          siteAddress={game.site?.address ?? null}
          scheduledFor={game.scheduledFor}
          gameStatus={game.status}
          isJoinable={isJoinable}
          isAttemptingResume={isAttemptingResume}
          approvalPending={approvalPending}
          approvalMessage={approvalMessage}
          submitError={submitError}
          resumeError={resumeError}
          selectedTeamName={selectedTeam?.name ?? null}
        />

        {!isClosed ? (
          <>
            <JoinForm
              teamName={teamName}
              pin={pin}
              isSubmitting={isSubmitting}
              isAttemptingResume={isAttemptingResume}
              isJoinable={isJoinable}
              approvalPending={approvalPending}
              hasAmbiguousExactMatch={hasAmbiguousExactMatch}
              selectedTeamName={selectedTeam?.name ?? null}
              teamSuggestions={
                <TeamSuggestions
                  teams={filteredSuggestions}
                  visible={showSuggestions}
                  normalizedQuery={normalizedQuery}
                  selectedTeamId={selectedTeamId}
                  onSelectTeam={(team) => {
                    setSelectedTeamId(team.id);
                    setTeamName(team.name);
                    setShowSuggestions(false);
                    setSubmitError('');
                  }}
                />
              }
              onTeamNameChange={(value) => {
                setTeamName(value);
                setSelectedTeamId(null);
                setApprovalPending(false);
                setApprovalMessage('');
                setSubmitError('');
                setShowSuggestions(true);
              }}
              onPinChange={(value) => {
                setPin(value.replace(/\D/g, '').slice(0, 4));
                setApprovalPending(false);
                setApprovalMessage('');
                setSubmitError('');
              }}
              onSubmit={handleSubmit}
            />           

            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
              {trimmedTeamName && !selectedTeam && !exactNormalizedMatch ? (
                <p>No exact team match found. A new team may be created.</p>
              ) : null}

              {hintedTeam?.sessionControlMode === 'LOCKED' ? (
                <p className="text-amber-200">
                  This team is currently locked by the host for this game.
                </p>
              ) : null}

              {hintedTeam?.sessionControlMode === 'HOST_APPROVAL' ? (
                <p className="text-sky-200">
                  This team requires host approval before it can join.
                </p>
              ) : null}

              {hintedTeam?.pinProtected ? (
                <p>This team name is PIN protected.</p>
              ) : null}

              {game.teams.length === 0 ? (
                <p className="text-white/60">
                  No saved team names were found for this game or site. You can
                  still enter a new team name and join.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AppBackground>
  );
}
