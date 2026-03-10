interface SingleAnswerControlProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SingleAnswerControl({
  value,
  disabled,
  onChange,
  placeholder = 'Type your answer…',
}: SingleAnswerControlProps) {
  return (
    <input
      type="text"
      className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}