import { render, screen, within } from '@testing-library/react';
import type { Metadata } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PAGE_SIZE, decodeCursor, encodeCursor } from '@/lib/cursor';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import type { Cursor, PageRequest } from '@/lib/types';
import { hrefs } from '../../../support/links';
import { getSession, sessionIsVerified } from '../../../support/request-session';

// The public help pages read the public finders, which take no session, filter `audience = 'public'` in SQL and are
// cached (tests/modules/help/services/help-reads.test.ts). Search reads the session, since its results follow the
// reader's audience; the front page and an article read it beside the cached text only for the Staff Help and Edit
// links (tests/lib/help-viewer.test.ts). A sub page has one address, under its parent's: asked for at /help/[slug] it answers 308,
// and asked for under another parent it is a 404 (DESIGN.md §10; support.md, "The parent article").

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const permanentRedirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT 308 ${to}`);
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT 307 ${to}`);
});
vi.mock('next/navigation', async () => ({
  ...(await import('../../../support/next-navigation')),
  notFound,
  permanentRedirect,
  redirect,
  usePathname: () => '/help',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/request-session', () => import('../../../support/request-session'));

const readHelpFaq = vi.fn();
const readHelpArticleIndex = vi.fn();
const readHelpGlossary = vi.fn();
const readHelpArticle = vi.fn();
const searchHelp = vi.fn();
const countHelpSearch = vi.fn();
vi.mock('@/modules/help', () => ({
  readHelpFaq,
  readHelpArticleIndex,
  readHelpGlossary,
  readHelpArticle,
  searchHelp,
  countHelpSearch,
}));

type Kind = 'faq' | 'article' | 'guide' | 'term';
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
const KEEPER: Session = {
  userId: '7a2d3e5f-0c9b-4d4e-9f80-1b2c3d4e5f60',
  role: 'admin',
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
  sessionIsVerified.mockResolvedValue(true);
});

// The help layout's frame, which holds the heading and search box the page leaves out.
const helpHeader = async () => (await import('@/components/HelpChrome')).HelpFrame;

describe('/help', () => {
  const load = async () => (await import('@/app/(public)/help/page')) as unknown as Mod;

  it('draws the FAQ and the article index from the public finders, below the help header the layout holds', async () => {
    const faq = [
      row('testwort-question-one', { kind: 'faq' }),
      row('testwort-question-two', { kind: 'faq' }),
    ];
    const index = [row('testwort-getting-started'), row('testwort-your-coven')];
    readHelpFaq.mockResolvedValue(entries(faq));
    readHelpArticleIndex.mockResolvedValue(entries(index));
    readHelpArticle.mockRejectedValue(new NotFound());
    readHelpGlossary.mockResolvedValue(entries([]));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement, { wrapper: await helpHeader() });

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
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
    // A signed-out reader is offered no Staff Help link.
    expect(linkHrefs()).not.toContain('/help/staff');
  });

  // The FAQ is cached for every reader; who is asking is read beside it, per request, for the pencil alone.
  it.each([
    ['a verified keeper', KEEPER, ['/keepers/help?view=faq']],
    ['a curator', CURATOR, []],
    ['a signed-out reader', null, []],
  ] as const)('hands Edit FAQ to %s alone', async (_, session, edit) => {
    getSession.mockResolvedValue(session);
    readHelpFaq.mockResolvedValue(entries([row('testwort-question-one', { kind: 'faq' })]));
    readHelpArticleIndex.mockResolvedValue(entries([]));
    readHelpArticle.mockRejectedValue(new NotFound());
    readHelpGlossary.mockResolvedValue(entries([]));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement, { wrapper: await helpHeader() });

    // Precondition: the page drew the FAQ, so a missing pencil is the viewer's, not an empty FAQ's.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Frequently Asked Questions' }),
    ).toBeInTheDocument();
    expect(hrefs(screen.queryAllByRole('link', { name: 'Edit FAQ' }))).toEqual(edit);
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

  it('draws every term the public finder returns, each anchored by its slug', async () => {
    const terms = [
      row('ashgrove', { kind: 'term' }),
      row('observer', { kind: 'term' }),
      row('steward', { kind: 'term' }),
    ];
    readHelpGlossary.mockResolvedValue(entries(terms));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement, { wrapper: await helpHeader() });

    expect(readHelpGlossary).toHaveBeenCalled();
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Ashgrove',
      'Observer',
      'Steward',
    ]);
    for (const term of terms) expect(document.getElementById(term.slug), term.slug).not.toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
  });

  // The glossary text is cached for every reader; who is asking is read beside it, per request, for the pencil alone.
  it.each([
    ['a verified keeper', KEEPER, ['/keepers/help?view=glossary']],
    ['a curator', CURATOR, []],
    ['a signed-out reader', null, []],
  ] as const)('hands Edit Glossary to %s alone', async (_, session, edit) => {
    getSession.mockResolvedValue(session);
    readHelpGlossary.mockResolvedValue(entries([row('steward', { kind: 'term' })]));
    const { default: Page } = await load();

    render((await Page()) as React.ReactElement, { wrapper: await helpHeader() });

    // Precondition: the page drew its title, so a missing pencil is the viewer's, not an empty page's.
    expect(screen.getByRole('heading', { level: 1, name: 'Glossary' })).toBeInTheDocument();
    expect(hrefs(screen.queryAllByRole('link', { name: 'Edit Glossary' }))).toEqual(edit);
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

    render((await Page(article('testwort-guide'))) as React.ReactElement, {
      wrapper: await helpHeader(),
    });

    expect(readHelpArticle).toHaveBeenCalledWith('testwort-guide');
    expect(screen.getByRole('heading', { level: 1, name: 'Testwort Guide' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Testwort Section' })).toBeInTheDocument();
    expect(linkHrefs()).toEqual(
      expect.arrayContaining([
        '/help/testwort-guide/testwort-signing-in',
        '/help/testwort-guide/testwort-demo-coven',
      ]),
    );
    // The help layout above the page holds Help and the search box, so the title is the page's one h1.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('search')).toBeNull();
    // A signed-out reader is offered no edit.
    expect(linkHrefs().filter((href) => href?.startsWith('/keepers/'))).toEqual([]);
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

  it('draws a public guide, its own body above the sub pages it holds', async () => {
    readHelpArticle.mockResolvedValue({
      ...row('testwort-grove', { kind: 'guide', body: 'The guide’s own words.' }),
      children: [row('testwort-leaf', { parentSlug: 'testwort-grove' })],
    });
    const { default: Page } = await load();

    render((await Page(article('testwort-grove'))) as React.ReactElement, {
      wrapper: await helpHeader(),
    });

    expect(notFound).not.toHaveBeenCalled();
    const words = screen.getByText('The guide’s own words.');
    const nav = screen.getByRole('navigation', { name: 'In This Guide' });
    expect(words.compareDocumentPosition(nav)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(linkHrefs()).toContain('/help/testwort-grove/testwort-leaf');
  });

  // The public finder answers by slug for every kind; only an article or a guide has a page of its own.
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

    render((await Page(child('testwort-guide', 'testwort-signing-in'))) as React.ReactElement, {
      wrapper: await helpHeader(),
    });

    expect(readHelpArticle).toHaveBeenCalledWith('testwort-signing-in');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Testwort Signing In' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('search')).toBeNull();
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
  // A cursor the codec reads, as every entry a finder answers carries one.
  const searchCursor = (i: number): Cursor => ({
    key: [String(-i)],
    id: row(`testwort-cursor-${i}`).id,
  });

  beforeEach(() => {
    // One page: the cases that do not page read a count that agrees with any short answer.
    countHelpSearch.mockResolvedValue({ totalCount: 4, countBefore: 0 });
  });

  it('searches as a signed-out reader and links each result to its address, a term to its glossary anchor', async () => {
    searchHelp.mockResolvedValue(
      [
        row('testwort-stock-levels', { parentSlug: 'testwort-ingredients' }),
        row('stock', { kind: 'term' }),
        row('where-is-my-stock', { kind: 'faq' }),
        row('testwort-ingredients'),
      ].map((node, i) => ({ node, cursor: searchCursor(i), score: 1 - i / 10 })),
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
  });

  it("searches as the signed-in reader, so a curator's results carry staff rows at their staff address", async () => {
    getSession.mockResolvedValue(CURATOR);
    searchHelp.mockResolvedValue(
      [row('testwort-vocabularies', { audience: 'staff' })].map((node) => ({
        node,
        cursor: searchCursor(0),
        score: 1,
      })),
    );
    const { default: Page } = await load();

    render((await Page(search('vocabularies'))) as React.ReactElement);

    expect(searchHelp).toHaveBeenCalledWith(CURATOR, 'vocabularies', expect.anything());
    expect(linkHrefs()).toContain('/help/staff/testwort-vocabularies');
  });

  it('shows no results for no q at all', async () => {
    searchHelp.mockResolvedValue([]);
    const { default: Page } = await load();

    render((await Page(search())) as React.ReactElement);

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).toBeNull();
  });

  // A blank search sent with no script reaches the help index, never an empty results page.
  it.each([
    ['an empty q', ''],
    ['a q of spaces', '   '],
  ])('sends %s back to the help index', async (_, q) => {
    const { default: Page } = await load();

    await expect(Page(search(q))).rejects.toThrow('NEXT_REDIRECT 307 /help');
    expect(searchHelp).not.toHaveBeenCalled();
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

  describe('counted pages, each read by its cursor', () => {
    const QUERY = 'tallowmere';
    const TOTAL = 201;
    const cursorAt = (i: number): Cursor => ({
      key: [String(-3 + i / 1000)],
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    });
    const indexOf = (cursor: Cursor) => Number(cursor.id.slice(-12));
    const matchAt = (i: number) => ({
      node: row(`testwort-tallowmere-${i}`),
      cursor: cursorAt(i),
      score: 3 - i / 1000,
    });
    // TOTAL matches, numbered from 0 in rank order: each read answers the rows asked for from its cursor on, and
    // the count says how many come before the page's first row.
    const totalMatches = () => {
      searchHelp.mockImplementation(async (_session, _query, request: PageRequest) => {
        const from = request.after ? indexOf(request.after) + 1 : 0;
        const length = Math.max(0, Math.min(request.limit, TOTAL - from));
        return Array.from({ length }, (_, i) => matchAt(from + i));
      });
      countHelpSearch.mockImplementation(async (_session, _query, start?: Cursor) => ({
        totalCount: TOTAL,
        countBefore: start ? indexOf(start) : null,
      }));
    };
    const at = (q: string, cursor: { after?: string; before?: string }) => ({
      searchParams: Promise.resolve({ q, ...cursor }),
    });
    const resultIndexes = () =>
      linkHrefs()
        .filter((href) => href?.startsWith('/help/testwort-tallowmere-'))
        .map((href) => Number(href!.slice('/help/testwort-tallowmere-'.length)));
    const pager = () => screen.getByRole('navigation', { name: 'Pages' });
    const endHref = (name: 'Prev' | 'Next') =>
      within(pager()).getByRole('link', { name }).getAttribute('href');
    // The pager's middle item, between its two ends, holds the page and the number of pages.
    const position = () => within(pager()).getAllByRole('listitem')[1];
    const sizeAsked = () =>
      (searchHelp.mock.calls[0] as [unknown, unknown, PageRequest])[2].limit - 1;
    const statesTotal = (total: number) =>
      screen
        .getAllByRole('status')
        .some((status) => new RegExp(`(^|\\D)${total}(\\D|$)`).test(status.textContent ?? ''));

    it('reads the first page through the helper, counted, and links the next at the same words', async () => {
      totalMatches();
      const { default: Page } = await load();

      render((await Page(search(QUERY))) as React.ReactElement);

      // The helper sizes the read: one page and the row that says another follows, never the page's own bound.
      const size = sizeAsked();
      expect(size + 1).toBeLessThanOrEqual(MAX_PAGE_SIZE + 1);
      const drawn = resultIndexes();
      expect(drawn).toEqual(Array.from({ length: size }, (_, i) => i));
      expect(countHelpSearch).toHaveBeenCalledWith(null, QUERY, cursorAt(0));
      expect(statesTotal(TOTAL)).toBe(true);
      expect(statesTotal(size)).toBe(false);
      expect(position()).toHaveTextContent(new RegExp(`^\\D*1\\D+${Math.ceil(TOTAL / size)}\\D*$`));
      expect(endHref('Prev')).toBeNull();

      const next = new URL(endHref('Next')!, 'http://x');
      expect(next.pathname).toBe('/help/search');
      expect(next.searchParams.get('q')).toBe(QUERY);
      expect(decodeCursor(next.searchParams.get('after')!)).toEqual(cursorAt(size - 1));
    });

    it('reads the page its address names, says where it stands, and links the one before at the same words', async () => {
      totalMatches();
      const { default: Page } = await load();

      render((await Page(at(QUERY, { after: encodeCursor(cursorAt(30)) }))) as React.ReactElement);

      expect(searchHelp).toHaveBeenCalledWith(
        null,
        QUERY,
        expect.objectContaining({ after: cursorAt(30) }),
      );
      const size = sizeAsked();
      expect(resultIndexes()[0]).toBe(31);
      expect(countHelpSearch).toHaveBeenCalledWith(null, QUERY, cursorAt(31));
      expect(statesTotal(TOTAL)).toBe(true);
      expect(position()).toHaveTextContent(
        new RegExp(`^\\D*${Math.floor(31 / size) + 1}\\D+${Math.ceil(TOTAL / size)}\\D*$`),
      );

      const previous = new URL(endHref('Prev')!, 'http://x');
      expect(previous.pathname).toBe('/help/search');
      expect(previous.searchParams.get('q')).toBe(QUERY);
      expect(decodeCursor(previous.searchParams.get('before')!)).toEqual(cursorAt(31));
    });

    it('states the total on the last page, where fewer rows than a page are drawn', async () => {
      totalMatches();
      const { default: Page } = await load();

      render(
        (await Page(at(QUERY, { after: encodeCursor(cursorAt(TOTAL - 3)) }))) as React.ReactElement,
      );

      // Precondition: this is the last page, with the last match on it.
      expect(resultIndexes()).toEqual([TOTAL - 2, TOTAL - 1]);
      expect(statesTotal(TOTAL)).toBe(true);
      expect(endHref('Next')).toBeNull();
    });

    it('counts as the signed-in reader, so the total follows their audience', async () => {
      getSession.mockResolvedValue(CURATOR);
      totalMatches();
      const { default: Page } = await load();

      render((await Page(search(QUERY))) as React.ReactElement);

      expect(searchHelp).toHaveBeenCalledWith(CURATOR, QUERY, expect.anything());
      expect(countHelpSearch).toHaveBeenCalledWith(CURATOR, QUERY, cursorAt(0));
    });

    it('draws the pager with both ends disabled, page 1 of 1, when the matches fit one page', async () => {
      searchHelp.mockResolvedValue([0, 1, 2].map(matchAt));
      countHelpSearch.mockResolvedValue({ totalCount: 3, countBefore: 0 });
      const { default: Page } = await load();

      render((await Page(search(QUERY))) as React.ReactElement);

      // Precondition: the matches are drawn.
      expect(resultIndexes()).toEqual([0, 1, 2]);
      for (const name of ['Prev', 'Next'] as const) {
        const end = within(pager()).getByRole('link', { name });
        expect(end).toHaveAttribute('aria-disabled', 'true');
        expect(end).not.toHaveAttribute('href');
      }
      expect((position().textContent?.match(/\d+/g) ?? []).map(Number)).toEqual([1, 1]);
    });

    it('draws no pager when nothing matches', async () => {
      searchHelp.mockResolvedValue([]);
      countHelpSearch.mockResolvedValue({ totalCount: 0, countBefore: null });
      const { default: Page } = await load();

      render((await Page(search(QUERY))) as React.ReactElement);

      // Precondition: the page answered the search, with its status and no result.
      expect(searchHelp).toHaveBeenCalled();
      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
      expect(resultIndexes()).toEqual([]);
      expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
    });
  });
});
