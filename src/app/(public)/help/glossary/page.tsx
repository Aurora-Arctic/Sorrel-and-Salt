import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import HelpGlossary from '@/components/HelpGlossary';
import { HELP_PAGE_LIMIT } from '@/lib/help-pages';
import { keeperHelpViewPath } from '@/lib/help-paths';
import { helpViewerOffers } from '@/lib/help-viewer';
import { readHelpGlossary } from '@/modules/help';

export const metadata: Metadata = publicPageMetadata(
  'Glossary',
  'The words Sorrel & Salt uses, and what each one means.',
  '/help/glossary',
);

export default async function Page() {
  const terms = await readHelpGlossary({ limit: HELP_PAGE_LIMIT, inverted: false });
  return (
    <HelpGlossary
      terms={terms.map(({ node }) => node)}
      editHref={(await helpViewerOffers()).edit ? keeperHelpViewPath('glossary') : undefined}
    />
  );
}
