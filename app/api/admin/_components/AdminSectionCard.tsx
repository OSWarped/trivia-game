interface AdminSectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminSectionCard({
  title,
  description,
  children,
}: AdminSectionCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
