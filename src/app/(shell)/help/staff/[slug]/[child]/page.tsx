import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { linkTo, orNotFound } from '@/lib/help-pages';
import { requireCuratorSession } from '@/lib/request-session';
import { readStaffHelpArticle } from '@/modules/help';

export const metadata: Metadata = { title: 'Staff Help', robots: { index: false } };

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; child: string }>;
}) {
  const session = await requireCuratorSession();
  const { slug, child } = await params;
  const found = await orNotFound(() => readStaffHelpArticle(session, child));
  if (found.kind !== 'article' || found.audience === 'public' || found.parentSlug !== slug) {
    notFound();
  }
  // The parent is read for its title alone, by the same reach, so a parent the reader may not open is a 404.
  const parent = await orNotFound(() => readStaffHelpArticle(session, slug));
  return (
    <HelpArticleView
      heading="Staff Help"
      title={found.title}
      body={found.body}
      subpages={found.children.map(linkTo)}
      parent={linkTo(parent)}
    />
  );
}
