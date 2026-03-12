import { getStatusBadgeClasses } from '../_lib/utils';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}
