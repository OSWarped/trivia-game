import type { ReactNode } from 'react';
import AdminFrame from './_components/AdminFrame';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-theme">
      <AdminFrame>{children}</AdminFrame>
    </div>
  );
}
