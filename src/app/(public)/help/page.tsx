import type { Metadata } from 'next';
import HelpIndex from '@/components/HelpIndex';
import { HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { siteUrl } from '@/lib/site';
import { readHelpArticleIndex, readHelpFaq } from '@/modules/help';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Guides, answers to common questions and a glossary for Sorrel & Salt.',
  alternates: { canonical: siteUrl('/help') },
};

const PAGE = { limit: HELP_PAGE_LIMIT, inverted: false };

export default async function Page() {
  const [faq, articles] = await Promise.all([readHelpFaq(PAGE), readHelpArticleIndex(PAGE)]);
  return (
    <HelpIndex
      faq={faq.map(({ node }) => node)}
      articles={articles.map(({ node }) => linkTo(node))}
    />
  );
}
