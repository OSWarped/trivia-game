// File: app/dashboard/host/[gameId]/play/types/host-play.types.ts
import type { GameState } from '@prisma/client';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'SINGLE' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER' | 'LIST';
  options?: QuestionOption[];
  sortOrder: number;
}

export interface Round {
  id: string;
  name: string;
  questions: Question[];
  pointSystem: 'POOL' | 'FLAT';
  pointPool?: number[];
  pointValue?: number;
  sortOrder: number;
}

export interface GameStateExpanded extends GameState {
  game: {
    id: string;
    title: string;
    status: string;
    tag?: string | null;
    scheduledFor: string | null;
    season: {
      id: string;
      name: string;
    };
    site?: {
      id: string;
      name: string;
      address?: string | null;
    } | null;

    rounds: Round[];
    teamGames: {
      team: { id: string; name: string };
      score?: number;
      answers: unknown[];
    }[];
  };
}

export type HostConnectionStatus = 'connected' | 'disconnected';

export type TeamConnectionState =
  | 'ACTIVE'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'PENDING_TRANSFER';

export type TeamTransferMode = 'NORMAL' | 'HOST_APPROVAL' | 'LOCKED';

export interface HostTeamStatus {
  id: string;
  name: string;
  score: number;
  submitted: boolean;

  // Phase 2+ fields
  connectionState?: TeamConnectionState;
  transferMode?: TeamTransferMode;
  hasDispute?: boolean;
  activeSessionLabel?: string | null;
  pendingSessionLabel?: string | null;
}

export interface FlatQuestion extends Question {
  roundId: string;
  roundName: string;
}

export type ReliableEmit = (
  event: string,
  payload: Record<string, unknown>,
  onAck?: (response?: unknown) => void,
  onError?: (err: unknown) => void
) => void;

export interface HostTeamStatus {
  id: string;
  name: string;
  score: number;
  submitted: boolean;

  connectionState?: TeamConnectionState;
  transferMode?: TeamTransferMode;
  hasDispute?: boolean;
  activeSessionLabel?: string | null;
  pendingSessionLabel?: string | null;

  pendingApprovalRequestedAt?: string | null;
  hasPendingApproval?: boolean;
}