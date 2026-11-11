import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import { notFound } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpArticleProps } from '@/lib/help-article-props';
import { linkTo } from '@/lib/help-pages';
import { orNotFound } from '@/lib/or-not-found';
import { requireCuratorSession } from '@/lib/request-session';
import { readStaffHelpArticle } from '@/modules/help';

export const metadata: Metadata = noIndexMetadata('Staff Help');

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
  // The parent is read for its title and its sub pages, by the same reach, so a parent the reader may not open is a 404
  // and a sub page the reader may not open is not among the steps.
  const parent = await orNotFound(() => readStaffHelpArticle(session, slug));
  return (
    <HelpArticleView
      heading="Staff Help"
      {...await helpArticleProps(found, parent)}
      parent={linkTo(parent)}
    />
  );
}
