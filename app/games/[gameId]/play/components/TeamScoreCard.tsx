interface TeamScoreCardProps {
  teamName?: string | null;
  score: number;
  gameTitle?: string | null;
  highlightScore?: boolean;
}

export default function TeamScoreCard({
  score,
  highlightScore = false,
}: TeamScoreCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 shadow-xl backdrop-blur-sm transition-all sm:px-5 sm:py-4 ${
        highlightScore ? 'ring-2 ring-blue-300/40 sm:ring-4' : ''
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
        Score
      </div>

      <div className="mt-1 flex items-end gap-1 sm:gap-2">
        <span className="text-3xl font-bold leading-none text-white sm:text-5xl">
          {score}
        </span>
        <span className="pb-0.5 text-xs font-medium text-slate-300 sm:pb-1 sm:text-sm">
          pts
        </span>
      </div>
    </div>
  );
}