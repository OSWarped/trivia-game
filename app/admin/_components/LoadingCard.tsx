import Card from "./Card";

interface LoadingCardProps {
  label: string;
}

export default function LoadingCard({ label }: LoadingCardProps) {
  return (
    <Card className="rounded-3xl p-6 text-slate-700">
      {label}
    </Card>
  );
}
