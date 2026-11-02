import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../support/links';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { default: AdminNav, CuratorNav } = await import('@/components/AdminNav');

// Two navs, one per area (claude-docs/components/admin-nav.md): the `/curator` layout's lists the curation pages,
// the `/keepers` layout's the support and people pages. Each links a page at its first tab and marks the page you are on.
// Which pages show in the row and which behind More is the stylesheet's, so every page is in the row here.

const curatorNav = () => screen.getByRole('navigation', { name: 'Curator' });
const keepersNav = () => screen.getByRole('navigation', { name: 'Keepers' });
const linksIn = (nav: HTMLElement) => within(nav).getAllByRole('link');

// Each curation page linked at its first tab, in the sections' order.
const CURATION = [
  '/curator/compendium',
  '/curator/categories',
  '/curator/forms',
  '/curator/deities',
  '/curator/celestial-bodies',
];
// People and Invitations, each at its first tab: an admin's alone.
const PEOPLE = '/keepers/users';
const INVITATIONS = '/keepers/invitations';
const SUPPORT = '/keepers/support';

const sorted = (list: (string | null)[]) => [...list].sort();

describe('CuratorNav', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/curator');
  });

  it('links every curation page in a row, in its sections’ order, and nothing under /keepers', () => {
    render(<CuratorNav />);

    expect(hrefs(linksIn(curatorNav()))).toEqual(CURATION);
  });

  it.each([
    // The index marks none; a page marks its own entry, on any of its tabs.
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

  it('links an admin to Support, People and Invitations, and to no curation page', () => {
    render(<AdminNav managesPeople />);

    const links = hrefs(linksIn(keepersNav()));
    expect(sorted(links)).toEqual(sorted([SUPPORT, PEOPLE, INVITATIONS]));
    expect(within(keepersNav()).getByRole('link', { name: 'People' })).toHaveAttribute(
      'href',
      PEOPLE,
    );
    expect(within(keepersNav()).getByRole('link', { name: 'Invitations' })).toHaveAttribute(
      'href',
      INVITATIONS,
    );
  });

  // Why the curator's list could have held more: the same nav with `managesPeople` lists both people pages.
  it('links a curator to Support alone, which every other keepers page refuses them anyway', () => {
    render(<AdminNav managesPeople={false} />);

    expect(hrefs(linksIn(keepersNav()))).toEqual([SUPPORT]);
  });

  it.each([
    // The index marks none; a page marks its own entry on any of its tabs, and each tab marks only its own page.
    ['/keepers', []],
    ['/keepers/users', [PEOPLE]],
    ['/keepers/privilege-changes', [PEOPLE]],
    ['/keepers/invitations', [INVITATIONS]],
    ['/keepers/invitation-cards', [INVITATIONS]],
    ['/keepers/card-sign-ups', [INVITATIONS]],
    ['/keepers/support', [SUPPORT]],
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
