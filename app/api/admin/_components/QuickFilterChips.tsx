'use client';

interface QuickFilterChipsProps {
  active: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30';
  onSelect: (value: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30') => void;
}

const FILTERS: Array<{
  value: 'UPCOMING' | 'PAST' | 'ALL' | 'LIVE' | 'NEXT_30';
  label: string;
}> = [
  { value: 'NEXT_30', label: 'Next 30 Days' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'LIVE', label: 'Live' },
  { value: 'PAST', label: 'Past' },
  { value: 'ALL', label: 'All' },
];

export default function QuickFilterChips({
  active,
  onSelect,
}: QuickFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onSelect(filter.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === filter.value
              ? 'bg-slate-900 text-white shadow-lg'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
