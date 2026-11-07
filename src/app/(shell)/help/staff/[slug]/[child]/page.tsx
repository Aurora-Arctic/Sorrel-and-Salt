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
  return (
    <HelpArticleView
      heading="Staff Help"
      title={found.title}
      body={found.body}
      subpages={found.children.map(linkTo)}
    />
  );
}
