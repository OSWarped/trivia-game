import Link from 'next/link';

interface ActionLink {
  label: string;
  href: string;
  tone?: 'primary' | 'secondary';
}

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ActionLink[];
}

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions = [],
}: AdminPageHeaderProps) {
  return (
    <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow ? (
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
          ) : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  action.tone === 'primary'
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
