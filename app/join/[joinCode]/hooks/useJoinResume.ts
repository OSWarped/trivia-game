'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredGameSession,
  getStoredGameSession,
} from '../lib/join-storage';
import type { JoinGamePayload, SessionApiResponse } from '../lib/join-types';

interface UseJoinResumeArgs {
  game: JoinGamePayload | null;
  joinCode: string;
}

interface UseJoinResumeResult {
  isAttemptingResume: boolean;
  resumeError: string;
}

export function useJoinResume({
  game,
  joinCode,
}: UseJoinResumeArgs): UseJoinResumeResult {
  const router = useRouter();
  const hasAttemptedResumeRef = useRef(false);

  const [isAttemptingResume, setIsAttemptingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');

  useEffect(() => {
    if (!game) return;
    if (hasAttemptedResumeRef.current) return;

    const storedSession = getStoredGameSession(game.id);
    if (!storedSession?.sessionToken || !storedSession.deviceId) {
      hasAttemptedResumeRef.current = true;
      return;
    }

    hasAttemptedResumeRef.current = true;
    setIsAttemptingResume(true);
    setResumeError('');

    let isCancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameId: game.id,
            joinCode,
            teamId: storedSession.teamId,
            sessionToken: storedSession.sessionToken,
            deviceId: storedSession.deviceId,
          }),
        });

        const raw = await res.text();
        let data: SessionApiResponse = {};

        try {
          data = raw ? (JSON.parse(raw) as SessionApiResponse) : {};
        } catch {
          if (!isCancelled) {
            setResumeError('Could not validate your saved session.');
          }
          return;
        }

        if (!res.ok || !data.ok || !data.teamId || !data.session?.sessionToken) {
          clearStoredGameSession(game.id);

          if (!isCancelled && data.error) {
            setResumeError(data.error);
          }

          return;
        }

        const route =
          data.route ??
          data.redirectTo ??
          (data.gameStatus === 'LIVE'
            ? `/games/${game.id}/play`
            : `/games/${game.id}/lobby`);

        if (!isCancelled) {
          router.replace(route);
        }
      } catch {
        if (!isCancelled) {
          setResumeError('Could not restore your session. You can join again below.');
        }
      } finally {
        if (!isCancelled) {
          setIsAttemptingResume(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [game, joinCode, router]);

  return {
    isAttemptingResume,
    resumeError,
  };
}