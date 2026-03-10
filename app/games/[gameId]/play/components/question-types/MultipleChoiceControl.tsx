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
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
            />
            <span className="text-gray-800">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}