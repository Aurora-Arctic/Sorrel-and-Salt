import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import HelpArticleForm from '../../../../../components/HelpArticleForm';
import { helpFormHeading } from '../../../../../components/HelpArticleForm/heading';
import BackLink from '../../../../../components/IngredientEntry/back-link';
import PageHeader from '../../../../../components/PageHeader';
import { NotFound } from '../../../../../lib/errors';
import { requireAdminSession } from '../../../../../lib/request-session';
import type { Session } from '../../../../../lib/session';
import { readKeeperHelpArticle } from '@/modules/help';
import { helpFormReturn, readHelpFormChoices } from '../form-choices';

const readArticle = cache(async (session: Session, id: string) => {
  try {
    return await readKeeperHelpArticle(session, id);
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
});

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
  const guideTitle = article.title;
  const returnHref = helpFormReturn(article.kind, article.parentId ?? article.id);
  return (
    <main>
      <div className="back-bar help-article-form__bar">
        <BackLink href={returnHref} label="Help" />
      </div>
      <PageHeader eyebrow={helpFormHeading(article.kind, true)} title={article.title} />
      <HelpArticleForm
        article={{
          id: article.id,
          kind: article.kind,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
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
    </main>
  );
}
