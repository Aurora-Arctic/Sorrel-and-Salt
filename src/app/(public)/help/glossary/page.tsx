import type { Metadata } from 'next';
import HelpGlossary from '@/components/HelpGlossary';
import { HELP_PAGE_LIMIT } from '@/lib/help-pages';
import { siteUrl } from '@/lib/site';
import { readHelpGlossary } from '@/modules/help';

export const metadata: Metadata = {
  title: 'Glossary',
  description: 'The words Sorrel & Salt uses, and what each one means.',
  alternates: { canonical: siteUrl('/help/glossary') },
};

export default async function Page() {
  const terms = await readHelpGlossary({ limit: HELP_PAGE_LIMIT, inverted: false });
  return <HelpGlossary terms={terms.map(({ node }) => node)} />;
}
