'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ensureStoredDeviceIdentity,
  persistSession,
} from '../lib/join-storage';
import type {
  JoinGamePayload,
  JoinableTeam,
  SessionApiResponse,
  StoredTeamSession,
} from '../lib/join-types';
import {
  getSubmitErrorMessage,
  JOINABLE_STATUSES,
} from '../lib/join-utils';

interface UseJoinSubmitArgs {
  game: JoinGamePayload | null;
  joinCode: string;
  teamName: string;
  pin: string;
  selectedTeamId: string | null;
  exactNormalizedMatch: JoinableTeam | null;
  hasAmbiguousExactMatch: boolean;
  isAttemptingResume: boolean;
}

interface UseJoinSubmitResult {
  isSubmitting: boolean;
  approvalPending: boolean;
  approvalMessage: string;
  submitError: string;
  setApprovalPending: React.Dispatch<React.SetStateAction<boolean>>;
  setApprovalMessage: React.Dispatch<React.SetStateAction<string>>;
  setSubmitError: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useJoinSubmit({
  game,
  joinCode,
  teamName,
  pin,
  selectedTeamId,
  exactNormalizedMatch,
  hasAmbiguousExactMatch,
  isAttemptingResume,
}: UseJoinSubmitArgs): UseJoinSubmitResult {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isSubmitting || isAttemptingResume) {
        return;
      }

      setSubmitError('');
      setApprovalPending(false);
      setApprovalMessage('');

      if (!game) {
        setSubmitError('Game information is not loaded yet.');
        return;
      }

      if (!JOINABLE_STATUSES.has(game.status)) {
        setSubmitError('This game is not open for joining.');
        return;
      }

      const trimmedTeamName = teamName.trim();
      const trimmedPin = pin.trim();

      if (!trimmedTeamName) {
        setSubmitError('Please enter a team name.');
        return;
      }

      if (!selectedTeamId && hasAmbiguousExactMatch) {
        setSubmitError(
          'Multiple teams match that name exactly. Please pick your team from the list before joining.'
        );
        return;
      }

      setIsSubmitting(true);

      try {
        const device = ensureStoredDeviceIdentity();
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
            deviceId: device.deviceId,
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

        persistSession(game.id, joinCode, storedSession, device.createdAt);

        router.replace(nextUrl);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to join game.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      exactNormalizedMatch,
      game,
      hasAmbiguousExactMatch,
      isAttemptingResume,
      isSubmitting,
      joinCode,
      pin,
      router,
      selectedTeamId,
      teamName,
    ]
  );

  return {
    isSubmitting,
    approvalPending,
    approvalMessage,
    submitError,
    setApprovalPending,
    setApprovalMessage,
    setSubmitError,
    handleSubmit,
  };
}