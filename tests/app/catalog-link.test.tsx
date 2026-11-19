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

  it('points rel="ard" at the ARD catalog beside it, as ARD consumers look for', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<CatalogLink />);

    // Precondition: the AI Catalog link is still drawn, so the ARD link stands beside it.
    expect(container.querySelector('link[rel="ai-catalog"]')).not.toBeNull();
    const links = container.querySelectorAll('link[rel="ard"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(siteUrl('/.well-known/ard.json'));
  });
});
