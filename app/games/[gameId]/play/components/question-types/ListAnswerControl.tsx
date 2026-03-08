interface ListAnswerControlProps {
  itemCount: number;
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}

export default function ListAnswerControl({
  itemCount,
  value,
  disabled,
  onChange,
}: ListAnswerControlProps) {
  if (!itemCount) return null;

  return (
    <div className="space-y-2">
      <p className="mb-2 font-semibold">Name all {itemCount} items:</p>

      {Array.from({ length: itemCount }, (_, idx) => (
        <input
          key={idx}
          type="text"
          className="w-full rounded border p-2"
          value={value[idx] ?? ''}
          onChange={(e) => {
            const next = Array.from({ length: itemCount }, (_, i) => value[i] ?? '');
            next[idx] = e.target.value;
            onChange(next);
          }}
          disabled={disabled}
          placeholder={`Item ${idx + 1}`}
        />
      ))}
    </div>
  );
}