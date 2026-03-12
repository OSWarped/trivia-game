interface LoadingCardProps {
  label: string;
}

export default function LoadingCard({ label }: LoadingCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/80 p-6 text-slate-700 shadow-xl backdrop-blur-sm">
      {label}
    </div>
  );
}
