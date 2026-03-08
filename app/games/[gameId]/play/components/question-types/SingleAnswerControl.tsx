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
      className="w-full rounded-md border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:ring-blue-200"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}