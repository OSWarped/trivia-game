import Link from 'next/link';

interface RecordTab {
  label: string;
  href: string;
}

interface RecordTabsProps {
  tabs: RecordTab[];
  currentPath: string;
}

export default function RecordTabs({ tabs, currentPath }: RecordTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-slate-900 text-white shadow-lg'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
