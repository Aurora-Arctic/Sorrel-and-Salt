import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpPath } from '@/lib/help-paths';
import { linkTo, orNotFound } from '@/lib/help-pages';
import { requireCuratorSession } from '@/lib/request-session';
import { readStaffHelpArticle } from '@/modules/help';

export const metadata: Metadata = { title: 'Staff Help', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireCuratorSession();
  const { slug } = await params;
  const found = await orNotFound(() => readStaffHelpArticle(session, slug));
  // A public row lives under /help; a question or a term has no page of its own.
  if (found.kind !== 'article' || found.audience === 'public') notFound();
  if (found.parentSlug) permanentRedirect(helpPath(found));
  return (
    <HelpArticleView title={found.title} body={found.body} subpages={found.children.map(linkTo)} />
  );
}
