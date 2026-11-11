import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpArticleMetadata, helpArticleProps } from '@/lib/help-article-props';
import { helpPath } from '@/lib/help-paths';
import { orNotFound } from '@/lib/or-not-found';
import { readHelpArticle } from '@/modules/help';

type Props = { params: Promise<{ slug: string }> };

// A page for a top-level public article or guide only: a sub page has one address, under its parent's.
async function topLevel(slug: string) {
  const found = await orNotFound(() => readHelpArticle(slug));
  if ((found.kind !== 'article' && found.kind !== 'guide') || found.audience !== 'public') {
    notFound();
  }
  if (found.parentSlug) permanentRedirect(helpPath(found) as Route);
  return found;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await topLevel(slug);
  return helpArticleMetadata(found);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const found = await topLevel(slug);
  return (
    <HelpArticleView
      framed
      {...await helpArticleProps(found)}
      parent={{ title: 'Help', href: '/help' }}
    />
  );
}
