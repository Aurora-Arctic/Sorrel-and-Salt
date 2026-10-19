import { pageTitleOf } from '../components/IngredientEntry/page-title';
import { SITE_NAME, siteUrl } from '../lib/site';
import type { CompendiumSlugEntry } from '@/modules/ingredients';

// The two public files that describe the compendium to a crawler or an AI
// agent: `/llms.txt`, and the catalog served at `/.well-known/ai-catalog.json`
// and `/.well-known/ard.json`. They list the one public surface (MB.80) and
// nothing else; every URL is built on `siteUrl`, never on the request's host.
// The specs, their versions and the field choices are in
// claude-docs/seo/ai-discovery.md.

/** The public compendium's own summary, shared by both files. */
const SUMMARY =
  'A public reference of the ingredients used in spellwork, each entry with its sources.';

/**
 * llms.txt text: the layout is https://llmstxt.org/ — an H1 with the site
 * name, a blockquote summary, then H2 sections of `- [name](url): notes`
 * lists, with `## Optional` for what a reader may skip. No heading is allowed
 * between the summary and the first H2, so the prose stays heading-free.
 */
export function buildLlmsTxt(entries: readonly CompendiumSlugEntry[]): string {
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
        `- [${linkText(pageTitleOf(entry))}](${siteUrl(`/compendium/ingredients/${entry.slug}`)})`,
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

/** The catalog's media type: the AI Catalog draft's SHOULD; ARD names none for `ard.json`. */
export const CATALOG_MEDIA_TYPE = 'application/ai-catalog+json';

/** The catalog body for both well-known paths. */
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
    updatedAt?: string;
  }[];
};

/**
 * One body that meets two specs at once: the AI Catalog draft needs
 * `specVersion`, `entries` and, per entry, `identifier`, `type` and one of
 * `url`/`data`; ARD v0.91 needs `identifier`, `displayName`, `type` and one of
 * `url`/`data` per entry. The entry is the compendium's HTML page, so its
 * `type` is `text/html`. `updatedAt` is the latest real change among the
 * entries, and is left out when there are none.
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
        ...(latest && { updatedAt: latest.toISOString() }),
      },
    ],
  };
}
