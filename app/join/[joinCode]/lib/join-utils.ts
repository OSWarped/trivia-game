import type { JoinableTeam, SessionApiResponse } from './join-types';

export const JOINABLE_STATUSES = new Set(['SCHEDULED', 'LIVE']);

export function normalizeTeamNameForCompare(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function formatScheduledFor(value: string | null): string {
  if (!value) return 'TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return date.toLocaleString();
}

export function formatLastPlayed(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString();
}

export function getSuggestionBadges(team: JoinableTeam): string[] {
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

export function getSubmitErrorMessage(data: SessionApiResponse): string {
  switch (data.code) {
    case 'HOST_APPROVAL_REQUIRED':
      return data.error || 'This team requires host approval before joining.';
    case 'TEAM_LOCKED':
      return data.error || 'This team has been locked by the host for this game.';
    case 'DEVICE_ALREADY_JOINED':
      return (
        data.error ||
        'This device is already joined to another team for this game. Resume that team instead of switching now.'
      );
    default:
      return data.error || 'Failed to join game.';
  }
}