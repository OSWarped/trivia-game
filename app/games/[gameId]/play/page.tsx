/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameStatus } from '@prisma/client';
import { useSocket } from '@/components/SocketProvider';
import { useTeamSocket } from '@/app/hooks/useTeamSocket';
import OrderedQuestion from './components/SortableList';
import { useReliableEmit } from '@/lib/reliable-handshake';

type QuestionType =
  | 'SINGLE'
  | 'MULTIPLE_CHOICE'
  | 'ORDERED'
  | 'WAGER'
  | 'LIST';

interface GameInfo {
  id: string;
  title: string;
  joinCode: string;
  status: GameStatus;
  scheduledFor: string | null;
  site?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

interface ResumeSessionPayload {
  sessionToken: string;
  deviceId: string;
  status: string;
  joinedAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface ResumeApiResponse {
  ok?: boolean;
  teamId?: string;
  teamName?: string;
  gameId?: string;
  gameStatus?: string;
  route?: string;
  redirectTo?: string;
  session?: ResumeSessionPayload;
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

interface GameState {
  game: { id: string; status: string };
  round: {
    id: string;
    name: string;
    roundType: 'STANDARD' | 'WAGER' | 'LIGHTNING';
    pointSystem: 'FIXED' | 'POOL';
    pointPool: number[] | null;
    pointValue: number | null;
    wagerLimit: number | null;
  } | null;
  currentQuestion: {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
  } | null;
  team: {
    id: string;
    name?: string;
    remainingPoints: number[];
    submittedAnswer?: { answer: string; pointsUsed: number[] } | null;
    score: number;
  };
}

export interface TriviaOption {
  id: string;
  text: string;
}

const STORAGE_PREFIX = 'trivia';

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
        parsed.lastKnownScreen !== 'play') ||
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

export default function PlayGamePage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const socket = useSocket();
  const reliableEmit = useReliableEmit(socket!, {
    timeoutMs: 3000,
    maxRetries: 3,
  });

  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [loading, setLoading] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  const prevScoreRef = useRef<number | null>(null);
  const [highlightScore, setHighlightScore] = useState(false);

  const fetchGameState = useCallback(
    async (resolvedTeamId: string) => {
      const res = await fetch(`/api/games/${gameId}/state?teamId=${resolvedTeamId}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load game state.');
      }

      const gameState = (await res.json()) as GameState;
      setState(gameState);

      if (gameState.team.submittedAnswer) {
        setSubmitted(true);
        setAnswer(gameState.team.submittedAnswer.answer ?? '');
        setSelectedPoints(
          gameState.team.submittedAnswer.pointsUsed?.[0] ?? null
        );
      } else {
        setSubmitted(false);
        setAnswer('');
        setSelectedPoints(null);
      }
    },
    [gameId]
  );

  const initializePage = useCallback(async () => {
    if (!gameId) return;

    setLoading(true);
    setIsRestoringSession(true);
    setLoadError('');

    try {
      const gameRes = await fetch(`/api/games/${gameId}`, { cache: 'no-store' });
      const gameData = await gameRes.json();

      if (!gameRes.ok) {
        setLoadError(gameData?.error || 'Failed to load game.');
        return;
      }

      const resolvedGame: GameInfo | null = gameData?.game ?? gameData ?? null;

      if (!resolvedGame) {
        setLoadError('Game payload was empty.');
        return;
      }

      setGameInfo(resolvedGame);

      if (typeof window === 'undefined') {
        return;
      }

      const storedSession = getStoredGameSession(gameId);

      if (!storedSession) {
        setLoadError('No saved team session was found for this game.');
        router.replace(`/join/${resolvedGame.joinCode}`);
        return;
      }

      const resumeRes = await fetch(`/api/games/${gameId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          teamId: storedSession.teamId,
          sessionToken: storedSession.sessionToken,
          deviceId: storedSession.deviceId,
        }),
      });

      const resumeData = (await resumeRes.json()) as ResumeApiResponse;

      if (
        !resumeRes.ok ||
        !resumeData.teamId ||
        !resumeData.session?.sessionToken ||
        !resumeData.session.deviceId
      ) {
        if (resumeData.clearStoredSession) {
          clearStoredGameSession(gameId);
        }

        setLoadError(
          resumeData.error || 'We could not restore your team session.'
        );
        router.replace(`/join/${resolvedGame.joinCode}`);
        return;
      }

      const resumedStatus = resumeData.gameStatus ?? resolvedGame.status;
      const resumedTeamName = resumeData.teamName ?? storedSession.teamName;

      const refreshedSession: StoredTeamSession = {
        gameId,
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
        gameId,
        resolvedGame.joinCode,
        refreshedSession,
        getStoredDeviceIdentity()?.createdAt
      );

      setTeamId(refreshedSession.teamId);
      setTeamName(refreshedSession.teamName);

      if (resumedStatus !== 'LIVE') {
        router.replace(`/games/${gameId}/lobby`);
        return;
      }

      await fetchGameState(refreshedSession.teamId);
    } catch (error) {
      console.error('Failed to initialize play page:', error);
      setLoadError('Failed to restore game session.');
    } finally {
      setIsRestoringSession(false);
      setLoading(false);
    }
  }, [fetchGameState, gameId, router]);

  useEffect(() => {
    void initializePage();
  }, [initializePage]);

  useEffect(() => {
    if (state?.team.score == null) return;

    const prev = prevScoreRef.current;
    const next = state.team.score;

    if (prev !== null && prev !== next) {
      setHighlightScore(true);
      const timeout = window.setTimeout(() => setHighlightScore(false), 1500);
      prevScoreRef.current = next;
      return () => window.clearTimeout(timeout);
    }

    prevScoreRef.current = next;
  }, [state?.team.score]);

  useTeamSocket({
  enabled: Boolean(gameId && teamId && teamName),
  session:
    gameId && teamId && teamName
      ? {
          gameId,
          teamId,
          teamName,
          sessionToken: getStoredGameSession(gameId)?.sessionToken ?? null,
          deviceId: getStoredGameSession(gameId)?.deviceId ?? null,
        }
      : null,
});

  useEffect(() => {
    if (!socket || !gameId || !teamId || !teamName) return;

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnect = () => {
      setConnectionStatus('connected');

      socket.emit('team:join', {
        gameId,
        teamId,
        teamName,
      });
    };

    const handleScoreUpdate = ({
      teamId: updatedTeamId,
      newScore,
    }: {
      teamId: string;
      newScore: number;
    }) => {
      if (updatedTeamId === teamId) {
        setState((prev) =>
          prev ? { ...prev, team: { ...prev.team, score: newScore } } : prev
        );
      }
    };

    const handleQuestionAdvance = async () => {
      try {
        await fetchGameState(teamId);
      } catch (err) {
        console.error('Refetch after question advance failed:', err);
      }
    };

    const handleGameCompleted = () => {
      router.replace(`/games/${gameId}/play/results`);
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    socket.on('score:update', handleScoreUpdate);
    socket.on('game:updateQuestion', handleQuestionAdvance);
    socket.on('game:gameCompleted', handleGameCompleted);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      socket.off('score:update', handleScoreUpdate);
      socket.off('game:updateQuestion', handleQuestionAdvance);
      socket.off('game:gameCompleted', handleGameCompleted);
    };
  }, [socket, gameId, teamId, teamName, router, fetchGameState]);

  const orderedOptions = useMemo(() => {
    if (
      !state?.currentQuestion ||
      state.currentQuestion.type !== 'ORDERED' ||
      !state.currentQuestion.options
    ) {
      return [];
    }

    return state.currentQuestion.options.map((opt) =>
      typeof opt === 'string'
        ? { id: opt, text: opt }
        : { id: (opt as any).id, text: (opt as any).text }
    );
  }, [state?.currentQuestion?.options, state?.currentQuestion?.type]);

  const submitAnswer = useCallback(async () => {
    if (!state?.currentQuestion || !teamId) return;

    const payload = {
      gameId,
      questionId: state.currentQuestion.id,
      answer,
      pointsUsed: selectedPoints ? [selectedPoints] : [],
      teamId,
    };

    try {
      const res = await fetch('/api/play/answers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('API save failed');

      reliableEmit(
        'team:submitAnswer',
        payload,
        () => setSubmitted(true),
        (err) => console.error('Answer delivery failed', err)
      );
    } catch (err) {
      console.error('Submit answer error:', err);
    }
  }, [state, answer, selectedPoints, gameId, teamId, reliableEmit]);

  const handleOrderChange = useCallback(
    (newOrder: TriviaOption[]) => setAnswer(newOrder.map((o) => o.text)),
    []
  );

  const isMultiple = state?.currentQuestion?.type === 'MULTIPLE_CHOICE';
  const isSingle = state?.currentQuestion?.type === 'SINGLE';
  const isList = state?.currentQuestion?.type === 'LIST';
  const isOrdered = state?.currentQuestion?.type === 'ORDERED';
  const isWager = state?.round?.roundType === 'WAGER';
  const needsPoints =
    state?.round?.pointSystem === 'POOL' && selectedPoints === null;
  const maxWager = state?.team.score ?? 0;

  const hasAnswer =
    typeof answer === 'string'
      ? answer.trim().length > 0
      : Array.isArray(answer)
        ? answer.some((item) => item.trim().length > 0)
        : false;

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          {isRestoringSession
            ? 'Restoring your team session...'
            : 'Loading question...'}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!state) {
    return <div className="p-6">Loading question…</div>;
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-12">
      <aside className="space-y-6 md:col-span-3">
        <div
          className={`rounded-lg bg-white p-6 shadow transition-all ${
            highlightScore ? 'animate-pulse ring-4 ring-blue-300' : ''
          }`}
        >
          <h3 className="mb-4 text-xl font-semibold text-gray-800">
            👤 {state.team.name}
          </h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-blue-600">
              {state.team.score}
            </span>
            <span className="text-sm text-gray-500">pts</span>
          </div>
          {gameInfo?.title ? (
            <p className="mt-4 text-sm text-gray-500">{gameInfo.title}</p>
          ) : null}
        </div>
      </aside>

      {connectionStatus === 'disconnected' && (
        <div className="mt-4 text-center text-yellow-500 md:col-span-12">
          Reconnecting...
        </div>
      )}

      <section className="space-y-6 md:col-span-9">
        <div className="rounded-lg bg-white p-6 shadow">
          <header className="mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-700">
              Round: <span className="text-blue-600">{state.round?.name}</span>
            </h2>
            <h3 className="mt-1 text-xl font-medium text-gray-900">
              {state.currentQuestion?.text}
            </h3>
          </header>

          {isSingle && (
            <input
              type="text"
              className="w-full rounded-md border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:ring-blue-200"
              value={typeof answer === 'string' ? answer : ''}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Type your answer…"
            />
          )}

          {isMultiple && (
            <div className="space-y-3">
              {state.currentQuestion?.options?.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center space-x-3 rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    value={opt}
                    checked={Array.isArray(answer) && answer.includes(opt)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAnswer((prev) => {
                        if (!Array.isArray(prev)) return checked ? [opt] : [];
                        return checked
                          ? [...prev, opt]
                          : prev.filter((a) => a !== opt);
                      });
                    }}
                    disabled={submitted}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {isList && state.currentQuestion?.options && (
            <div className="space-y-2">
              <p className="mb-2 font-semibold">
                Name all {state.currentQuestion.options.length} items:
              </p>
              {state.currentQuestion.options.map((_, idx) => (
                <input
                  key={idx}
                  type="text"
                  className="w-full rounded border p-2"
                  value={Array.isArray(answer) ? answer[idx] || '' : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswer((prev) => {
                      const arr = Array.isArray(prev)
                        ? [...prev]
                        : Array(
                            state.currentQuestion?.options?.length ?? 0
                          ).fill('');
                      arr[idx] = val;
                      return arr;
                    });
                  }}
                  disabled={submitted}
                  placeholder={`Item ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {state.round?.pointSystem === 'POOL' && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-600">
                Select a Point Value
              </h4>
              <div className="flex flex-wrap gap-3">
                {state.team.remainingPoints?.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setSelectedPoints(pt)}
                    disabled={submitted}
                    className={`flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                      selectedPoints === pt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isWager && (
            <div className="mb-4">
              <label
                htmlFor="wager-input"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Place your wager (0‒{maxWager} points)
              </label>
              <input
                type="number"
                id="wager-input"
                min={0}
                max={maxWager}
                step={1}
                value={selectedPoints ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = Number(val);

                  if (/^\d*$/.test(val) && num <= maxWager) {
                    setSelectedPoints(val === '' ? null : num);
                  }
                }}
                disabled={submitted}
                className="w-full rounded-md border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:ring-blue-200"
                placeholder="Enter your wager…"
              />
              {!submitted &&
                selectedPoints != null &&
                selectedPoints > maxWager && (
                  <p className="mt-1 text-sm text-red-600">
                    Wager cannot exceed your current score.
                  </p>
                )}
            </div>
          )}

          {isOrdered && orderedOptions.length > 0 && (
            <OrderedQuestion
              key={state.currentQuestion?.id}
              options={orderedOptions}
              onChange={handleOrderChange}
            />
          )}

          <button
            type="button"
            onClick={submitAnswer}
            disabled={
              submitted ||
              !hasAnswer ||
              needsPoints ||
              (isWager && (selectedPoints === null || selectedPoints < 0))
            }
            className={`mt-6 w-full rounded-lg px-5 py-3 text-center font-semibold transition ${
              submitted
                ? 'cursor-not-allowed bg-gray-400 text-gray-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitted ? 'Answer Submitted' : 'Submit Answer'}
          </button>
        </div>
      </section>
    </div>
  );
}