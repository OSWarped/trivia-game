// File: app/dashboard/host/[gameId]/play/components/TeamSidebarCard.tsx
'use client';

import React from 'react';
import type {
  HostTeamStatus,
  TeamTransferMode,
} from '../types/host-play.types';
import TeamStatusBadges from './TeamStatusBadges';
import ConfirmActionModal from './ConfirmActionModal';

interface TeamSidebarCardProps {
  team: HostTeamStatus;
  onRevokeSession: (teamId: string) => Promise<void>;
  onUnlockSession: (teamId: string) => Promise<void>;
  onResetPin: (teamId: string) => Promise<string>;
  onSetTeamTransferMode: (
    teamId: string,
    mode: TeamTransferMode
  ) => Promise<void>;
  onApproveJoinRequest: (teamId: string) => Promise<void>;
  onDenyJoinRequest: (teamId: string) => Promise<void>;
  onBootTeam: (teamId: string) => Promise<void>;
}

type PendingAction =
  | 'resetPin'
  | 'revokeLock'
  | 'unlock'
  | 'requireApproval'
  | 'setNormal'
  | 'approveRequest'
  | 'denyRequest'
  | 'bootTeam'
  | null;

function formatDurationShort(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(durationMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatActivityReasonLabel(
  reason?: HostTeamStatus['lastInactiveReason'] | null
): string | null {
  if (!reason) {
    return null;
  }

  const labels: Record<NonNullable<HostTeamStatus['lastInactiveReason']>, string> = {
    TAB_HIDDEN: 'Tab hidden',
    WINDOW_BLUR: 'Window lost focus',
    APP_BACKGROUNDED: 'App backgrounded',
    SOCKET_DISCONNECTED: 'Connection interrupted',
    HEARTBEAT_TIMEOUT: 'Heartbeat timeout',
    PAGE_UNLOADED: 'Page unloaded',
    HOST_TRANSFER: 'Host transfer in progress',
    HOST_REVOKED: 'Host ended session',
    UNKNOWN: 'Unknown',
  };

  return labels[reason] ?? reason.replaceAll('_', ' ');
}

function shouldShowActivityPanel(team: HostTeamStatus): boolean {
  return Boolean(
    team.isInactiveNow ||
      team.inactiveBeforeSubmission ||
      team.inactiveAfterSubmission ||
      team.highConcernThisQuestion ||
      (team.inactiveEventCountThisQuestion ?? 0) > 0 ||
      (team.inactiveTotalMsThisQuestion ?? 0) > 0 ||
      (team.inactiveEventCountThisGame ?? 0) > 0 ||
      (team.inactiveTotalMsThisGame ?? 0) > 0 ||
      (team.recentActivityEvents?.length ?? 0) > 0
  );
}

function getCardAccentClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'border-rose-300 bg-rose-50/70';
  }

  if (team.activitySeverity === 'HIGH' || team.highConcernThisQuestion) {
    return 'border-rose-300 bg-rose-50/70';
  }

  if (team.transferMode === 'HOST_APPROVAL') {
    return 'border-blue-200 bg-blue-50/50';
  }

  if (
    team.isInactiveNow ||
    team.activitySeverity === 'MEDIUM' ||
    team.connectionState === 'RECONNECTING'
  ) {
    return 'border-amber-300 bg-amber-50/50';
  }

  switch (team.connectionState) {
    case 'ACTIVE':
      return 'border-emerald-200 bg-white';
    case 'OFFLINE':
      return 'border-slate-200 bg-slate-50/60';
    case 'PENDING_TRANSFER':
      return 'border-orange-200 bg-orange-50/40';
    default:
      return 'border-slate-200 bg-white';
  }
}

function getScorePillClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (team.activitySeverity === 'HIGH' || team.highConcernThisQuestion) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (team.transferMode === 'HOST_APPROVAL') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (team.activitySeverity === 'MEDIUM' || team.isInactiveNow) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getActivityPanelClasses(team: HostTeamStatus): string {
  if (team.activitySeverity === 'HIGH' || team.highConcernThisQuestion) {
    return 'border-rose-200 bg-rose-50/80';
  }

  if (team.activitySeverity === 'MEDIUM' || team.isInactiveNow) {
    return 'border-amber-200 bg-amber-50/80';
  }

  return 'border-slate-200 bg-slate-50/70';
}

function getActivityHeadline(team: HostTeamStatus): string {
  const duration = formatDurationShort(team.inactiveDurationMsCurrent);

  if (team.isInactiveNow) {
    if (team.lastInactiveReason === 'TAB_HIDDEN') {
      return `Team left the play screen ${duration} ago`;
    }

    if (team.lastInactiveReason === 'WINDOW_BLUR') {
      return `Team left the browser window ${duration} ago`;
    }

    if (team.lastInactiveReason === 'SOCKET_DISCONNECTED') {
      return `Connection was lost ${duration} ago`;
    }

    return `Team has been away for ${duration}`;
  }

  if (team.inactiveBeforeSubmission) {
    return 'Away before answer submission';
  }

  if (team.highConcernThisQuestion) {
    return "Review this team's activity";
  }

  if ((team.inactiveEventCountThisQuestion ?? 0) > 0) {
    return 'Away activity recorded this question';
  }

  return 'Activity recorded during this game';
}

function getActivityDetail(team: HostTeamStatus): string {
  const eventsThisQuestion = team.inactiveEventCountThisQuestion ?? 0;
  const totalThisQuestion = team.inactiveTotalMsThisQuestion ?? 0;
  const eventsThisGame = team.inactiveEventCountThisGame ?? 0;
  const totalThisGame = team.inactiveTotalMsThisGame ?? 0;

  if (eventsThisQuestion > 0 || totalThisQuestion > 0) {
    return `This question: ${eventsThisQuestion} event${
      eventsThisQuestion === 1 ? '' : 's'
    } • ${formatDurationShort(totalThisQuestion)} away`;
  }

  if (team.isInactiveNow) {
    return 'Current away event is in progress.';
  }

  return `Game total: ${eventsThisGame} event${
    eventsThisGame === 1 ? '' : 's'
  } • ${formatDurationShort(totalThisGame)} away`;
}

function getActivitySubdetail(team: HostTeamStatus): string | null {
  const reasonLabel = formatActivityReasonLabel(team.lastInactiveReason);

  if (team.inactiveBeforeSubmission) {
    return 'Team left the app before submitting an answer.';
  }

  if (team.inactiveAfterSubmission) {
    return 'Team left the app after submitting an answer.';
  }

  if (team.isInactiveNow && reasonLabel) {
    return `Reason: ${reasonLabel}.`;
  }

  return null;
}

export default function TeamSidebarCard({
  team,
  onRevokeSession,
  onUnlockSession,
  onResetPin,
  onSetTeamTransferMode,
  onApproveJoinRequest,
  onDenyJoinRequest,
  onBootTeam,
}: TeamSidebarCardProps) {
  const [isResettingPin, setIsResettingPin] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [isUnlocking, setIsUnlocking] = React.useState(false);
  const [isSettingMode, setIsSettingMode] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isDenying, setIsDenying] = React.useState(false);
  const [isBooting, setIsBooting] = React.useState(false);

  const [revealedPin, setRevealedPin] = React.useState<string | null>(null);
  const [pinVisible, setPinVisible] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const isBusy =
    isResettingPin ||
    isRevoking ||
    isUnlocking ||
    isSettingMode ||
    isApproving ||
    isDenying ||
    isBooting;

  const canBootTeam =
    team.connectionState === 'OFFLINE' ||
    team.connectionState === 'RECONNECTING';

  const showActivityPanel = shouldShowActivityPanel(team);

  React.useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const closeModal = () => {
    if (isBusy) return;
    setPendingAction(null);
  };

  const openAction = (action: PendingAction) => {
    setMenuOpen(false);
    setPendingAction(action);
  };

  const handleConfirmedResetPin = async () => {
    try {
      setIsResettingPin(true);
      const newPin = await onResetPin(team.id);
      setRevealedPin(newPin);
      setPinVisible(true);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate a new team PIN.';
      window.alert(message);
    } finally {
      setIsResettingPin(false);
    }
  };

  const handleConfirmedRevokeLock = async () => {
    try {
      setIsRevoking(true);
      await onRevokeSession(team.id);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to end session and lock team.';
      window.alert(message);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleConfirmedUnlock = async () => {
    try {
      setIsUnlocking(true);
      await onUnlockSession(team.id);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to unlock rejoin.';
      window.alert(message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleConfirmedRequireApproval = async () => {
    try {
      setIsSettingMode(true);
      await onSetTeamTransferMode(team.id, 'HOST_APPROVAL');
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to require host approval.';
      window.alert(message);
    } finally {
      setIsSettingMode(false);
    }
  };

  const handleConfirmedSetNormal = async () => {
    try {
      setIsSettingMode(true);
      await onSetTeamTransferMode(team.id, 'NORMAL');
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to allow normal rejoin.';
      window.alert(message);
    } finally {
      setIsSettingMode(false);
    }
  };

  const handleConfirmedApproveRequest = async () => {
    try {
      setIsApproving(true);
      await onApproveJoinRequest(team.id);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to approve join request.';
      window.alert(message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmedDenyRequest = async () => {
    try {
      setIsDenying(true);
      await onDenyJoinRequest(team.id);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to deny join request.';
      window.alert(message);
    } finally {
      setIsDenying(false);
    }
  };

  const handleConfirmedBootTeam = async () => {
    try {
      setIsBooting(true);
      await onBootTeam(team.id);
      setPendingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to clear stale session.';
      window.alert(message);
    } finally {
      setIsBooting(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${getCardAccentClasses(
          team
        )}`}
      >
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 break-words text-[15px] font-semibold leading-5 text-slate-900">
                {team.name}
              </div>

              <div className="mt-2">
                <TeamStatusBadges team={team} />
              </div>
            </div>

            <div
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${getScorePillClasses(
                team
              )}`}
            >
              {team.score ?? 0} pts
            </div>
          </div>

          {showActivityPanel ? (
            <div
              className={`rounded-2xl border px-3 py-3 ${getActivityPanelClasses(
                team
              )}`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Session Activity
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {getActivityHeadline(team)}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {getActivityDetail(team)}
                </div>
                {getActivitySubdetail(team) ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {getActivitySubdetail(team)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {pinVisible && revealedPin ? (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    Generated Team PIN
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-[0.2em] text-indigo-900">
                    {revealedPin}
                  </div>
                </div>

                <button
                  onClick={() => setPinVisible(false)}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  Hide
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div>
              {team.hasPendingApproval ? (
                <button
                  onClick={() => setPendingAction('approveRequest')}
                  disabled={isBusy}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApproving ? 'Approving...' : 'Approve Join Request'}
                </button>
              ) : team.transferMode === 'LOCKED' ? (
                <button
                  onClick={() => setPendingAction('unlock')}
                  disabled={isBusy}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUnlocking ? 'Unlocking...' : 'Unlock Rejoin'}
                </button>
              ) : null}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                disabled={isBusy}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Actions
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => openAction('resetPin')}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Generate New PIN
                  </button>

                  {team.transferMode !== 'LOCKED' &&
                  team.transferMode !== 'HOST_APPROVAL' ? (
                    <button
                      type="button"
                      onClick={() => openAction('requireApproval')}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Require Host Approval
                    </button>
                  ) : null}

                  {team.transferMode === 'HOST_APPROVAL' ? (
                    <button
                      type="button"
                      onClick={() => openAction('setNormal')}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Allow Normal Rejoin
                    </button>
                  ) : null}

                  {team.hasPendingApproval ? (
                    <button
                      type="button"
                      onClick={() => openAction('denyRequest')}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Deny Join Request
                    </button>
                  ) : null}

                  {canBootTeam ? (
                    <button
                      type="button"
                      onClick={() => openAction('bootTeam')}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-amber-50"
                    >
                      Clear Stale Session
                    </button>
                  ) : null}

                  {team.transferMode !== 'LOCKED' ? (
                    <button
                      type="button"
                      onClick={() => openAction('revokeLock')}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                    >
                      End Session + Lock Team
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={pendingAction === 'resetPin'}
        title="Generate a new team PIN?"
        message={`This will replace the current PIN for ${team.name}. Anyone using the old PIN will need the new one to join again.`}
        confirmLabel="Generate New PIN"
        tone="primary"
        isLoading={isResettingPin}
        onConfirm={() => void handleConfirmedResetPin()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'revokeLock'}
        title="End session and lock this team?"
        message={`This will end the current session for ${team.name} and prevent rejoining until you unlock them.`}
        confirmLabel="End Session + Lock Team"
        tone="danger"
        isLoading={isRevoking}
        onConfirm={() => void handleConfirmedRevokeLock()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'unlock'}
        title="Unlock team rejoin?"
        message={`This will allow ${team.name} to join again. Their previous session will stay closed.`}
        confirmLabel="Unlock Rejoin"
        tone="primary"
        isLoading={isUnlocking}
        onConfirm={() => void handleConfirmedUnlock()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'requireApproval'}
        title="Require host approval for this team?"
        message={`${team.name} will no longer rejoin automatically. Future joins will need host approval.`}
        confirmLabel="Require Host Approval"
        tone="primary"
        isLoading={isSettingMode}
        onConfirm={() => void handleConfirmedRequireApproval()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'setNormal'}
        title="Allow normal rejoin?"
        message={`This removes host approval mode and lets ${team.name} rejoin normally.`}
        confirmLabel="Allow Normal Rejoin"
        tone="primary"
        isLoading={isSettingMode}
        onConfirm={() => void handleConfirmedSetNormal()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'approveRequest'}
        title="Approve this join request?"
        message={`This will let ${team.name} back into the game and restore normal access.`}
        confirmLabel="Approve Join Request"
        tone="primary"
        isLoading={isApproving}
        onConfirm={() => void handleConfirmedApproveRequest()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'denyRequest'}
        title="Deny this join request?"
        message={`This clears the current request. The team will remain in approval-only mode.`}
        confirmLabel="Deny Join Request"
        tone="danger"
        isLoading={isDenying}
        onConfirm={() => void handleConfirmedDenyRequest()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'bootTeam'}
        title="Clear stale session?"
        message={`This removes the inactive session for ${team.name} from host view. The team can still rejoin later if allowed.`}
        confirmLabel="Clear Stale Session"
        tone="danger"
        isLoading={isBooting}
        onConfirm={() => void handleConfirmedBootTeam()}
        onCancel={closeModal}
      />
    </>
  );
}