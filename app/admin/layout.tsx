import type { ReactNode } from 'react';
import AdminFrame from './_components/AdminFrame';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminFrame>{children}</AdminFrame>;
}
