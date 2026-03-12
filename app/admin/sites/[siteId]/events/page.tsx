import { redirect } from 'next/navigation';

type SiteEventsRedirectProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteEventsRedirect({
  params,
}: SiteEventsRedirectProps) {
  const { siteId } = await params;

  redirect(`/admin/sites/${siteId}`);
}
