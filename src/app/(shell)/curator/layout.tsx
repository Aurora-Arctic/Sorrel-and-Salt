import type { Metadata } from 'next';
import { CuratorNav } from '@/components/AdminNav';
import AdminAreaLayout from '@/app/(shell)/_admin/area-layout';
import { requireCuratorSession } from '@/lib/request-session';
import { titleTemplate } from '@/lib/site';
import type { AdminLayoutProps } from '@/app/(shell)/_admin/types';

// Each page under `/curator` gives its own name ('Celestial Bodies') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/curator` itself takes the `default`, which the root template finishes.
export const metadata: Metadata = {
  title: { template: titleTemplate('Curator'), default: 'Curator' },
};

// The curation guard, passed by a curator or a keeper. Every page calls a guard too, as a layout does not
// re-run on client navigation (claude-docs/auth/admin-guard.md, "The curator guard").
export default async function CuratorLayout({ children }: AdminLayoutProps) {
  await requireCuratorSession();

  return (
    <AdminAreaLayout name="Curator" href="/curator" nav={<CuratorNav />}>
      {children}
    </AdminAreaLayout>
  );
}
