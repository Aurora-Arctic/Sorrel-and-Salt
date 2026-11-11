import type { Metadata, Route } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import { notFound, permanentRedirect } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpArticleProps } from '@/lib/help-article-props';
import { helpPath } from '@/lib/help-paths';
import { orNotFound } from '@/lib/or-not-found';
import { requireCuratorSession } from '@/lib/request-session';
import { readStaffHelpArticle } from '@/modules/help';

export const metadata: Metadata = noIndexMetadata('Staff Help');

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireCuratorSession();
  const { slug } = await params;
  const found = await orNotFound(() => readStaffHelpArticle(session, slug));
  // A public row lives under /help; a question or a term has no page of its own.
  if ((found.kind !== 'article' && found.kind !== 'guide') || found.audience === 'public') {
    notFound();
  }
  if (found.parentSlug) permanentRedirect(helpPath(found) as Route);
  return (
    <HelpArticleView
      heading="Staff Help"
      {...await helpArticleProps(found)}
      parent={{ title: 'Staff Help', href: '/help/staff' }}
    />
  );
}
