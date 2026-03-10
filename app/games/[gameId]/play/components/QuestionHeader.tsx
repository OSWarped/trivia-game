interface QuestionHeaderProps {
  roundName?: string | null;
  questionText?: string | null;
}

export default function QuestionHeader({
  roundName,
  questionText,
}: QuestionHeaderProps) {
  return (
    <header className="mb-4 border-b pb-2">
      <h2 className="text-lg font-semibold text-slate-400">
        Round: <span className="text-blue-600">{roundName ?? '—'}</span>
      </h2>

      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {questionText ?? 'No question loaded.'}
      </h3>
    </header>
  );
}