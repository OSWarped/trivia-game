'use client';

import type { JoinableTeam } from '../lib/join-types';
import {
  formatLastPlayed,
  getSuggestionBadges,
} from '../lib/join-utils';

interface TeamSuggestionsProps {
  teams: JoinableTeam[];
  visible: boolean;
  normalizedQuery: string;
  selectedTeamId: string | null;
  onSelectTeam: (team: JoinableTeam) => void;
}

export default function TeamSuggestions({
  teams,
  visible,
  normalizedQuery,
  selectedTeamId,
  onSelectTeam,
}: TeamSuggestionsProps) {
  if (!visible || teams.length === 0) {
    return null;
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
      <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
        Matching Teams
      </div>

      <div className="space-y-1">
        {teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          const badges = getSuggestionBadges(team);
          const isExactMatch =
            normalizedQuery.length > 0 && team.normalizedKey === normalizedQuery;
          const lastPlayed = formatLastPlayed(team.lastPlayedAtSite);

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team)}
              className={[
                'w-full rounded-xl border px-3 py-3 text-left transition',
                isSelected
                  ? 'border-cyan-300 bg-cyan-400/15'
                  : 'border-transparent bg-white/5 hover:border-white/10 hover:bg-white/10',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                      {team.name}
                    </span>

                    {isExactMatch ? (
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        Exact
                      </span>
                    ) : null}

                    {isSelected ? (
                      <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                        Selected
                      </span>
                    ) : null}
                  </div>

                  {lastPlayed ? (
                    <p className="mt-1 text-xs text-white/45">
                      Last played: {lastPlayed}
                    </p>
                  ) : null}

                  {badges.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {badges.map((badge) => (
                        <span
                          key={`${team.id}-${badge}`}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/65"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <span className="shrink-0 self-center text-xs font-medium text-cyan-200/80">
                  Select
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}