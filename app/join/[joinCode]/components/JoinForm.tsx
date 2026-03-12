'use client';

import type { FormEvent, ReactNode } from 'react';

interface JoinFormProps {
  teamName: string;
  pin: string;
  isSubmitting: boolean;
  isAttemptingResume: boolean;
  isJoinable: boolean;
  approvalPending: boolean;
  hasAmbiguousExactMatch: boolean;
  selectedTeamName: string | null;
  teamSuggestions?: ReactNode;
  onTeamNameChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function JoinForm({
  teamName,
  pin,
  isSubmitting,
  isAttemptingResume,
  isJoinable,
  approvalPending,
  hasAmbiguousExactMatch,
  selectedTeamName,
  teamSuggestions,
  onTeamNameChange,
  onPinChange,
  onSubmit,
}: JoinFormProps) {
  const trimmedTeamName = teamName.trim();
  const isDisabled =
    isSubmitting ||
    isAttemptingResume ||
    !isJoinable ||
    !trimmedTeamName;

  const buttonLabel = isAttemptingResume
    ? 'Restoring Session...'
    : isSubmitting
      ? 'Joining...'
      : approvalPending
        ? 'Retry Join'
        : 'Join Game';

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur"
    >
      <div>
        <label
          htmlFor="teamName"
          className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-white/70"
        >
          Team Name
        </label>

        <input
          id="teamName"
          name="teamName"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          placeholder="Enter your team name"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
          disabled={isSubmitting || isAttemptingResume}
        />

        {teamSuggestions ? <div className="mt-2">{teamSuggestions}</div> : null}
      </div>

      {selectedTeamName ? (
        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          Using existing team:{' '}
          <span className="font-semibold text-white">{selectedTeamName}</span>
        </div>
      ) : null}

      {hasAmbiguousExactMatch && !selectedTeamName ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Multiple teams match that name exactly. Please choose your team from the
          autocomplete list before joining.
        </div>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor="pin"
          className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-white/70"
        >
          Team PIN <span className="text-white/40 normal-case">(optional)</span>
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => onPinChange(e.target.value)}
          placeholder="Enter 4-digit PIN if your team uses one"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
          disabled={isSubmitting || isAttemptingResume}
        />
        <p className="mt-2 text-xs text-white/50">
          If your team already has a PIN, enter it exactly. Otherwise leave this blank.
        </p>
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="mt-6 w-full rounded-2xl bg-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </form>
  );
}