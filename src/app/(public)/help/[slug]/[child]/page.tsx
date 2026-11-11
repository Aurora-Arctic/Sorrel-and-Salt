import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpArticleMetadata, helpArticleProps } from '@/lib/help-article-props';
import { linkTo } from '@/lib/help-pages';
import { orNotFound } from '@/lib/or-not-found';
import { readHelpArticle } from '@/modules/help';

type Props = { params: Promise<{ slug: string; child: string }> };

// The sub page answers only beneath its own parent.
async function subPage(parent: string, slug: string) {
  const found = await orNotFound(() => readHelpArticle(slug));
  if (found.kind !== 'article' || found.audience !== 'public' || found.parentSlug !== parent) {
    notFound();
  }
  return found;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, child } = await params;
  const found = await subPage(slug, child);
  return helpArticleMetadata(found);
}

export default async function Page({ params }: Props) {
  const { slug, child } = await params;
  const found = await subPage(slug, child);
  // The parent is read for its title and its sub pages; the sub page answered, so the parent is a public article.
  const parent = await orNotFound(() => readHelpArticle(slug));
  return <HelpArticleView {...await helpArticleProps(found, parent)} parent={linkTo(parent)} />;
}
