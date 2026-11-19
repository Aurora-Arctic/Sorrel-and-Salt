import { describe, expect, it, vi } from 'vitest';
import { siteUrl } from '@/lib/site';

// The sitemap and llms.txt list the public documents from one shared list. The list is replaced here by an invented
// one, so a document either file names on its own, not from the list, shows as a difference.
vi.mock('@/lib/public-documents', () => ({
  PUBLIC_DOCUMENTS: [
    { path: '/testwort-charter', title: 'Testwort Charter' },
    { path: '/fixture-pledge', title: 'Fixture Pledge' },
  ],
}));
vi.mock('@/modules/ingredients', () => ({ listCompendiumSlugs: vi.fn(async () => []) }));
vi.mock('@/modules/help', () => ({
  listHelpArticlePaths: vi.fn(async () => []),
  listHelpArticleLinks: vi.fn(async () => []),
}));

const { default: sitemap } = await import('@/app/sitemap');
const { GET: llms } = await import('@/app/llms.txt/route');

const DOCUMENTS = ['/testwort-charter', '/fixture-pledge'].map((path) => siteUrl(path));
// The pages either file lists that are not documents.
const NOT_DOCUMENTS = /^https:\/\/[^/]+\/(|compendium(\/.*)?|help(\/.*)?|sitemap\.xml)$/;

describe('the documents the sitemap and llms.txt list', () => {
  it('are the shared list’s, in the sitemap', async () => {
    const urls = (await sitemap()).map((page) => page.url);

    expect(urls.filter((url) => !NOT_DOCUMENTS.test(url))).toEqual(DOCUMENTS);
  });

  it('are the shared list’s, in llms.txt, named by its titles', async () => {
    const body = await (await llms()).text();
    const links = [...body.matchAll(/^- \[([^\]]+)\]\((\S+?)\)/gm)].map(([, text, url]) => ({
      text,
      url,
    }));

    expect(links.filter(({ url }) => !NOT_DOCUMENTS.test(url))).toEqual([
      { text: 'Testwort Charter', url: siteUrl('/testwort-charter') },
      { text: 'Fixture Pledge', url: siteUrl('/fixture-pledge') },
    ]);
  });

  it('leave no real document in either file once the shared list is replaced', async () => {
    const sitemapUrls = (await sitemap()).map((page) => page.url);
    const body = await (await llms()).text();

    for (const path of ['/privacy', '/disclaimer', '/about', '/terms', '/code-of-ethics']) {
      expect(sitemapUrls).not.toContain(siteUrl(path));
      expect(body).not.toContain(`(${siteUrl(path)})`);
    }
  });
});
