import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { guideSteps, linkTo } from '@/lib/help-pages';
import { orNotFound } from '@/lib/or-not-found';
import { helpPath, keeperHelpEditPath } from '@/lib/help-paths';
import { helpViewerOffers } from '@/lib/help-viewer';
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
  // The parent is read for its title and its sub pages, by the same reach, so a parent the reader may not open is a 404
  // and a sub page the reader may not open is not among the steps.
  const parent = await orNotFound(() => readStaffHelpArticle(session, slug));
  return (
    <HelpArticleView
      terms={await readGlossaryTerms()}
      heading="Staff Help"
      title={found.title}
      body={found.body}
      subpages={found.children.map(linkTo)}
      parent={linkTo(parent)}
      editHref={(await helpViewerOffers()).edit ? keeperHelpEditPath(found.id) : undefined}
      steps={guideSteps(linkTo(parent), parent.children.map(linkTo), helpPath(found))}
    />
  );
}
