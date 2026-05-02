import Card from "./Card";

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
    <Card className="rounded-3xl p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
