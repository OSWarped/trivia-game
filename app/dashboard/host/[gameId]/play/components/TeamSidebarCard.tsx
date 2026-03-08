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
}

type PendingAction =
  | 'resetPin'
  | 'revokeLock'
  | 'unlock'
  | 'requireApproval'
  | 'setNormal'
  | 'approveRequest'
  | 'denyRequest'
  | null;

function getCardAccentClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'border-red-200 bg-red-50/60';
  }

  if (team.transferMode === 'HOST_APPROVAL') {
    return 'border-blue-200 bg-blue-50/50';
  }

  switch (team.connectionState) {
    case 'ACTIVE':
      return 'border-green-200 bg-white';
    case 'RECONNECTING':
      return 'border-amber-200 bg-amber-50/40';
    case 'OFFLINE':
      return 'border-slate-200 bg-white';
    case 'PENDING_TRANSFER':
      return 'border-orange-200 bg-orange-50/40';
    default:
      return 'border-slate-200 bg-white';
  }
}

function getScorePillClasses(team: HostTeamStatus): string {
  if (team.transferMode === 'LOCKED') {
    return 'bg-red-100 text-red-700';
  }

  if (team.transferMode === 'HOST_APPROVAL') {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-blue-50 text-blue-700';
}

export default function TeamSidebarCard({
  team,
  onRevokeSession,
  onUnlockSession,
  onResetPin,
  onSetTeamTransferMode,
  onApproveJoinRequest,
  onDenyJoinRequest,
}: TeamSidebarCardProps) {
  const [isResettingPin, setIsResettingPin] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [isUnlocking, setIsUnlocking] = React.useState(false);
  const [isSettingMode, setIsSettingMode] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isDenying, setIsDenying] = React.useState(false);

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
    isDenying;

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
        error instanceof Error ? error.message : 'Failed to reset PIN.';
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
          : 'Failed to revoke and lock team.';
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
        error instanceof Error ? error.message : 'Failed to unlock team.';
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
        error instanceof Error ? error.message : 'Failed to require approval.';
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
        error instanceof Error ? error.message : 'Failed to set normal mode.';
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
        error instanceof Error ? error.message : 'Failed to approve request.';
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
        error instanceof Error ? error.message : 'Failed to deny request.';
      window.alert(message);
    } finally {
      setIsDenying(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${getCardAccentClasses(
          team
        )}`}
      >
        <div className="flex h-full flex-col gap-3">
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
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${getScorePillClasses(
                team
              )}`}
            >
              {team.score ?? 0} pts
            </div>
          </div>
          
          {pinVisible && revealedPin ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    New Team PIN
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-[0.2em] text-indigo-900">
                    {revealedPin}
                  </div>
                </div>

                <button
                  onClick={() => setPinVisible(false)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  Hide
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <div>
              {team.hasPendingApproval ? (
                <button
                  onClick={() => setPendingAction('approveRequest')}
                  disabled={isBusy}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApproving ? 'Approving...' : 'Approve Request'}
                </button>
              ) : team.transferMode === 'LOCKED' ? (
                <button
                  onClick={() => setPendingAction('unlock')}
                  disabled={isBusy}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUnlocking ? 'Unlocking...' : 'Unlock Team'}
                </button>
              ) : null}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                disabled={isBusy}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Actions
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => openAction('resetPin')}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset PIN
                  </button>

                  {team.transferMode !== 'LOCKED' &&
                    team.transferMode !== 'HOST_APPROVAL' ? (
                    <button
                      type="button"
                      onClick={() => openAction('requireApproval')}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Require Approval
                    </button>
                  ) : null}

                  {team.transferMode === 'HOST_APPROVAL' ? (
                    <button
                      type="button"
                      onClick={() => openAction('setNormal')}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Set Normal
                    </button>
                  ) : null}

                  {team.hasPendingApproval ? (
                    <button
                      type="button"
                      onClick={() => openAction('denyRequest')}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Deny Request
                    </button>
                  ) : null}

                  {team.transferMode !== 'LOCKED' ? (
                    <button
                      type="button"
                      onClick={() => openAction('revokeLock')}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50"
                    >
                      Revoke + Lock
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
        title="Reset team PIN?"
        message={`This will immediately replace the current PIN for ${team.name}. Anyone using the old PIN will no longer be able to join with it.`}
        confirmLabel="Reset PIN"
        tone="primary"
        isLoading={isResettingPin}
        onConfirm={() => void handleConfirmedResetPin()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'revokeLock'}
        title="Revoke and lock team?"
        message={`This will close the current session for ${team.name} and prevent them from rejoining until the team is unlocked by the host.`}
        confirmLabel="Revoke + Lock"
        tone="danger"
        isLoading={isRevoking}
        onConfirm={() => void handleConfirmedRevokeLock()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'unlock'}
        title="Unlock team?"
        message={`This will allow ${team.name} to join the game again. Their previously revoked session will remain closed, so they will need to join fresh.`}
        confirmLabel="Unlock Team"
        tone="primary"
        isLoading={isUnlocking}
        onConfirm={() => void handleConfirmedUnlock()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'requireApproval'}
        title="Require host approval?"
        message={`This will prevent ${team.name} from joining automatically until the host approves a request.`}
        confirmLabel="Require Approval"
        tone="primary"
        isLoading={isSettingMode}
        onConfirm={() => void handleConfirmedRequireApproval()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'setNormal'}
        title="Set team to normal access?"
        message={`This will remove host approval mode for ${team.name} and allow them to join normally again.`}
        confirmLabel="Set Normal"
        tone="primary"
        isLoading={isSettingMode}
        onConfirm={() => void handleConfirmedSetNormal()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'approveRequest'}
        title="Approve join request?"
        message={`This will approve the pending request for ${team.name} and return the team to normal join access.`}
        confirmLabel="Approve Request"
        tone="primary"
        isLoading={isApproving}
        onConfirm={() => void handleConfirmedApproveRequest()}
        onCancel={closeModal}
      />

      <ConfirmActionModal
        open={pendingAction === 'denyRequest'}
        title="Deny join request?"
        message={`This will clear the pending request for ${team.name}. The team will remain in host approval mode until you change it.`}
        confirmLabel="Deny Request"
        tone="danger"
        isLoading={isDenying}
        onConfirm={() => void handleConfirmedDenyRequest()}
        onCancel={closeModal}
      />
    </>
  );
}