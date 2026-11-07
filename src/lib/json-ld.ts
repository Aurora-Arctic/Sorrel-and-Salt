// The structured data a public page carries, as the text of a `<script type="application/ld+json">`. One serialiser, so the escape is made once: a `<` in an
// entry's name ("</script>") would end the element early, and the escape is the same character to JSON and not a tag to HTML.

import { SITE_NAME, siteUrl } from './site';

export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
}

const COMPENDIUM_URL = siteUrl('/compendium');

const TERM_SET = { '@type': 'DefinedTermSet', name: 'Compendium', url: COMPENDIUM_URL };

/** Other names go in `alternateName`; the entry's sources are left out (claude-docs/design-decisions/mb.84-page-metadata.md). */
export function entryJsonLd(entry: {
  name: string;
  canonicalName: string | null;
  slug: string;
  description: string | null;
  folkNames: readonly string[];
}): string {
  const url = siteUrl(`/compendium/ingredients/${entry.slug}`);
  const others = [entry.canonicalName, ...entry.folkNames].filter(
    (other): other is string => !!other && other.toLowerCase() !== entry.name.toLowerCase(),
  );
  return jsonLdGraph([
    {
      '@type': 'DefinedTerm',
      name: entry.name,
      url,
      ...(others.length > 0 && { alternateName: others }),
      ...(entry.description?.trim() && { description: entry.description.trim() }),
      inDefinedTermSet: TERM_SET,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Compendium', item: COMPENDIUM_URL },
        { '@type': 'ListItem', position: 2, name: entry.name, item: url },
      ],
    },
  ]);
}

/** Only the home page, with `name` and `url` required. No `alternateName`: nothing sourced gives the site another name. */
export function websiteJsonLd(): string {
  return jsonLd({ '@type': 'WebSite', name: SITE_NAME, url: siteUrl('/') });
}

export function listJsonLd(): string {
  return jsonLd({
    '@type': 'CollectionPage',
    name: 'Compendium',
    url: COMPENDIUM_URL,
    mainEntity: TERM_SET,
  });
}

function jsonLdGraph(graph: Record<string, unknown>[]): string {
  return jsonLd({ '@graph': graph });
}
