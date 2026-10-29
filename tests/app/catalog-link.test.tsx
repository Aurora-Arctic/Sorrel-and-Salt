import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CatalogLink from '@/app/catalog-link';
import { siteUrl } from '@/lib/site';

// The AI Catalog draft's "Link Relation Discovery": a page MAY point at its catalog from the head, and an agent that finds no `Link` header reads this (https://ai-catalog.io/spec/).
// The catalog route is served from the same path (claude-docs/seo/ai-discovery.md).

describe('CatalogLink', () => {
  it('points rel="ai-catalog" at the catalog, with the catalog media type', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<CatalogLink />);

    const link = container.querySelector('link[rel="ai-catalog"]');
    expect(link?.getAttribute('href')).toBe(siteUrl('/.well-known/ai-catalog.json'));
    expect(link?.getAttribute('type')).toBe('application/ai-catalog+json');
  });
});
