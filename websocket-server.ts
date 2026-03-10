/* eslint-disable @typescript-eslint/no-unused-vars */
import { Server, Socket } from 'socket.io';
import { PrismaClient, TeamGameSessionStatus } from '@prisma/client';
import { setIo } from './lib/socket.js';
import { registerReliableHandler } from './lib/reliable-handshake.js';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({
  path: envPath,
  override: true,
});

if (!isProduction) {
  delete process.env.SSL_KEY_PATH;
  delete process.env.SSL_CERT_PATH;
  delete process.env.SSL_CA_PATH;
}

const useHttps = process.env.SOCKET_USE_HTTPS === 'true';
const PORT = Number(process.env.SOCKET_PORT || 3009);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || '*';

const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_CA_PATH = process.env.SSL_CA_PATH;

console.log(`Loaded environment from ${envFile}`);
console.log(`Resolved env path: ${envPath}`);
console.log(`NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`);
console.log(`SOCKET_CORS_ORIGIN=${process.env.SOCKET_CORS_ORIGIN ?? 'undefined'}`);
console.log(`SSL_KEY_PATH=${process.env.SSL_KEY_PATH ?? 'undefined'}`);
console.log(`SSL_CERT_PATH=${process.env.SSL_CERT_PATH ?? 'undefined'}`);
console.log('PRE-BUILD CHECK');
console.log('SSL_KEY_PATH const =', SSL_KEY_PATH);
console.log('SSL_CERT_PATH const =', SSL_CERT_PATH);
console.log('SSL_CA_PATH const =', SSL_CA_PATH);
console.log('useHttps =', useHttps);
console.log('file executing =', import.meta.url);

const prisma = new PrismaClient();

const SESSION_DURATION_HOURS = 12;
const RECONNECT_GRACE_MS = 30_000;
const RESUMABLE_GAME_STATUSES = new Set(['SCHEDULED', 'LIVE']);

type LivePresenceStatus = 'ACTIVE' | 'RECONNECTING' | 'OFFLINE';

interface TeamSocketBinding {
  gameId: string;
  teamId: string;
  teamName: string;
  sessionId?: string;
  sessionToken?: string;
  deviceId?: string;
}

interface LiveTeamPresence {
  id: string;
  name: string;
  status: LivePresenceStatus;
  lastSeenAt: string;
  socketId: string | null;
  sessionId?: string;
}

interface ResumePayload {
  gameId?: string;
  teamId?: string;
  teamName?: string;
  sessionToken?: string;
  deviceId?: string;
}

interface ResumeAckSuccess {
  ok: true;
  gameId: string;
  teamId: string;
  teamName: string;
  gameStatus: string;
  route: string;
  redirectTo: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface ResumeAckFailure {
  ok: false;
  code: string;
  error: string;
  clearStoredSession: boolean;
  redirectTo?: string;
}

type ResumeAck = ResumeAckSuccess | ResumeAckFailure;

const socketBindings = new Map<string, TeamSocketBinding>();
const activeTeamsByGame = new Map<string, Map<string, LiveTeamPresence>>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();

function resolveFilePath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

function readFileOrThrow(label: string, filePath: string): Buffer {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} file not found at path: ${filePath}`);
  }

  return fs.readFileSync(filePath);
}

function getCorsOrigin(): string | string[] {
  if (SOCKET_CORS_ORIGIN.trim() === '*') {
    return '*';
  }

  return SOCKET_CORS_ORIGIN
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildServer() {
  const resolvedKeyPath = resolveFilePath(SSL_KEY_PATH);
  const resolvedCertPath = resolveFilePath(SSL_CERT_PATH);
  const resolvedCaPath = resolveFilePath(SSL_CA_PATH);

  console.log('INSIDE buildServer()');
  console.log('buildServer sees SSL_KEY_PATH const =', SSL_KEY_PATH);
  console.log('buildServer sees SSL_CERT_PATH const =', SSL_CERT_PATH);
  console.log('buildServer sees SSL_CA_PATH const =', SSL_CA_PATH);
  console.log('resolvedKeyPath =', resolvedKeyPath);
  console.log('resolvedCertPath =', resolvedCertPath);
  console.log('resolvedCaPath =', resolvedCaPath);

  if (useHttps) {
    if (!resolvedKeyPath || !resolvedCertPath) {
      throw new Error(
        'SOCKET_USE_HTTPS=true requires SSL_KEY_PATH and SSL_CERT_PATH.'
      );
    }

    console.log('Starting WebSocket server in HTTPS mode');
    console.log(`SSL key path: ${resolvedKeyPath}`);
    console.log(`SSL cert path: ${resolvedCertPath}`);
    if (resolvedCaPath) {
      console.log(`SSL CA path: ${resolvedCaPath}`);
    }

    const httpsOptions: https.ServerOptions = {
      key: readFileOrThrow('SSL key', resolvedKeyPath),
      cert: readFileOrThrow('SSL cert', resolvedCertPath),
    };

    if (resolvedCaPath) {
      httpsOptions.ca = readFileOrThrow('SSL CA', resolvedCaPath);
    }

    return {
      server: https.createServer(httpsOptions),
      protocol: 'HTTPS',
    };
  }

  console.log('Starting WebSocket server in HTTP mode');
  return {
    server: http.createServer(),
    protocol: 'HTTP',
  };
}

function buildSessionExpiry(from: Date): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  return expiresAt;
}

function buildRouteForGameStatus(gameId: string, status: string): string {
  return status === 'LIVE'
    ? `/games/${gameId}/play`
    : `/games/${gameId}/lobby`;
}

function getOrCreateGamePresence(gameId: string): Map<string, LiveTeamPresence> {
  if (!activeTeamsByGame.has(gameId)) {
    activeTeamsByGame.set(gameId, new Map());
  }

  return activeTeamsByGame.get(gameId)!;
}

function clearReconnectTimer(sessionId?: string) {
  if (!sessionId) return;

  const existing = reconnectTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    reconnectTimers.delete(sessionId);
  }
}

function emitLiveTeams(io: Server, gameId: string) {
  const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []).map(
    ({ id, name, status, lastSeenAt }) => ({
      id,
      name,
      status,
      lastSeenAt,
    })
  );

  io.to(gameId).emit('team:liveTeams', { gameId, teams });
  io.to(gameId).emit('host:liveTeams', { gameId, teams });
}

function upsertPresence(
  gameId: string,
  teamId: string,
  teamName: string,
  status: LivePresenceStatus,
  socketId: string | null,
  sessionId?: string,
  lastSeenAt?: Date
) {
  const gamePresence = getOrCreateGamePresence(gameId);

  gamePresence.set(teamId, {
    id: teamId,
    name: teamName,
    status,
    socketId,
    sessionId,
    lastSeenAt: (lastSeenAt ?? new Date()).toISOString(),
  });
}

function removePresence(gameId: string, teamId: string) {
  const gamePresence = activeTeamsByGame.get(gameId);
  if (!gamePresence) return;

  gamePresence.delete(teamId);

  if (gamePresence.size === 0) {
    activeTeamsByGame.delete(gameId);
  }
}

function emitSnapshotToSocket(socket: Socket, gameId: string) {
  const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []).map(
    ({ id, name, status, lastSeenAt }) => ({
      id,
      name,
      status,
      lastSeenAt,
    })
  );

  socket.emit('team:liveTeams', { gameId, teams });
  socket.emit('host:liveTeams', { gameId, teams });
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function scheduleOfflineTransition(
  io: Server,
  gameId: string,
  teamId: string,
  teamName: string,
  sessionId: string
) {
  clearReconnectTimer(sessionId);

  const timeout = setTimeout(async () => {
    reconnectTimers.delete(sessionId);

    try {
      const session = await prisma.teamGameSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        removePresence(gameId, teamId);
        emitLiveTeams(io, gameId);
        return;
      }

      if (
        session.status !== TeamGameSessionStatus.RECONNECTING ||
        session.socketId
      ) {
        return;
      }

      await prisma.teamGameSession.update({
        where: { id: sessionId },
        data: {
          status: TeamGameSessionStatus.OFFLINE,
        },
      });

      upsertPresence(
        gameId,
        teamId,
        teamName,
        'OFFLINE',
        null,
        sessionId,
        session.lastSeenAt
      );
      emitLiveTeams(io, gameId);
    } catch (error) {
      console.error('Failed to transition session to OFFLINE:', error);
    }
  }, RECONNECT_GRACE_MS);

  reconnectTimers.set(sessionId, timeout);
}

function ackFailure(
  ack: ((response: ResumeAck) => void) | undefined,
  response: ResumeAckFailure
) {
  ack?.(response);
}

function ackSuccess(
  ack: ((response: ResumeAck) => void) | undefined,
  response: ResumeAckSuccess
) {
  ack?.(response);
}

try {
  console.log('PRE-BUILD CHECK');
  console.log('SSL_KEY_PATH const =', SSL_KEY_PATH);
  console.log('SSL_CERT_PATH const =', SSL_CERT_PATH);
  console.log('SSL_CA_PATH const =', SSL_CA_PATH);
  console.log('useHttps =', useHttps);
  console.log('file executing =', import.meta.url);

  const { server, protocol } = buildServer();
  const corsOrigin = getCorsOrigin();

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: corsOrigin === '*' ? false : true,
    },
  });

  setIo(io);

  registerReliableHandler(io, 'host:nextQuestion', async (_socket, { gameId }) => {
    console.log('Host is moving to the next question. EMIT: game:updateQuestion');
    io.to(gameId).emit('game:updateQuestion', { gameId });
    return {};
  });

  registerReliableHandler(io, 'host:previousQuestion', async (_socket, { gameId }) => {
    console.log('Host is moving to the previous question. EMIT: game:updateQuestion');
    io.to(gameId).emit('game:updateQuestion', { gameId });
    return {};
  });

  registerReliableHandler(
    io,
    'team:submitAnswer',
    async (_socket, { gameId, teamId, questionId, answer, pointsUsed }) => {
      console.log(`TEAM: ${teamId} submitted an answer to ${questionId}`);
      io.to(gameId).emit('host:answerSubmission', {
        teamId,
        questionId,
        answer,
        pointsUsed,
      });
      return {};
    }
  );

  registerReliableHandler(
    io,
    'host:scoreUpdate',
    async (_socket, { gameId, teamId, newScore }) => {
      console.log(`Score update for Team ${teamId}: ${newScore}`);
      io.to(gameId).emit('score:update', { teamId, newScore });
      return {};
    }
  );

  io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    socket.on(
      'team:resume',
      async (
        payload: ResumePayload,
        ack?: (response: ResumeAck) => void
      ) => {
        const gameId = normalizeString(payload.gameId);
        const teamId = normalizeString(payload.teamId);
        const sessionToken = normalizeString(payload.sessionToken);
        const deviceId = normalizeString(payload.deviceId);

        if (!gameId || !teamId || !sessionToken || !deviceId) {
          ackFailure(ack, {
            ok: false,
            code: 'INVALID_REQUEST',
            error: 'Missing session resume fields.',
            clearStoredSession: false,
          });
          return;
        }

        try {
          const session = await prisma.teamGameSession.findFirst({
            where: {
              gameId,
              teamId,
              sessionToken,
              deviceId,
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
              game: {
                select: {
                  id: true,
                  status: true,
                  joinCode: true,
                },
              },
            },
            orderBy: {
              joinedAt: 'desc',
            },
          });

          if (!session) {
            ackFailure(ack, {
              ok: false,
              code: 'SESSION_NOT_FOUND',
              error: 'This saved session is no longer valid.',
              clearStoredSession: true,
            });
            return;
          }

          if (!RESUMABLE_GAME_STATUSES.has(session.game.status)) {
            ackFailure(ack, {
              ok: false,
              code: 'GAME_NOT_RESUMABLE',
              error: 'This game is not currently resumable.',
              clearStoredSession: true,
              redirectTo: `/join/${session.game.joinCode}`,
            });
            return;
          }

          if (session.status === TeamGameSessionStatus.CLOSED) {
            ackFailure(ack, {
              ok: false,
              code: 'SESSION_CLOSED',
              error: 'This session has been closed.',
              clearStoredSession: true,
              redirectTo: `/join/${session.game.joinCode}`,
            });
            return;
          }

          const now = new Date();

          if (session.expiresAt <= now) {
            await prisma.teamGameSession.update({
              where: { id: session.id },
              data: {
                status: TeamGameSessionStatus.CLOSED,
                socketId: null,
              },
            });

            ackFailure(ack, {
              ok: false,
              code: 'SESSION_EXPIRED',
              error: 'This session has expired.',
              clearStoredSession: true,
              redirectTo: `/join/${session.game.joinCode}`,
            });
            return;
          }

          const existingPresence = activeTeamsByGame.get(gameId)?.get(teamId);

          if (
            existingPresence?.socketId &&
            existingPresence.socketId !== socket.id
          ) {
            const oldSocket = io.sockets.sockets.get(existingPresence.socketId);
            oldSocket?.disconnect(true);
          }

          const refreshedExpiresAt = buildSessionExpiry(now);

          const updatedSession = await prisma.teamGameSession.update({
            where: { id: session.id },
            data: {
              status: TeamGameSessionStatus.ACTIVE,
              socketId: socket.id,
              lastSeenAt: now,
              disconnectedAt: null,
              expiresAt: refreshedExpiresAt,
            },
          });

          clearReconnectTimer(session.id);

          socket.join(gameId);

          socketBindings.set(socket.id, {
            gameId,
            teamId,
            teamName: session.team.name,
            sessionId: session.id,
            sessionToken: session.sessionToken,
            deviceId: session.deviceId,
          });

          upsertPresence(
            gameId,
            teamId,
            session.team.name,
            'ACTIVE',
            socket.id,
            session.id,
            now
          );

          emitLiveTeams(io, gameId);
          io.to(gameId).emit('host:teamReconnected', {
            teamId,
            teamName: session.team.name,
            gameId,
          });

          const route = buildRouteForGameStatus(gameId, session.game.status);

          ackSuccess(ack, {
            ok: true,
            gameId,
            teamId: session.team.id,
            teamName: session.team.name,
            gameStatus: session.game.status,
            route,
            redirectTo: route,
            lastSeenAt: updatedSession.lastSeenAt.toISOString(),
            expiresAt: updatedSession.expiresAt.toISOString(),
          });

          console.log(
            `🔄 Team ${session.team.name} (${teamId}) resumed session in game ${gameId}`
          );
        } catch (error) {
          console.error('Failed to resume team session:', error);
          ackFailure(ack, {
            ok: false,
            code: 'INTERNAL_ERROR',
            error: 'Failed to resume session.',
            clearStoredSession: false,
          });
        }
      }
    );

    socket.on(
      'team:heartbeat',
      async ({
        gameId,
        teamId,
        sessionToken,
        deviceId,
      }: {
        gameId?: string;
        teamId?: string;
        sessionToken?: string | null;
        deviceId?: string | null;
      }) => {
        const resolvedGameId = normalizeString(gameId);
        const resolvedTeamId = normalizeString(teamId);
        const resolvedSessionToken = normalizeString(sessionToken);
        const resolvedDeviceId = normalizeString(deviceId);

        try {
          const binding = socketBindings.get(socket.id);

          if (binding?.sessionId) {
            const now = new Date();

            await prisma.teamGameSession.update({
              where: { id: binding.sessionId },
              data: {
                lastSeenAt: now,
                expiresAt: buildSessionExpiry(now),
              },
            });

            const existingPresence =
              activeTeamsByGame.get(binding.gameId)?.get(binding.teamId);

            if (existingPresence) {
              upsertPresence(
                binding.gameId,
                binding.teamId,
                binding.teamName,
                existingPresence.status,
                existingPresence.socketId,
                binding.sessionId,
                now
              );
              emitLiveTeams(io, binding.gameId);
            }

            return;
          }

          if (
            !resolvedGameId ||
            !resolvedTeamId ||
            !resolvedSessionToken ||
            !resolvedDeviceId
          ) {
            return;
          }

          const now = new Date();

          const session = await prisma.teamGameSession.findFirst({
            where: {
              gameId: resolvedGameId,
              teamId: resolvedTeamId,
              sessionToken: resolvedSessionToken,
              deviceId: resolvedDeviceId,
            },
          });

          if (!session) {
            return;
          }

          await prisma.teamGameSession.update({
            where: { id: session.id },
            data: {
              lastSeenAt: now,
              expiresAt: buildSessionExpiry(now),
            },
          });

          const teamName =
            socketBindings.get(socket.id)?.teamName ??
            activeTeamsByGame.get(resolvedGameId)?.get(resolvedTeamId)?.name ??
            'Team';

          const existingPresence =
            activeTeamsByGame.get(resolvedGameId)?.get(resolvedTeamId);

          upsertPresence(
            resolvedGameId,
            resolvedTeamId,
            teamName,
            existingPresence?.status ?? 'ACTIVE',
            existingPresence?.socketId ?? socket.id,
            session.id,
            now
          );
          emitLiveTeams(io, resolvedGameId);
        } catch (error) {
          console.error('Failed to process team heartbeat:', error);
        }
      }
    );

    socket.on(
      'team:join',
      ({ gameId, teamId, teamName }: { gameId?: string; teamId?: string; teamName?: string }) => {
        const resolvedGameId = normalizeString(gameId);
        const resolvedTeamId = normalizeString(teamId);
        const resolvedTeamName = normalizeString(teamName);

        if (!resolvedGameId || !resolvedTeamId || !resolvedTeamName) return;

        socket.join(resolvedGameId);

        socketBindings.set(socket.id, {
          gameId: resolvedGameId,
          teamId: resolvedTeamId,
          teamName: resolvedTeamName,
        });

        upsertPresence(
          resolvedGameId,
          resolvedTeamId,
          resolvedTeamName,
          'ACTIVE',
          socket.id
        );

        emitLiveTeams(io, resolvedGameId);
        io.to(resolvedGameId).emit('host:teamReconnected', {
          teamId: resolvedTeamId,
          teamName: resolvedTeamName,
          gameId: resolvedGameId,
        });

        console.log(
          `📥 Team ${resolvedTeamName} (${resolvedTeamId}) joined lobby for game ${resolvedGameId}`
        );
      }
    );

    socket.on(
      'team:leave_lobby',
      ({ gameId, teamId }: { gameId?: string; teamId?: string }) => {
        const resolvedGameId = normalizeString(gameId);
        const resolvedTeamId = normalizeString(teamId);

        if (!resolvedGameId || !resolvedTeamId) return;

        // Intentionally do not remove live presence here.
        // Page transitions between lobby/play should not make the team disappear.
        console.log(
          `↔️ team:leave_lobby received for ${resolvedTeamId} in ${resolvedGameId} (ignored for durable presence)`
        );
      }
    );

    socket.on('team:getLiveTeams', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      emitSnapshotToSocket(socket, resolvedGameId);
    });

    socket.on('team:requestLiveTeams', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      emitSnapshotToSocket(socket, resolvedGameId);
    });

    socket.on('host:requestLiveTeams', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      emitSnapshotToSocket(socket, resolvedGameId);
    });

    socket.on('disconnect', async (reason) => {
      const binding = socketBindings.get(socket.id);
      if (!binding) return;

      const { gameId, teamId, teamName, sessionId } = binding;

      console.log(
        `❌ Disconnected: ${teamName} (${teamId}) from game ${gameId} - Reason: ${reason}`
      );

      socketBindings.delete(socket.id);

      if (!sessionId) {
        removePresence(gameId, teamId);
        emitLiveTeams(io, gameId);
        return;
      }

      try {
        await prisma.teamGameSession.update({
          where: { id: sessionId },
          data: {
            status: TeamGameSessionStatus.RECONNECTING,
            socketId: null,
            disconnectedAt: new Date(),
          },
        });

        upsertPresence(
          gameId,
          teamId,
          teamName,
          'RECONNECTING',
          null,
          sessionId,
          new Date()
        );
        emitLiveTeams(io, gameId);

        await scheduleOfflineTransition(io, gameId, teamId, teamName, sessionId);
      } catch (error) {
        console.error('Failed to mark session RECONNECTING:', error);
        removePresence(gameId, teamId);
        emitLiveTeams(io, gameId);
      }
    });

    socket.on('host:gameStarted', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      io.to(resolvedGameId).emit('game_started');
    });

    socket.on('host:join', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      socket.join(resolvedGameId);
      emitSnapshotToSocket(socket, resolvedGameId);
    });

    socket.on('host:resetSubmissions', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      io.to(resolvedGameId).emit('game:resetSubmissions', { gameId: resolvedGameId });
    });

    socket.on('host:showLobby', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;

      io.to(resolvedGameId).emit('game:showLobby', {
        gameId: resolvedGameId,
      });
    });

    socket.on('host:showQuestion', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;

      io.to(resolvedGameId).emit('game:showQuestion', {
        gameId: resolvedGameId,
      });
    });

    socket.on(
      'host:showAnswerReveal',
      ({
        gameId,
        reveal,
      }: {
        gameId?: string;
        reveal?: {
          gameId: string;
          roundId: string;
          roundName: string;
          questionId: string;
          questionText: string;
          questionType: string;
          correctAnswers: string[];
        };
      }) => {
        console.log(
          `↔️ team:host has sent the answers to be revealed for question ${reveal?.questionId} in game ${gameId}`
        );
        const resolvedGameId = normalizeString(gameId);
        if (!resolvedGameId || !reveal) return;

        io.to(resolvedGameId).emit('game:showAnswerReveal', {
          gameId: resolvedGameId,
          reveal,
        });
      }
    );

    socket.on(
      'host:showLeaderboard',
      ({
        gameId,
        leaderboard,
      }: {
        gameId?: string;
        leaderboard?: {
          gameId: string;
          standings: {
            teamId: string;
            teamName: string;
            score: number;
            rank: number;
          }[];
        };
      }) => {
        const resolvedGameId = normalizeString(gameId);
        if (!resolvedGameId || !leaderboard) return;

        io.to(resolvedGameId).emit('game:showLeaderboard', {
          gameId: resolvedGameId,
          leaderboard,
        });
      }
    );

    socket.on(
      'host:transition',
      ({
        gameId,
        transitionMessage,
        transitionMedia,
        adEmbedCode,
      }: {
        gameId?: string;
        transitionMessage?: string;
        transitionMedia?: string;
        adEmbedCode?: string;
      }) => {
        const resolvedGameId = normalizeString(gameId);
        if (!resolvedGameId) return;

        io.to(resolvedGameId).emit('game:transition', {
          gameId: resolvedGameId,
          transitionMessage,
          transitionMedia,
          adEmbedCode,
        });
      }
    );

    socket.on(
      'host:toggleScores',
      ({
        gameId,
        scoresVisibleToPlayers,
      }: {
        gameId?: string;
        scoresVisibleToPlayers?: boolean;
      }) => {
        const resolvedGameId = normalizeString(gameId);
        if (!resolvedGameId) return;

        io.to(resolvedGameId).emit('game:scoresVisibilityChanged', {
          gameId: resolvedGameId,
          scoresVisibleToPlayers,
        });
      }
    );

    socket.on('host:gameCompleted', ({ gameId }: { gameId?: string }) => {
      const resolvedGameId = normalizeString(gameId);
      if (!resolvedGameId) return;
      io.to(resolvedGameId).emit('game:gameCompleted', { gameId: resolvedGameId });
    });

    socket.on(
      'score:update',
      ({
        gameId,
        teamId,
        newScore,
      }: {
        gameId?: string;
        teamId?: string;
        newScore?: number;
      }) => {
        const resolvedGameId = normalizeString(gameId);
        const resolvedTeamId = normalizeString(teamId);

        if (!resolvedGameId || !resolvedTeamId) return;
        io.to(resolvedGameId).emit('score:update', {
          teamId: resolvedTeamId,
          newScore,
        });
      }
    );


    socket.on(
      'host:bootTeamSession',
      async (
        {
          gameId,
          teamId,
        }: {
          gameId?: string;
          teamId?: string;
        },
        ack?: (response: { ok: boolean; error?: string }) => void
      ) => {
        const resolvedGameId = normalizeString(gameId);
        const resolvedTeamId = normalizeString(teamId);

        if (!resolvedGameId || !resolvedTeamId) {
          ack?.({ ok: false, error: 'Missing gameId or teamId.' });
          return;
        }

        try {
          const existingPresence =
            activeTeamsByGame.get(resolvedGameId)?.get(resolvedTeamId);

          const openSessions = await prisma.teamGameSession.findMany({
            where: {
              gameId: resolvedGameId,
              teamId: resolvedTeamId,
              status: {
                not: TeamGameSessionStatus.CLOSED,
              },
            },
            select: {
              id: true,
              socketId: true,
            },
            orderBy: {
              joinedAt: 'desc',
            },
          });

          const socketIdsToDisconnect = new Set<string>();

          if (existingPresence?.socketId) {
            socketIdsToDisconnect.add(existingPresence.socketId);
          }

          if (existingPresence?.sessionId) {
            clearReconnectTimer(existingPresence.sessionId);
          }

          for (const session of openSessions) {
            clearReconnectTimer(session.id);

            if (session.socketId) {
              socketIdsToDisconnect.add(session.socketId);
            }
          }

          for (const socketId of socketIdsToDisconnect) {
            socketBindings.delete(socketId);
          }

          if (openSessions.length > 0) {
            await prisma.teamGameSession.updateMany({
              where: {
                id: {
                  in: openSessions.map((session) => session.id),
                },
              },
              data: {
                status: TeamGameSessionStatus.CLOSED,
                socketId: null,
                disconnectedAt: new Date(),
              },
            });
          }

          removePresence(resolvedGameId, resolvedTeamId);
          emitLiveTeams(io, resolvedGameId);

          for (const socketId of socketIdsToDisconnect) {
            const liveSocket = io.sockets.sockets.get(socketId);
            liveSocket?.disconnect(true);
          }

          console.log(
            `🧹 Host booted stale team session for team ${resolvedTeamId} in game ${resolvedGameId}`
          );

          ack?.({ ok: true });
        } catch (error) {
          console.error('Failed to boot team session:', error);
          ack?.({ ok: false, error: 'Failed to boot team session.' });
        }
      }
    );



  });



  server.listen(PORT, '127.0.0.1', () => {
    console.log(`WebSocket server running on ${protocol} port ${PORT}`);
    console.log(
      `CORS origin: ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`
    );
  });
} catch (err) {
  console.error('❌ Failed to start WebSocket server:', err);
  process.exit(1);
}