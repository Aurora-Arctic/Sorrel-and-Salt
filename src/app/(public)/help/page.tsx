import type { Metadata } from 'next';
import HelpIndex from '@/components/HelpIndex';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { HELP_LEDE, HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { HELP_QUICK_LINKS, quickLinks } from '@/lib/help-quick-links';
import { helpViewerOffers } from '@/lib/help-viewer';
import { siteUrl } from '@/lib/site';
import { readHelpArticle, readHelpArticleIndex, readHelpFaq } from '@/modules/help';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Guides, answers to common questions and a glossary for Sorrel & Salt.',
  alternates: { canonical: siteUrl('/help') },
};

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
      lede={HELP_LEDE}
      quickLinks={quick}
      articles={articles.map(({ node }) => linkTo(node))}
      terms={terms}
      staffHelp={offers.staffHelp}
    />
  );
}
