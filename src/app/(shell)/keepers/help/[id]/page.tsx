import { orNotFound } from '@/lib/or-not-found';
import type { Metadata } from 'next';
import { cache } from 'react';
import HelpArticleForm from '@/components/HelpArticleForm';
import { helpFormHeading } from '@/components/HelpArticleForm/heading';
import HelpViewLink from '@/components/HelpArticleForm/view-link';
import { HelpArticlePage } from '@/components/HelpArticleForm/page';
import BackLink from '@/components/IngredientEntry/back-link';
import PageHeader from '@/components/PageHeader';
import { requireAdminSession } from '@/lib/request-session';
import type { Session } from '@/lib/session';
import { readKeeperHelpArticle } from '@/modules/help';
import { helpFormReturn, readHelpFormChoices } from '../form-choices';

const readArticle = cache((session: Session, id: string) =>
  orNotFound(() => readKeeperHelpArticle(session, id)),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await requireAdminSession();
  const article = await readArticle(session, (await params).id);
  return { title: `${helpFormHeading(article.kind, true)}: ${article.title}` };
}

// One help row on a page of its own, with its sub pages in order for a guide.
export default async function EditHelpArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  const { id } = await params;
  const [article, { guides, candidates }] = await Promise.all([
    readArticle(session, id),
    readHelpFormChoices(session),
  ]);
  // A sub page's address and whether it opens both hang on its guide.
  const parent = article.parentId ? await readArticle(session, article.parentId) : null;
  const guideTitle = article.title;
  const returnHref = helpFormReturn(article.kind, article.parentId ?? article.id);
  return (
    <HelpArticlePage back={<BackLink href={returnHref} label="Help" />}>
      <PageHeader
        eyebrow={helpFormHeading(article.kind, true)}
        title={article.title}
        action={<HelpViewLink article={article} parent={parent} />}
      />
      <HelpArticleForm
        article={{
          id: article.id,
          kind: article.kind,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          searchTerms: article.searchTerms,
          body: article.body,
          audience: article.audience,
          parentId: article.parentId,
          position: article.position,
          shown: article.shown,
          subPages: article.children.map((child) => ({
            id: child.id,
            title: child.title,
            audience: child.audience,
            parentId: article.id,
            parentTitle: guideTitle,
          })),
        }}
        guides={guides}
        candidates={candidates}
        returnHref={returnHref}
      />
    </HelpArticlePage>
  );
}
