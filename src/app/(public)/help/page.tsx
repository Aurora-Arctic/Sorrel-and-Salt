import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import HelpIndex from '@/components/HelpIndex';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { keeperHelpViewPath } from '@/lib/help-paths';
import { HELP_QUICK_LINKS, quickLinks } from '@/lib/help-quick-links';
import { helpViewerOffers } from '@/lib/help-viewer';
import { readHelpArticle, readHelpArticleIndex, readHelpFaq } from '@/modules/help';

export const metadata: Metadata = publicPageMetadata(
  'Help',
  'Guides, answers to common questions and a glossary for Sorrel & Salt.',
  '/help',
);

const PAGE = { limit: HELP_PAGE_LIMIT, inverted: false };

export default async function Page() {
  const [faq, articles, terms, quick, offers] = await Promise.all([
    readHelpFaq(PAGE),
    readHelpArticleIndex(PAGE),
    readGlossaryTerms(),
    quickLinks(HELP_QUICK_LINKS, readHelpArticle),
    helpViewerOffers(),
  ]);
  return (
    <HelpIndex
      faq={faq.map(({ node }) => node)}
      quickLinks={quick}
      articles={articles.map(({ node }) => linkTo(node))}
      terms={terms}
      faqEditHref={offers.edit ? keeperHelpViewPath('faq') : undefined}
    />
  );
}
