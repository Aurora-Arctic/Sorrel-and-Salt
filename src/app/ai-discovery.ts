import { pageTitleOf } from '@/components/IngredientEntry/page-title';
import { describe } from '@/lib/page-metadata';
import { PUBLIC_DOCUMENTS } from '@/lib/public-documents';
import { SITE_NAME, siteUrl } from '@/lib/site';
import type { HelpArticleLink } from '@/modules/help';
import type { CompendiumSlugEntry } from '@/modules/ingredients';
import { compendiumEntryPath } from '@/lib/compendium-path';

// The two public files that describe the compendium to a crawler or AI agent: `/llms.txt` and the
// catalog at `/.well-known/ai-catalog.json` and `/.well-known/ard.json`. Every URL is built on
// `siteUrl`, never the request's host (claude-docs/seo/ai-discovery.md).

const SUMMARY =
  'A public reference of the ingredients used in spellwork, each entry with its sources.';

/**
 * llms.txt text, in the https://llmstxt.org/ layout: an H1, a blockquote summary, then H2 sections
 * of `- [name](url): notes`. No heading may sit between the summary and the first H2.
 */
export function buildLlmsTxt(
  entries: readonly CompendiumSlugEntry[],
  help: readonly HelpArticleLink[],
): string {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SUMMARY}`,
    '',
    'Every page below is public and readable without an account.',
    '',
    '## Compendium',
    '',
    `- [Compendium](${siteUrl('/compendium')}): every ingredient in the reference, searchable and filterable`,
    ...entries.map(
      (entry) =>
        `- [${linkText(pageTitleOf(entry))}](${siteUrl(compendiumEntryPath(entry.slug))})${note(entry.description)}`,
    ),
    '',
    '## Documents',
    '',
    ...PUBLIC_DOCUMENTS.map(({ path, title }) => `- [${linkText(title)}](${siteUrl(path)})`),
    '',
    '## Help',
    '',
    `- [Help](${siteUrl('/help')}): guides and articles on using the site`,
    `- [Glossary](${siteUrl('/help/glossary')}): the terms the site uses`,
    ...help.map(
      ({ path, title, summary }) => `- [${linkText(title)}](${siteUrl(path)})${note(summary)}`,
    ),
    '',
    '## Optional',
    '',
    `- [Sitemap](${siteUrl('/sitemap.xml')}): the same pages in the sitemap format`,
    '',
  ];
  return lines.join('\n');
}

// A bracket in a name would end the link text early.
const linkText = (text: string) => text.replace(/[[\]\\]/g, (char) => `\\${char}`);

function note(description: string | null): string {
  const text = description ? describe(description) : '';
  return text ? `: ${linkText(text)}` : '';
}

/** The catalog's media type: the AI Catalog draft's SHOULD; ARD names none for `ard.json`. */
export const CATALOG_MEDIA_TYPE = 'application/ai-catalog+json';

export type AiCatalog = {
  specVersion: string;
  host: { displayName: string };
  entries: {
    identifier: string;
    displayName: string;
    description: string;
    type: string;
    url: string;
    tags: string[];
    representativeQueries?: string[];
    updatedAt?: string;
  }[];
};

/**
 * One body for two specs: the AI Catalog draft needs `specVersion` and per-entry `identifier`,
 * `type` and `url`/`data`; ARD v0.91 also needs `displayName`. `updatedAt` is left out with no entries.
 */
export function buildAiCatalog(entries: readonly CompendiumSlugEntry[]): AiCatalog {
  const latest = entries.reduce<Date | null>(
    (best, entry) => (best === null || entry.lastModified > best ? entry.lastModified : best),
    null,
  );
  return {
    specVersion: '1.0',
    host: { displayName: SITE_NAME },
    entries: [
      {
        identifier: 'urn:air:sorrelandsalt.com:compendium:ingredients',
        displayName: `${SITE_NAME} Compendium`,
        description: SUMMARY,
        type: 'text/html',
        url: siteUrl('/compendium'),
        tags: ['ingredients', 'reference'],
        representativeQueries: [
          'What is mugwort used for in spellwork?',
          'Which herbs are associated with the moon?',
          'Is this ingredient poisonous?',
          'What can I use in place of rosemary?',
        ],
        ...(latest && { updatedAt: latest.toISOString() }),
      },
    ],
  };
}
