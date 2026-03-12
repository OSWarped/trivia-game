import { redirect } from 'next/navigation';

export default function EventSeasonCreationRedirect() {
  redirect('/admin/events');
}
