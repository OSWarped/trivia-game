import { redirect } from 'next/navigation';

interface SiteEventsRedirectProps {
  params: {
    siteId: string;
  };
}

export default function SiteEventsRedirect({ params }: SiteEventsRedirectProps) {
  redirect(`/admin/sites/${params.siteId}`);
}
