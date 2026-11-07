import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import HelpArticleView from '@/components/HelpArticleView';
import { helpPath } from '@/lib/help-paths';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { guideSteps, linkTo, orNotFound } from '@/lib/help-pages';
import { siteUrl } from '@/lib/site';
import { readHelpArticle } from '@/modules/help';

type Props = { params: Promise<{ slug: string }> };

// A page for a top-level public article only: a sub page has one address, under its parent's.
async function topLevel(slug: string) {
  const found = await orNotFound(() => readHelpArticle(slug));
  if (found.kind !== 'article' || found.audience !== 'public') notFound();
  if (found.parentSlug) permanentRedirect(helpPath(found) as Route);
  return found;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await topLevel(slug);
  return {
    title: found.title,
    description: linkTo(found).summary ?? undefined,
    alternates: { canonical: siteUrl(helpPath(found)) },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const found = await topLevel(slug);
  return (
    <HelpArticleView
      terms={await readGlossaryTerms()}
      title={found.title}
      body={found.body}
      subpages={found.children.map(linkTo)}
      steps={guideSteps(linkTo(found), found.children.map(linkTo), helpPath(found))}
    />
  );
}
