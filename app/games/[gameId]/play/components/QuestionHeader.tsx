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
      <h2 className="text-lg font-semibold text-gray-700">
        Round: <span className="text-blue-600">{roundName ?? '—'}</span>
      </h2>

      <h3 className="mt-1 text-xl font-medium text-gray-900">
        {questionText ?? 'No question loaded.'}
      </h3>
    </header>
  );
}