interface MultipleChoiceControlProps {
  options: string[];
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}

export default function MultipleChoiceControl({
  options,
  value,
  disabled,
  onChange,
}: MultipleChoiceControlProps) {
  if (!options.length) return null;

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const checked = value.includes(opt);

        return (
          <label
            key={opt}
            className="flex cursor-pointer items-center space-x-3 rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              value={opt}
              checked={checked}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...value, opt]
                  : value.filter((a) => a !== opt);

                onChange(next);
              }}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-800">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}