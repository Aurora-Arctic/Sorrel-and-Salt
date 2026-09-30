import type { Metadata } from 'next';
import { requireAdminSession } from '../../lib/request-session';

export const metadata: Metadata = {
  title: 'Admin — Sorrel & Salt',
};

export default async function AdminPage() {
  await requireAdminSession();

  return (
    <main>
      <h1>Admin</h1>
      <p>
        The shared reference every coven reads from: the compendium, its categories, and the
        vocabularies of forms, planets and zodiac signs.
      </p>
    </main>
  );
}
