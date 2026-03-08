import { useEffect, useState } from 'react';

type VoidHandler = () => void;
type ScoreUpdateHandler = (payload: { teamId: string; newScore: number }) => void;

interface PlaySocketLike {
  connected: boolean;
  emit: (
    event: 'team:join',
    payload: { gameId: string; teamId: string; teamName: string }
  ) => void;
  on(event: 'disconnect', handler: VoidHandler): void;
  on(event: 'connect', handler: VoidHandler): void;
  on(event: 'score:update', handler: ScoreUpdateHandler): void;
  on(event: 'game:updateQuestion', handler: VoidHandler): void;
  on(event: 'game:gameCompleted', handler: VoidHandler): void;
  off(event: 'disconnect', handler: VoidHandler): void;
  off(event: 'connect', handler: VoidHandler): void;
  off(event: 'score:update', handler: ScoreUpdateHandler): void;
  off(event: 'game:updateQuestion', handler: VoidHandler): void;
  off(event: 'game:gameCompleted', handler: VoidHandler): void;
}

interface ScoreUpdatePayload {
  teamId: string;
  newScore: number;
}

interface UsePlaySocketSyncParams {
  socket: PlaySocketLike | null;
  gameId: string | null;
  teamId: string | null;
  teamName: string | null;
  onScoreUpdate: (payload: ScoreUpdatePayload) => void;
  onQuestionAdvance: () => void | Promise<void>;
  onGameCompleted: () => void;
}

export function usePlaySocketSync({
  socket,
  gameId,
  teamId,
  teamName,
  onScoreUpdate,
  onQuestionAdvance,
  onGameCompleted,
}: UsePlaySocketSyncParams) {
  const [connectionStatus, setConnectionStatus] = useState('connected');

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

    const handleScoreUpdate = (payload: ScoreUpdatePayload) => {
      onScoreUpdate(payload);
    };

    const handleQuestionAdvance = async () => {
      await onQuestionAdvance();
    };

    const handleGameCompleted = () => {
      onGameCompleted();
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
  }, [
    socket,
    gameId,
    teamId,
    teamName,
    onScoreUpdate,
    onQuestionAdvance,
    onGameCompleted,
  ]);

  return {
    connectionStatus,
  };
}