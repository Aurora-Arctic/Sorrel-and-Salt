import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';

// The four document pages and their version pages: what each reads, and what it hands DocumentPage. The reads and DocumentPage
// are mocked; how the markdown renders is tests/components/DocumentPage's, and that the reads are cached is the documents module's.
// A document page is public, so none asks for a session (claude-docs/design-decisions/m15.59-document-editor-scope.md).

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound, redirect: vi.fn() }));

const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

const readDocument = vi.fn();
const readDocumentVersion = vi.fn();
const listDocumentVersions = vi.fn();
vi.mock('@/modules/documents', () => ({ readDocument, readDocumentVersion, listDocumentVersions }));

const documentPage = vi.fn((_props: Record<string, unknown>) => null);
vi.mock('@/components/DocumentPage', () => ({ default: documentPage }));

type Page = (props?: unknown) => Promise<unknown>;

// Literal paths, so the bundler resolves each route.
const PAGES: Record<string, { page: () => Promise<Page>; version: () => Promise<Page> }> = {
  privacy: {
    page: async () => (await import('@/app/(public)/privacy/page')).default as unknown as Page,
    version: async () =>
      (await import('@/app/(public)/privacy/versions/[number]/page')).default as unknown as Page,
  },
  disclaimer: {
    page: async () => (await import('@/app/(public)/disclaimer/page')).default as unknown as Page,
    version: async () =>
      (await import('@/app/(public)/disclaimer/versions/[number]/page')).default as unknown as Page,
  },
  'code-of-ethics': {
    page: async () =>
      (await import('@/app/(public)/code-of-ethics/page')).default as unknown as Page,
    version: async () =>
      (await import('@/app/(public)/code-of-ethics/versions/[number]/page'))
        .default as unknown as Page,
  },
  terms: {
    page: async () => (await import('@/app/(public)/terms/page')).default as unknown as Page,
    version: async () =>
      (await import('@/app/(public)/terms/versions/[number]/page')).default as unknown as Page,
  },
};

/** The props of the one DocumentPage element in the tree a page returned. */
function documentPageProps(tree: unknown): Record<string, unknown> {
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const element = node as { type?: unknown; props?: Record<string, unknown> };
    if (element.type === documentPage && element.props) found.push(element.props);
    for (const child of [element.props?.children].flat()) walk(child);
  };
  walk(tree);
  expect(found).toHaveLength(1);
  return found[0]!;
}

const version = (key: string, number: number, publishedAt: Date) => ({
  key,
  title: `Fixture ${key} Title`,
  lede: `Fixture ${key} lede.`,
  number,
  body: `## Fixture Section\n\nFixture ${key} version ${number}.`,
  publishedAt,
});

const THIRD = new Date('2026-05-06T00:00:00Z');
const SECOND = new Date('2026-04-05T00:00:00Z');
const FIRST = new Date('2026-03-04T00:00:00Z');

const params = (number: string) => ({ params: Promise.resolve({ number }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(Object.keys(PAGES))('/%s', (key) => {
  it('hands DocumentPage the published version, dated by its publish, and the earlier versions as links', async () => {
    readDocument.mockResolvedValue(version(key, 3, THIRD));
    listDocumentVersions.mockResolvedValue(
      [
        { number: 3, publishedAt: THIRD },
        { number: 2, publishedAt: SECOND },
        { number: 1, publishedAt: FIRST },
      ].map((node) => ({ node, cursor: String(node.number) })),
    );
    const Page = await PAGES[key]!.page();

    const props = documentPageProps(await Page());

    expect(readDocument).toHaveBeenCalledWith(key);
    expect(listDocumentVersions).toHaveBeenCalledWith(key, expect.anything());
    expect(props).toMatchObject({
      title: `Fixture ${key} Title`,
      lede: `Fixture ${key} lede.`,
      updatedOn: THIRD,
      body: `## Fixture Section\n\nFixture ${key} version 3.`,
    });
    // The current version is the page itself, so the list holds only the earlier ones, newest first.
    expect(props.history).toEqual([
      { number: 2, publishedAt: SECOND, href: `/${key}/versions/2` },
      { number: 1, publishedAt: FIRST, href: `/${key}/versions/1` },
    ]);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('shows one published version on its own page, dated by its own publish', async () => {
    readDocumentVersion.mockResolvedValue(version(key, 1, FIRST));
    const Page = await PAGES[key]!.version();

    const props = documentPageProps(await Page(params('1')));

    expect(readDocumentVersion).toHaveBeenCalledWith(key, 1);
    expect(props).toMatchObject({
      title: `Fixture ${key} Title`,
      updatedOn: FIRST,
      body: `## Fixture Section\n\nFixture ${key} version 1.`,
    });
    expect(getSession).not.toHaveBeenCalled();
  });

  // A draft, a deleted version and a number never published all reach the page as the read's NotFound.
  it('is a 404 for a version the read does not find', async () => {
    readDocumentVersion.mockRejectedValue(new NotFound('No such version.'));
    const Page = await PAGES[key]!.version();

    await expect(Page(params('7'))).rejects.toThrow('NEXT_NOT_FOUND');

    expect(readDocumentVersion).toHaveBeenCalledWith(key, 7);
    expect(notFound).toHaveBeenCalled();
    expect(documentPage).not.toHaveBeenCalled();
  });

  it('is a 404 for an address that is not a whole version number, without a read', async () => {
    const Page = await PAGES[key]!.version();

    for (const number of ['abc', '0', '-1', '1.5', '1e2', '']) {
      notFound.mockClear();
      await expect(Page(params(number)), number).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound, number).toHaveBeenCalled();
    }
    expect(readDocumentVersion).not.toHaveBeenCalled();
  });
});

// The privacy policy's "Who Can See What" cards depend on code, so they stay in code: the markdown holds a `{access-cards}`
// paragraph and the page hands DocumentPage the cards to draw there, on the current page and on every version page alike, since a
// version that holds the placeholder must draw the cards too. How a mapped placeholder renders is tests/components/DocumentPage's.
describe('/privacy hands DocumentPage the access cards', () => {
  // Loaded once the mocks above exist, since AccessCards reaches next/navigation.
  let accessCards: unknown;
  beforeAll(async () => {
    accessCards = (await import('@/components/AccessCards')).default;
  });

  /** The props of the AccessCards element the page mapped to `access-cards`. */
  function accessCardsProps(props: Record<string, unknown>): {
    roles: readonly unknown[];
    rows: readonly { cells: readonly unknown[] }[];
  } {
    const placeholders = props.placeholders as Record<string, unknown> | undefined;
    const element = placeholders?.['access-cards'] as
      { type?: unknown; props?: Record<string, unknown> } | undefined;
    expect(element?.type).toBe(accessCards);
    return element!.props as ReturnType<typeof accessCardsProps>;
  }

  /** Six roles and ten kinds of data, as the page drew them before the text moved into the database. */
  function expectTheAccessData({ roles, rows }: ReturnType<typeof accessCardsProps>): void {
    expect(roles).toHaveLength(6);
    expect(rows).toHaveLength(10);
    for (const row of rows) expect(row.cells).toHaveLength(roles.length);
  }

  it('on the current page', async () => {
    readDocument.mockResolvedValue(version('privacy', 2, SECOND));
    listDocumentVersions.mockResolvedValue([]);
    const Page = await PAGES.privacy!.page();

    expectTheAccessData(accessCardsProps(documentPageProps(await Page())));
  });

  it('on a version page', async () => {
    readDocumentVersion.mockResolvedValue(version('privacy', 1, FIRST));
    const Page = await PAGES.privacy!.version();

    expectTheAccessData(accessCardsProps(documentPageProps(await Page(params('1')))));
  });
});
