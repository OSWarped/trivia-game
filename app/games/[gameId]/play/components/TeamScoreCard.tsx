interface TeamScoreCardProps {
  teamName?: string | null;
  score: number;
  gameTitle?: string | null;
  highlightScore?: boolean;
}

export default function TeamScoreCard({
  teamName,
  score,
  highlightScore = false,
}: TeamScoreCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/35 p-4 shadow-xl backdrop-blur-sm transition-all sm:rounded-3xl sm:p-6 ${highlightScore ? 'ring-2 ring-blue-300/40 sm:ring-4' : ''
        }`}
    >
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-white sm:mt-2 sm:text-2xl">
        {teamName ?? 'Team'}
      </h3>

      <div className="mt-3 flex items-end gap-1 sm:mt-5 sm:gap-2">
        <span className="text-2xl font-bold leading-none text-white sm:text-5xl">
          {score}
        </span>
        <span className="pb-0.5 text-[11px] font-medium text-slate-300 sm:pb-1 sm:text-sm">
          pts
        </span>
      </div>
    </div>
  );
}