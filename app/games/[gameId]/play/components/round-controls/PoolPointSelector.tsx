interface PoolPointSelectorProps {
  remainingPoints: number[];
  selectedPoints: number | null;
  disabled: boolean;
  onChange: (value: number) => void;
}

export default function PoolPointSelector({
  remainingPoints,
  selectedPoints,
  disabled,
  onChange,
}: PoolPointSelectorProps) {
  if (!remainingPoints.length) return null;

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-medium text-slate-200">
        Select a Point Value
      </h4>

      <div className="flex flex-wrap gap-3">
        {remainingPoints.map((pt) => (
          <button
            key={pt}
            type="button"
            onClick={() => onChange(pt)}
            disabled={disabled}
            className={`flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedPoints === pt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {pt}
          </button>
        ))}
      </div>
    </div>
  );
}