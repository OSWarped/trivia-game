interface WagerInputProps {
  value: number | null;
  maxWager: number;
  disabled: boolean;
  submitted: boolean;
  onChange: (value: number | null) => void;
}

export default function WagerInput({
  value,
  maxWager,
  disabled,
  submitted,
  onChange,
}: WagerInputProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="wager-input"
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        Place your wager (0‒{maxWager} points)
      </label>

      <input
        type="number"
        id="wager-input"
        min={0}
        max={maxWager}
        step={1}
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          const num = Number(val);

          if (/^\d*$/.test(val) && num <= maxWager) {
            onChange(val === '' ? null : num);
          }
        }}
        disabled={disabled}
        className="w-full rounded-md border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:ring-blue-200"
        placeholder="Enter your wager…"
      />

      {!submitted && value != null && value > maxWager && (
        <p className="mt-1 text-sm text-red-600">
          Wager cannot exceed your current score.
        </p>
      )}
    </div>
  );
}