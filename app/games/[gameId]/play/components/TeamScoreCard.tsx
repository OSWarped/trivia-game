interface TeamScoreCardProps {
  teamName?: string | null;
  score: number;
  gameTitle?: string | null;
  highlightScore?: boolean;
}

export default function TeamScoreCard({
  teamName,
  score,
  gameTitle,
  highlightScore = false,
}: TeamScoreCardProps) {
  return (
    <div
      className={`rounded-lg bg-white p-6 shadow transition-all ${
        highlightScore ? 'animate-pulse ring-4 ring-blue-300' : ''
      }`}
    >
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        👤 {teamName ?? 'Team'}
      </h3>

      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-blue-600">{score}</span>
        <span className="text-sm text-gray-500">pts</span>
      </div>

      {gameTitle ? <p className="mt-4 text-sm text-gray-500">{gameTitle}</p> : null}
    </div>
  );
}