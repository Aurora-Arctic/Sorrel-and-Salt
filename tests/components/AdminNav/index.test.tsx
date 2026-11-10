import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../support/links';

// Next's hook reads the App Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { default: AdminNav, CuratorNav, CuratorContents } = await import('@/components/AdminNav');

// claude-docs/components/admin-nav.md

const curatorNav = () => screen.getByRole('navigation', { name: 'Curator' });
const keepersNav = () => screen.getByRole('navigation', { name: 'Keepers' });
const linksIn = (nav: HTMLElement) => within(nav).getAllByRole('link');

const CURATION = [
  '/curator/compendium',
  '/curator/categories',
  '/curator/forms',
  '/curator/deities',
  '/curator/celestial-bodies',
];
const PEOPLE = '/keepers/users';
const INVITATIONS = '/keepers/invitations';
const SUPPORT = '/keepers/support';
const DOCUMENTS = '/keepers/documents/terms';
const BUSINESS_CARDS = '/keepers/business-cards';
const HELP = '/keepers/help';
const STAFF_HELP = '/help/staff';

const sorted = (list: (string | null)[]) => [...list].sort();

describe('CuratorNav', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/curator');
  });

  it('links every curation page in a row, in its sections’ order, then Staff Help, and nothing under /keepers', () => {
    render(<CuratorNav />);

    expect(hrefs(linksIn(curatorNav()))).toEqual([...CURATION, STAFF_HELP]);
  });

  it.each([
    ['/curator', []],
    ['/curator/categories', ['/curator/categories']],
    ['/curator/category-groups', ['/curator/categories']],
    ['/curator/zodiac-signs', ['/curator/celestial-bodies']],
  ])('marks only the page you are on at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<CuratorNav />);

    expect(currentHrefs(linksIn(curatorNav()))).toEqual(expected);
  });
});

describe('AdminNav, the Keepers nav', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/keepers');
  });

  it('links a keeper to Support, People, Invitations, Documents, Help, Business Cards and Staff Help, and to no curation page', () => {
    render(<AdminNav managesPeople />);

    const links = hrefs(linksIn(keepersNav()));
    expect(sorted(links)).toEqual(
      sorted([SUPPORT, PEOPLE, INVITATIONS, DOCUMENTS, HELP, BUSINESS_CARDS, STAFF_HELP]),
    );
    expect(within(keepersNav()).getByRole('link', { name: 'People' })).toHaveAttribute(
      'href',
      PEOPLE,
    );
    expect(within(keepersNav()).getByRole('link', { name: 'Invitations' })).toHaveAttribute(
      'href',
      INVITATIONS,
    );
    expect(within(keepersNav()).getByRole('link', { name: 'Business Cards' })).toHaveAttribute(
      'href',
      BUSINESS_CARDS,
    );
    expect(within(keepersNav()).getByRole('link', { name: 'Staff Help' })).toHaveAttribute(
      'href',
      STAFF_HELP,
    );
  });

  // Why the curator's list could have held more: the same nav with `managesPeople` lists both people pages.
  it('links a curator to Support and Staff Help alone, as every other keepers page refuses them anyway', () => {
    render(<AdminNav managesPeople={false} />);

    expect(hrefs(linksIn(keepersNav()))).toEqual([SUPPORT, STAFF_HELP]);
  });

  it.each([
    ['/keepers', []],
    ['/keepers/users', [PEOPLE]],
    ['/keepers/privilege-changes', [PEOPLE]],
    ['/keepers/invitations', [INVITATIONS]],
    ['/keepers/invitation-cards', [INVITATIONS]],
    ['/keepers/card-sign-ups', [INVITATIONS]],
    ['/keepers/support', [SUPPORT]],
    ['/keepers/documents/privacy', [DOCUMENTS]],
    ['/keepers/documents/disclaimer', [DOCUMENTS]],
    ['/keepers/documents/about', [DOCUMENTS]],
    ['/keepers/business-cards', [BUSINESS_CARDS]],
  ])('marks only the page you are on at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<AdminNav managesPeople />);

    expect(currentHrefs(linksIn(keepersNav()))).toEqual(expected);
  });
});

describe('AdminNav support count', () => {
  it('carries the requests waiting on staff in the Support link’s text', () => {
    render(<AdminNav managesPeople needsStaff={3} />);

    expect(within(keepersNav()).getByRole('link', { name: /Support/ })).toHaveTextContent(
      'Support 3',
    );
  });

  it('says only Support where no count is given', () => {
    render(<AdminNav managesPeople />);

    expect(within(keepersNav()).getByRole('link', { name: /Support/ })).toHaveTextContent(
      /^Support$/,
    );
  });
});

describe('CuratorContents, the curator index', () => {
  it('lists every curation page under no group heading named Compendium, then the guides', () => {
    render(<CuratorContents />);

    expect(screen.queryByRole('heading', { name: 'Compendium' })).not.toBeInTheDocument();
    expect(hrefs(screen.getAllByRole('link'))).toEqual([...CURATION, '/help/staff']);
  });
});
