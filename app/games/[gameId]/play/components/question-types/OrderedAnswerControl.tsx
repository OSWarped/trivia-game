'use client';

import { useCallback, useMemo } from 'react';
import OrderedQuestion from '../SortableList';

interface OrderedOption {
  id: string;
  text: string;
}

interface OrderedAnswerControlProps {
  questionKey?: string;
  options: OrderedOption[];
  onChange: (value: string[]) => void;
}

function isOrderedOption(value: unknown): value is OrderedOption {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.text === 'string'
  );
}

export default function OrderedAnswerControl({
  questionKey,
  options,
  onChange,
}: OrderedAnswerControlProps) {
  const safeOptions = useMemo(
    () => options.filter(isOrderedOption),
    [options]
  );

  const handleOrderChange = useCallback(
    (newOrder: OrderedOption[]) => {
      onChange(newOrder.map((o) => o.text));
    },
    [onChange]
  );

  if (!safeOptions.length) return null;

  return (
    <OrderedQuestion
      key={questionKey}
      options={safeOptions}
      onChange={handleOrderChange}
    />
  );
}