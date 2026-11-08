import { render, screen, within } from '@testing-library/react';
import type { Metadata } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { hrefs } from '../../../../support/links';

// The staff help pages sit in the shell and each runs the curation guard itself, which a curator and a keeper pass
// and which renders the styled not-authorized page (forbidden()) for anyone else. They read the staff finders with
// the session, which reach staff rows for a curator and staff and keeper rows for a keeper. A public row has its one
// address under /help, so the staff pages answer it with a 404, as they do a row the reader does not reach
// (DESIGN.md §10). Staff pages are never indexed.

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
  usePathname: () => '/help/staff',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const requireCuratorSession = vi.fn<() => Promise<Session>>();
const requireAdminSession = vi.fn();
const requireSession = vi.fn();
const getSession = vi.fn<() => Promise<Session | null>>();
const sessionIsVerified = vi.fn(async () => true);
vi.mock('@/lib/request-session', () => ({
  requireCuratorSession,
  requireAdminSession,
  requireSession,
  getSession,
  sessionIsVerified,
}));

const listStaffHelpArticles = vi.fn();
const readStaffHelpArticle = vi.fn();
const readHelpArticle = vi.fn();
const searchHelp = vi.fn();
const readHelpGlossary = vi.fn();
vi.mock('@/modules/help', () => ({
  listStaffHelpArticles,
  readHelpGlossary,
  readStaffHelpArticle,
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
    audience = 'staff',
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

const CURATOR: Session = {
  userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  role: 'curator',
} as Session;
const KEEPER: Session = { ...CURATOR, role: 'admin' } as Session;
const REFUSED = new Error('NEXT_HTTP_ERROR_FALLBACK;403');

type Mod = { default: (props?: unknown) => Promise<unknown> } & {
  metadata?: Metadata;
  generateMetadata?: (props: unknown) => Promise<Metadata>;
};

async function metadataOf(mod: Mod, props?: unknown): Promise<Metadata> {
  if (mod.generateMetadata) return mod.generateMetadata(props);
  expect(mod.metadata, 'the page exports metadata or generateMetadata').toBeDefined();
  return mod.metadata!;
}

const loadIndex = async () => (await import('@/app/(shell)/help/staff/page')) as unknown as Mod;
const loadArticle = async () =>
  (await import('@/app/(shell)/help/staff/[slug]/page')) as unknown as Mod;
const loadChild = async () =>
  (await import('@/app/(shell)/help/staff/[slug]/[child]/page')) as unknown as Mod;

const article = (slug: string) => ({ params: Promise.resolve({ slug }) });
const child = (slug: string, childSlug: string) => ({
  params: Promise.resolve({ slug, child: childSlug }),
});

const linkHrefs = () => hrefs(screen.queryAllByRole('link'));

beforeEach(() => {
  vi.clearAllMocks();
  requireCuratorSession.mockResolvedValue(CURATOR);
  readHelpGlossary.mockResolvedValue([]);
  getSession.mockResolvedValue(CURATOR);
  requireAdminSession.mockRejectedValue(new Error('not the curation guard'));
  requireSession.mockRejectedValue(new Error('not the curation guard'));
});

describe('every staff help page runs the curation guard before it reads', () => {
  const pages: [string, () => Promise<Mod>, unknown][] = [
    ['/help/staff', loadIndex, undefined],
    ['/help/staff/[slug]', loadArticle, article('testwort-vocabularies')],
    ['/help/staff/[slug]/[child]', loadChild, child('testwort-vocabularies', 'testwort-forms')],
  ];

  it.each(pages)('%s reads nothing when the guard refuses', async (_, load, props) => {
    requireCuratorSession.mockRejectedValue(REFUSED);
    const { default: Page } = await load();

    await expect(Page(props)).rejects.toBe(REFUSED);

    expect(requireCuratorSession).toHaveBeenCalledTimes(1);
    expect(listStaffHelpArticles).not.toHaveBeenCalled();
    expect(readStaffHelpArticle).not.toHaveBeenCalled();
    expect(readHelpArticle).not.toHaveBeenCalled();
    expect(searchHelp).not.toHaveBeenCalled();
  });

  it.each(pages)('%s is noindex', async (_, load, props) => {
    readStaffHelpArticle.mockResolvedValue({ ...row('testwort-vocabularies'), children: [] });

    const meta = await metadataOf(await load(), props);

    expect(meta.robots).toMatchObject({ index: false });
  });
});

describe('/help/staff', () => {
  it("lists the reader's top-level staff and keeper articles under /help/staff and their FAQ entries, and no public row", async () => {
    requireCuratorSession.mockResolvedValue(KEEPER);
    listStaffHelpArticles.mockResolvedValue(
      entries([
        row('testwort-vocabularies'),
        row('testwort-keeper-duties', { audience: 'keeper' }),
        row('testwort-forms', { parentSlug: 'testwort-vocabularies' }),
        row('testwort-public-guide', { audience: 'public' }),
        row('testwort-staff-question', { kind: 'faq', body: 'The **staff** answer.' }),
        row('testwort-keeper-question', { kind: 'faq', audience: 'keeper' }),
        row('testwort-public-question', { kind: 'faq', audience: 'public' }),
        row('testwort-staff-word', { kind: 'term' }),
      ]),
    );
    const { default: Page } = await loadIndex();

    render((await Page()) as React.ReactElement);

    expect(listStaffHelpArticles).toHaveBeenCalledWith(
      KEEPER,
      expect.objectContaining({ limit: expect.any(Number) }),
    );
    const links = linkHrefs();
    expect(links).toEqual(
      expect.arrayContaining([
        '/help/staff/testwort-vocabularies',
        '/help/staff/testwort-keeper-duties',
      ]),
    );
    // A public row is linked only at its public address, so the staff index leaves it out; a sub page is reached
    // from its parent.
    expect(links).not.toContain('/help/staff/testwort-public-guide');
    expect(links).not.toContain('/help/testwort-public-guide');
    expect(links).not.toContain('/help/staff/testwort-forms');
    expect(links).not.toContain('/help/staff/testwort-vocabularies/testwort-forms');
    // A staff FAQ entry's address is /help/staff#slug (src/lib/help-paths.ts), so the index anchors each one the
    // reader reaches, with its answer as Markdown; a public entry lives on /help.
    expect(document.getElementById('testwort-staff-question')).not.toBeNull();
    expect(document.getElementById('testwort-keeper-question')).not.toBeNull();
    expect(document.getElementById('testwort-public-question')).toBeNull();
    expect(screen.getByText('staff', { selector: 'strong' })).toBeInTheDocument();
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveAttribute('name', 'q');
  });
});

describe('/help/staff/[slug]', () => {
  it('draws a top-level staff article with its sub pages nested under it', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-vocabularies', { body: '## Testwort Staff Section\n\nThe staff body.' }),
      children: [
        row('testwort-forms', { parentSlug: 'testwort-vocabularies' }),
        row('testwort-deities', { audience: 'keeper', parentSlug: 'testwort-vocabularies' }),
      ],
    });
    const { default: Page } = await loadArticle();

    render((await Page(article('testwort-vocabularies'))) as React.ReactElement);

    expect(readStaffHelpArticle).toHaveBeenCalledWith(CURATOR, 'testwort-vocabularies');
    expect(screen.getByRole('heading', { level: 1, name: 'Staff Help' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Testwort Vocabularies' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Testwort Staff Section' }),
    ).toBeInTheDocument();
    expect(linkHrefs()).toEqual(
      expect.arrayContaining([
        '/help/staff/testwort-vocabularies/testwort-forms',
        '/help/staff/testwort-vocabularies/testwort-deities',
      ]),
    );
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('links a public sub page of a staff article at its public address', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-vocabularies'),
      children: [
        row('testwort-open-page', { audience: 'public', parentSlug: 'testwort-vocabularies' }),
      ],
    });
    const { default: Page } = await loadArticle();

    render((await Page(article('testwort-vocabularies'))) as React.ReactElement);

    expect(linkHrefs()).toContain('/help/testwort-vocabularies/testwort-open-page');
  });

  it('is a 404 for a public row, which lives under /help', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-public-guide', { audience: 'public' }),
      children: [],
    });
    const { default: Page } = await loadArticle();

    await expect(Page(article('testwort-public-guide'))).rejects.toThrow('NEXT_NOT_FOUND');
    // Why the 404 means something: the reader is a curator and the finder answered the row.
    expect(requireCuratorSession).toHaveBeenCalled();
    expect(readStaffHelpArticle).toHaveBeenCalledWith(CURATOR, 'testwort-public-guide');
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  // A keeper row asked for by a curator, a deleted row and a missing slug all come back NotFound from the finder.
  it('is a 404 for a row the reader does not reach', async () => {
    readStaffHelpArticle.mockRejectedValue(new NotFound('Help article not found'));
    const { default: Page } = await loadArticle();

    await expect(Page(article('testwort-keeper-duties'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(readStaffHelpArticle).toHaveBeenCalledWith(CURATOR, 'testwort-keeper-duties');
  });

  it.each(['faq', 'term'] as const)(
    'is a 404 for a staff %s, which has no page of its own',
    async (kind) => {
      readStaffHelpArticle.mockResolvedValue({ ...row('testwort-entry', { kind }), children: [] });
      const { default: Page } = await loadArticle();

      await expect(Page(article('testwort-entry'))).rejects.toThrow('NEXT_NOT_FOUND');
    },
  );

  it('answers a sub page asked for at its own slug with a 308 to its nested address', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-forms', { parentSlug: 'testwort-vocabularies' }),
      children: [],
    });
    const { default: Page } = await loadArticle();

    await expect(Page(article('testwort-forms'))).rejects.toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith(
      '/help/staff/testwort-vocabularies/testwort-forms',
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe('/help/staff/[slug]/[child]', () => {
  it('draws a staff sub page under its own parent', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-forms', { parentSlug: 'testwort-vocabularies' }),
      children: [],
    });
    const { default: Page } = await loadChild();

    render((await Page(child('testwort-vocabularies', 'testwort-forms'))) as React.ReactElement);

    expect(readStaffHelpArticle).toHaveBeenCalledWith(CURATOR, 'testwort-forms');
    expect(screen.getByRole('heading', { level: 1, name: 'Staff Help' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Testwort Forms' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('is a 404 for a sub page asked for under another parent', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-forms', { parentSlug: 'testwort-vocabularies' }),
      children: [],
    });
    const { default: Page } = await loadChild();

    await expect(Page(child('testwort-keeper-duties', 'testwort-forms'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('is a 404 for a top-level article asked for as a sub page', async () => {
    readStaffHelpArticle.mockResolvedValue({ ...row('testwort-keeper-duties'), children: [] });
    const { default: Page } = await loadChild();

    await expect(Page(child('testwort-vocabularies', 'testwort-keeper-duties'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('is a 404 for a public sub page, which lives under /help', async () => {
    readStaffHelpArticle.mockResolvedValue({
      ...row('testwort-open-page', { audience: 'public', parentSlug: 'testwort-vocabularies' }),
      children: [],
    });
    const { default: Page } = await loadChild();

    await expect(Page(child('testwort-vocabularies', 'testwort-open-page'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('is a 404 for a row the reader does not reach', async () => {
    readStaffHelpArticle.mockRejectedValue(new NotFound('Help article not found'));
    const { default: Page } = await loadChild();

    await expect(Page(child('testwort-vocabularies', 'testwort-gone'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
