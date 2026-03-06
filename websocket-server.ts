/* eslint-disable @typescript-eslint/no-unused-vars */
import { Server } from 'socket.io';
import { setIo } from './lib/socket.js';
import { registerReliableHandler } from './lib/reliable-handshake.js';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env'
    : '.env.local';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

console.log(`Loaded environment from ${envFile}`);
console.log(`NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`);

const PORT = Number(process.env.SOCKET_PORT || 3009);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || '*';

const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_CA_PATH = process.env.SSL_CA_PATH;

const teamSessions = new Map<string, { gameId: string; teamId: string; teamName: string }>();
const activeTeamsByGame = new Map<string, Map<string, { id: string; name: string }>>();

function resolveFilePath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
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

  return SOCKET_CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildServer() {
  const resolvedKeyPath = resolveFilePath(SSL_KEY_PATH);
  const resolvedCertPath = resolveFilePath(SSL_CERT_PATH);
  const resolvedCaPath = resolveFilePath(SSL_CA_PATH);

  const hasHttpsConfig = Boolean(resolvedKeyPath && resolvedCertPath);

  if (hasHttpsConfig) {
    console.log('Starting WebSocket server in HTTPS mode');
    console.log(`SSL key path: ${resolvedKeyPath}`);
    console.log(`SSL cert path: ${resolvedCertPath}`);
    if (resolvedCaPath) {
      console.log(`SSL CA path: ${resolvedCaPath}`);
    }

    const httpsOptions: https.ServerOptions = {
      key: readFileOrThrow('SSL key', resolvedKeyPath!),
      cert: readFileOrThrow('SSL cert', resolvedCertPath!),
    };

    if (resolvedCaPath) {
      httpsOptions.ca = readFileOrThrow('SSL CA', resolvedCaPath);
    }

    return {
      server: https.createServer(httpsOptions),
      protocol: 'HTTPS',
    };
  }

  if (SSL_KEY_PATH || SSL_CERT_PATH || SSL_CA_PATH) {
    console.warn('Some SSL environment variables were provided, but both SSL_KEY_PATH and SSL_CERT_PATH are required for HTTPS.');
    console.warn('Falling back to HTTP mode.');
  } else {
    console.log('Starting WebSocket server in HTTP mode');
  }

  return {
    server: http.createServer(),
    protocol: 'HTTP',
  };
}

function emitLiveTeams(io: Server, gameId: string) {
  const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []);
  io.to(gameId).emit('team:liveTeams', { gameId, teams });
  io.to(gameId).emit('host:liveTeams', { gameId, teams });
}

try {
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
      io.to(gameId).emit('host:answerSubmission', { teamId, questionId, answer, pointsUsed });
      return {};
    }
  );

  registerReliableHandler(io, 'host:scoreUpdate', async (_socket, { gameId, teamId, newScore }) => {
    console.log(`Score update for Team ${teamId}: ${newScore}`);
    io.to(gameId).emit('score:update', { teamId, newScore });
    return {};
  });

  io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    socket.on('team:join', ({ gameId, teamId, teamName }) => {
      if (!gameId || !teamId || !teamName) return;

      socket.join(gameId);

      const isReconnect =
        activeTeamsByGame.has(gameId) &&
        activeTeamsByGame.get(gameId)?.has(teamId);

      teamSessions.set(socket.id, { gameId, teamId, teamName });

      if (!activeTeamsByGame.has(gameId)) {
        activeTeamsByGame.set(gameId, new Map());
      }

      const gameTeams = activeTeamsByGame.get(gameId)!;
      gameTeams.set(teamId, { id: teamId, name: teamName });

      emitLiveTeams(io, gameId);
      io.to(gameId).emit('host:teamReconnected', { teamId, teamName, gameId });

      if (isReconnect) {
        console.log(`🔄 Team ${teamName} (${teamId}) rejoined game ${gameId}`);
      } else {
        console.log(`📥 Team ${teamName} (${teamId}) joined lobby for game ${gameId}`);
      }
    });

    socket.on('team:leave_lobby', ({ gameId, teamId }) => {
      const gameTeams = activeTeamsByGame.get(gameId);
      if (!gameTeams) return;

      gameTeams.delete(teamId);

      if (gameTeams.size === 0) {
        activeTeamsByGame.delete(gameId);
      }

      emitLiveTeams(io, gameId);
    });

    socket.on('team:getLiveTeams', ({ gameId }) => {
      const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []);
      socket.emit('team:liveTeams', { gameId, teams });
      socket.emit('host:liveTeams', { gameId, teams });
    });

    socket.on('disconnect', (reason) => {
      const session = teamSessions.get(socket.id);
      if (!session) return;

      const { gameId, teamId, teamName } = session;
      console.log(`❌ Disconnected: ${teamName} (${teamId}) from game ${gameId} - Reason: ${reason}`);

      teamSessions.delete(socket.id);

      const gameTeams = activeTeamsByGame.get(gameId);
      if (!gameTeams) return;

      gameTeams.delete(teamId);

      if (gameTeams.size === 0) {
        activeTeamsByGame.delete(gameId);
      }

      emitLiveTeams(io, gameId);
    });

    socket.on('host:gameStarted', ({ gameId }) => {
      io.to(gameId).emit('game_started');
    });

    socket.on('host:requestLiveTeams', ({ gameId }) => {
      const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []);
      socket.emit('host:liveTeams', { gameId, teams });
    });

    socket.on('host:join', ({ gameId }) => {
      socket.join(gameId);
    });

    socket.on('host:resetSubmissions', ({ gameId }) => {
      io.to(gameId).emit('game:resetSubmissions', { gameId });
    });

    socket.on('host:transition', ({ gameId, transitionMessage, transitionMedia, adEmbedCode }) => {
      io.to(gameId).emit('game:transition', {
        gameId,
        transitionMessage,
        transitionMedia,
        adEmbedCode,
      });
    });

    socket.on('host:toggleScores', ({ gameId, scoresVisibleToPlayers }) => {
      io.to(gameId).emit('game:scoresVisibilityChanged', {
        gameId,
        scoresVisibleToPlayers,
      });
    });

    socket.on('host:gameCompleted', ({ gameId }) => {
      io.to(gameId).emit('game:gameCompleted', { gameId });
    });

    socket.on('score:update', ({ gameId, teamId, newScore }) => {
      io.to(gameId).emit('score:update', { teamId, newScore });
    });
  });

  server.listen(PORT, () => {
    console.log(`WebSocket server running on ${protocol} port ${PORT}`);
    console.log(`CORS origin: ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`);
  });
} catch (err) {
  console.error('❌ Failed to start WebSocket server:', err);
  process.exit(1);
}