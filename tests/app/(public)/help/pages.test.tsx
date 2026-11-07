import { render, screen, within } from '@testing-library/react';
import type { Metadata } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { hrefs } from '../../../support/links';

// The public help pages read the public finders, which take no session, filter `audience = 'public'` in SQL and are
// cached (tests/modules/help/services/help-reads.test.ts). Search alone reads the session, since its results follow
// the reader's audience. A sub page has one address, under its parent's: asked for at /help/[slug] it answers 308,
// and asked for under another parent it is a 404 (DESIGN.md §10; support.md, "The parent article").

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const permanentRedirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT 308 ${to}`);
});
vi.mock('next/navigation', () => ({
  notFound,
  permanentRedirect,
  redirect: vi.fn(),
  usePathname: () => '/help',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock('@/lib/request-session', () => ({ getSession }));

const readHelpFaq = vi.fn();
const readHelpArticleIndex = vi.fn();
const readHelpGlossary = vi.fn();
const readHelpArticle = vi.fn();
const searchHelp = vi.fn();
vi.mock('@/modules/help', () => ({
  readHelpFaq,
  readHelpArticleIndex,
  readHelpGlossary,
  readHelpArticle,
  searchHelp,
}));

type Kind = 'faq' | 'article' | 'term';
type Audience = 'public' | 'staff' | 'keeper';

let next = 0;
function row(
  slug: string,
  {
    kind = 'article',
    audience = 'public',
    parentSlug = null,
    summary = null,
    body = 'A fixture body.',
  }: {
    kind?: Kind;
    audience?: Audience;
    parentSlug?: string | null;
    summary?: string | null;
    body?: string;
  } = {},
) {
  next += 1;
  const title = slug
    .split('-')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
  return {
    id: `00000000-0000-4000-8000-${String(next).padStart(12, '0')}`,
    kind,
    audience,
    title,
    slug,
    summary,
    body,
    position: kind === 'term' ? null : next,
    parentId: parentSlug ? `parent-of-${slug}` : null,
    parentSlug,
  };
}

const entries = <T,>(nodes: T[]) => nodes.map((node, i) => ({ node, cursor: `c${i}` }));

const SITE = 'https://sorrelandsalt.com';
const CURATOR: Session = {
  userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  role: 'curator',
} as Session;

type Mod = { default: (props?: unknown) => Promise<unknown> } & {
  metadata?: Metadata;
  generateMetadata?: (props: unknown) => Promise<Metadata>;
};

async function metadataOf(mod: Mod, props?: unknown): Promise<Metadata> {
  if (mod.generateMetadata) return mod.generateMetadata(props);
  expect(mod.metadata, 'the page exports metadata or generateMetadata').toBeDefined();
  return mod.metadata!;
}

const article = (slug: string) => ({ params: Promise.resolve({ slug }) });
const child = (slug: string, childSlug: string) => ({
  params: Promise.resolve({ slug, child: childSlug }),
});
const search = (q?: string | string[]) => ({
  searchParams: Promise.resolve(q === undefined ? {} : { q }),
});

const linkHrefs = () => hrefs(screen.queryAllByRole('link'));

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
});

describe('/help', () => {
  const load = async () => (await import('@/app/(public)/help/page')) as unknown as Mod;

  it('draws the FAQ and the article index from the public finders, with the search box', async () => {
    const faq = [
      row('testwort-question-one', { kind: 'faq' }),
      row('testwort-question-two', { kind: 'faq' }),
    ];
    const index = [row('testwort-getting-started'), row('testwort-your-coven')];
    readHelpFaq.mockResolvedValue(entries(faq));
    readHelpArticleIndex.mockResolvedValue(entries(index));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement);

    expect(readHelpFaq).toHaveBeenCalledWith(
      expect.objectContaining({ limit: expect.any(Number) }),
    );
    expect(readHelpArticleIndex).toHaveBeenCalledWith(
      expect.objectContaining({ limit: expect.any(Number) }),
    );
    for (const entry of faq) expect(document.getElementById(entry.slug), entry.slug).not.toBeNull();
    expect(linkHrefs()).toEqual(
      expect.arrayContaining(['/help/testwort-getting-started', '/help/testwort-your-coven']),
    );
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveAttribute('name', 'q');
    // The public reads take no session.
    expect(getSession).not.toHaveBeenCalled();
  });

  it('has a title, a description and its canonical address, and is indexable', async () => {
    const meta = await metadataOf(await load());

    expect(meta.title).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe(`${SITE}/help`);
    expect(meta.robots).toBeUndefined();
  });
});

describe('/help/glossary', () => {
  const load = async () => (await import('@/app/(public)/help/glossary/page')) as unknown as Mod;

  it('draws every term the public finder returns, each anchored by its slug, with the search box', async () => {
    const terms = [
      row('ashgrove', { kind: 'term' }),
      row('observer', { kind: 'term' }),
      row('steward', { kind: 'term' }),
    ];
    readHelpGlossary.mockResolvedValue(entries(terms));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement);

    expect(readHelpGlossary).toHaveBeenCalled();
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Ashgrove',
      'Observer',
      'Steward',
    ]);
    for (const term of terms) expect(document.getElementById(term.slug), term.slug).not.toBeNull();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('has a title, a description and its canonical address', async () => {
    const meta = await metadataOf(await load());

    expect(meta.title).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe(`${SITE}/help/glossary`);
    expect(meta.robots).toBeUndefined();
  });
});

describe('/help/[slug]', () => {
  const load = async () => (await import('@/app/(public)/help/[slug]/page')) as unknown as Mod;

  it('draws a top-level public article with its public sub pages, each linked under it', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-guide', { body: '## Testwort Section\n\nThe guide body.' }),
      children: [
        row('testwort-signing-in', { parentSlug: 'testwort-guide' }),
        row('testwort-demo-coven', { parentSlug: 'testwort-guide' }),
      ],
    });
    const { default: Page } = await load();

    render((await Page(article('testwort-guide'))) as React.ReactElement);

    expect(readHelpArticle).toHaveBeenCalledWith('testwort-guide');
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Testwort Guide' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Testwort Section' })).toBeInTheDocument();
    expect(linkHrefs()).toEqual(
      expect.arrayContaining([
        '/help/testwort-guide/testwort-signing-in',
        '/help/testwort-guide/testwort-demo-coven',
      ]),
    );
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('answers a sub page asked for at its own slug with a 308 to its nested address', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-signing-in', { parentSlug: 'testwort-guide' }),
      children: [],
    });
    const { default: Page } = await load();

    await expect(Page(article('testwort-signing-in'))).rejects.toThrow('NEXT_REDIRECT');

    expect(permanentRedirect).toHaveBeenCalledWith('/help/testwort-guide/testwort-signing-in');
    expect(notFound).not.toHaveBeenCalled();
  });

  // A staff, keeper, deleted or missing row is not found by the public finder; the page turns that into the 404.
  it('is a 404 for a slug the public finder does not find', async () => {
    readHelpArticle.mockRejectedValue(new NotFound('Help article not found'));
    const { default: Page } = await load();

    await expect(Page(article('testwort-staff-guide'))).rejects.toThrow('NEXT_NOT_FOUND');

    expect(readHelpArticle).toHaveBeenCalledWith('testwort-staff-guide');
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  // The public finder answers by slug for every kind; only an article has a page of its own.
  it.each(['faq', 'term'] as const)(
    'is a 404 for a %s, which has no page of its own',
    async (kind) => {
      readHelpArticle.mockResolvedValue({ ...row('testwort-entry', { kind }), children: [] });
      const { default: Page } = await load();

      await expect(Page(article('testwort-entry'))).rejects.toThrow('NEXT_NOT_FOUND');
    },
  );

  // Belt and braces: should the finder ever answer a narrower row, the public page still refuses it.
  it.each(['staff', 'keeper'] as const)('is a 404 for a %s row handed to it', async (audience) => {
    readHelpArticle.mockResolvedValue({ ...row('testwort-narrow', { audience }), children: [] });
    const { default: Page } = await load();

    await expect(Page(article('testwort-narrow'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('has the article title, its summary as description and its canonical address', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-guide', { summary: 'How the fixture guide reads.' }),
      children: [],
    });

    const meta = await metadataOf(await load(), article('testwort-guide'));

    expect(meta.title).toBe('Testwort Guide');
    expect(meta.description).toBe('How the fixture guide reads.');
    expect(meta.alternates?.canonical).toBe(`${SITE}/help/testwort-guide`);
  });
});

describe('/help/[slug]/[child]', () => {
  const load = async () =>
    (await import('@/app/(public)/help/[slug]/[child]/page')) as unknown as Mod;

  it('draws a public sub page under its own parent', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-signing-in', { parentSlug: 'testwort-guide' }),
      children: [],
    });
    const { default: Page } = await load();

    render((await Page(child('testwort-guide', 'testwort-signing-in'))) as React.ReactElement);

    expect(readHelpArticle).toHaveBeenCalledWith('testwort-signing-in');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Testwort Signing In' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('is a 404 for a sub page asked for under another parent', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-signing-in', { parentSlug: 'testwort-guide' }),
      children: [],
    });
    const { default: Page } = await load();

    await expect(Page(child('testwort-your-coven', 'testwort-signing-in'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('is a 404 for a top-level article asked for as a sub page', async () => {
    readHelpArticle.mockResolvedValue({ ...row('testwort-your-coven'), children: [] });
    const { default: Page } = await load();

    await expect(Page(child('testwort-guide', 'testwort-your-coven'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('is a 404 for a slug the public finder does not find', async () => {
    readHelpArticle.mockRejectedValue(new NotFound('Help article not found'));
    const { default: Page } = await load();

    await expect(Page(child('testwort-guide', 'testwort-gone'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is a 404 for a staff sub page handed to it', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-staff-page', { audience: 'staff', parentSlug: 'testwort-guide' }),
      children: [],
    });
    const { default: Page } = await load();

    await expect(Page(child('testwort-guide', 'testwort-staff-page'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('has the sub page title, its summary and its nested canonical address', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-signing-in', {
        parentSlug: 'testwort-guide',
        summary: 'How a fixture signs in.',
      }),
      children: [],
    });

    const meta = await metadataOf(await load(), child('testwort-guide', 'testwort-signing-in'));

    expect(meta.title).toBe('Testwort Signing In');
    expect(meta.description).toBe('How a fixture signs in.');
    expect(meta.alternates?.canonical).toBe(`${SITE}/help/testwort-guide/testwort-signing-in`);
  });
});

describe('/help/search', () => {
  const load = async () => (await import('@/app/(public)/help/search/page')) as unknown as Mod;

  it('searches as a signed-out reader and links each result to its address, a term to its glossary anchor', async () => {
    searchHelp.mockResolvedValue(
      [
        row('testwort-stock-levels', { parentSlug: 'testwort-ingredients' }),
        row('stock', { kind: 'term' }),
        row('where-is-my-stock', { kind: 'faq' }),
        row('testwort-ingredients'),
      ].map((node, i) => ({ node, cursor: `c${i}`, score: 1 - i / 10 })),
    );
    const { default: Page } = await load();

    render((await Page(search('stock'))) as React.ReactElement);

    expect(searchHelp).toHaveBeenCalledWith(
      null,
      'stock',
      expect.objectContaining({ limit: expect.any(Number) }),
    );
    const results = [
      '/help/testwort-ingredients/testwort-stock-levels',
      '/help/glossary#stock',
      '/help#where-is-my-stock',
      '/help/testwort-ingredients',
    ];
    expect(linkHrefs().filter((href) => results.includes(href!))).toEqual(results);
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue('stock');
  });

  it("searches as the signed-in reader, so a curator's results carry staff rows at their staff address", async () => {
    getSession.mockResolvedValue(CURATOR);
    searchHelp.mockResolvedValue(
      [row('testwort-vocabularies', { audience: 'staff' })].map((node) => ({
        node,
        cursor: 'c0',
        score: 1,
      })),
    );
    const { default: Page } = await load();

    render((await Page(search('vocabularies'))) as React.ReactElement);

    expect(searchHelp).toHaveBeenCalledWith(CURATOR, 'vocabularies', expect.anything());
    expect(linkHrefs()).toContain('/help/staff/testwort-vocabularies');
  });

  it.each([
    ['no q at all', undefined],
    ['an empty q', ''],
    ['a q of spaces', '   '],
  ])('shows no results for %s', async (_, q) => {
    searchHelp.mockResolvedValue([]);
    const { default: Page } = await load();

    render((await Page(search(q))) as React.ReactElement);

    // The service returns nothing for a blank query; the page draws no list either way.
    expect(screen.queryByRole('list')).toBeNull();
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toBeInTheDocument();
  });

  it('reads the first q when the address repeats it', async () => {
    searchHelp.mockResolvedValue([]);
    const { default: Page } = await load();

    render((await Page(search(['coven', 'grimoire']))) as React.ReactElement);

    expect(searchHelp).toHaveBeenCalledWith(null, 'coven', expect.anything());
  });

  it('is noindex', async () => {
    const meta = await metadataOf(await load(), search('stock'));

    expect(meta.title).toBeTruthy();
    expect(meta.robots).toMatchObject({ index: false });
  });
});
