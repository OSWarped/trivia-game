import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="transition hover:text-slate-700">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-slate-700' : ''}>
                {item.label}
              </span>
            )}

            {!isLast ? <span>/</span> : null}
          </div>
        );
      })}
    </nav>
  );
}
