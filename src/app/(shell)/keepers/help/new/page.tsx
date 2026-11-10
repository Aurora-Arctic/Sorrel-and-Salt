import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { NewHelpArticleForm } from '../../../../../components/HelpArticleForm';
import { HelpArticlePage } from '../../../../../components/HelpArticleForm/page';
import BackLink from '../../../../../components/IngredientEntry/back-link';
import { requireAdminSession } from '../../../../../lib/request-session';
import { single } from '../../../../../lib/search-params';
import { helpFormReturn, readHelpFormChoices } from '../form-choices';

export const metadata: Metadata = pageTitle('Add Help Article');

// A new help row on a page of its own; `?parent=` (the outline's Add Sub Page) opens it under that guide.
export default async function NewHelpArticlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const [{ guides, candidates }, params] = await Promise.all([
    readHelpFormChoices(session),
    searchParams,
  ]);
  const preset = guides.find(({ id }) => id === single(params.parent));
  const returnHref = helpFormReturn('article', preset?.id);
  return (
    <HelpArticlePage back={<BackLink href={returnHref} label="Help" />}>
      <NewHelpArticleForm
        guides={guides}
        candidates={candidates}
        presetParentId={preset?.id}
        returnHref={returnHref}
      />
    </HelpArticlePage>
  );
}
