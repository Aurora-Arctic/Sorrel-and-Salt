import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationTarget } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/coven/fixture-coven/ingredients',
}));

const { usePendingNavigation } = await import('@/lib/navigation');
const { default: SectionBody } = await import('@/components/SectionBody');
const { default: AdminNav } = await import('@/components/AdminNav');

// A section's page under its context row, the coven's here (M12.33): while a navigation whose
// target is the coven region is on its way, the old coven's page is taken
// away at once and the destination's skeleton, with its one status, stands
// in its place, so nobody acts on the wrong coven's data. A navigation aimed
// elsewhere leaves the page as it is. The skeleton's shape is the
// stylesheet's, so it is not read here.

/** A control that starts a navigation with the given target, as the switcher and section nav do. */
function Go({ name, target }: { name: string; target?: NavigationTarget }) {
  const { navigate } = usePendingNavigation();
  return (
    <button
      type="button"
      onClick={() => navigate('/coven/testwort-circle/ingredients', { target })}
    >
      {name}
    </button>
  );
}

let arrive = () => {};
function renderBody() {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <Go name="Switch" target={{ region: 'coven', shape: 'cards' }} />
      <Go name="Leave" target={{ region: 'main', shape: 'page' }} />
      <Go name="Admin" target={{ region: 'admin', shape: 'table' }} />
      <Go name="Filter" />
      <Go name="Home" target={{ region: 'coven', shape: 'page', frame: 'with-nav' }} />
      <Go name="Entry" target={{ region: 'coven', shape: 'page', frame: 'entry' }} />
      <Go name="People" target={{ region: 'coven', shape: 'table', title: true, tabs: true }} />
      <SectionBody region="coven" className="coven-layout">
        <main>
          <ul aria-label="Ingredients">
            <li>Testwort</li>
          </ul>
        </main>
      </SectionBody>
    </Navigating>,
  );
}

const press = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

const oldPage = () => screen.queryByRole('list', { name: 'Ingredients' });

beforeEach(() => {
  router.push.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('SectionBody', () => {
  it('shows its page, and no status, while nothing is on its way', () => {
    renderBody();

    expect(oldPage()).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('takes the page away at once for a coven-region navigation, with one status in a main landmark, until the new page renders', async () => {
    renderBody();

    await press('Switch');

    // Why the swap is the navigation's: it is on its way.
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(oldPage()).not.toBeInTheDocument();
    // The page's own landmark went with it; the skeleton keeps the page's one
    // `main`, and its status is the only announcement.
    expect(within(screen.getByRole('main')).getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);

    await act(async () => arrive());

    expect(oldPage()).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // The destination's own parts are drawn: a home's contents menu, a tabbed page's tab row.
  it('draws the side menu for a page that has one', async () => {
    const { container } = renderBody();
    await press('Home');
    expect(container.querySelector('.skeleton__menu')).not.toBeNull();
  });

  // An ingredient's entry fills the wide column, so its wait is the entry's
  // own menu grid, not the coven home's narrow `.page-with-nav`.
  it("draws an ingredient's entry in the entry's own grid", async () => {
    const { container } = renderBody();
    await press('Entry');
    expect(container.querySelector('.ingredient-entry--with-nav .skeleton__menu')).not.toBeNull();
    expect(container.querySelector('.page-with-nav')).toBeNull();
  });

  it('draws the tab row for a tabbed page, and no menu', async () => {
    const { container } = renderBody();
    await press('People');
    expect(container.querySelector('.skeleton__tabs')).not.toBeNull();
    expect(container.querySelector('.skeleton__menu')).toBeNull();
  });

  // Admin: another section's, whose own body answers it.
  // Leave: the site nav's, whose skeleton fills the whole of the shell's body.
  // Filter: one within the page, whose own control and list show the wait.
  it.each(['Leave', 'Admin', 'Filter'])(
    'leaves the page in place for a navigation not aimed at it (%s)',
    async (name) => {
      renderBody();

      await press(name);

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(oldPage()).toBeInTheDocument();
    },
  );
});

// The admin area's body, under its own context row: a move between admin pages
// swaps the page and leaves the row, and its nav, standing.
describe('SectionBody for the admin area', () => {
  const renderAdmin = () => {
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    return render(
      <Navigating push={router.push} arrives={arrives}>
        <AdminNav managesPeople />
        <Go name="Coven" target={{ region: 'coven', shape: 'cards' }} />
        <SectionBody region="admin" className="page-column">
          <main>
            <ul aria-label="Categories">
              <li>Testwort</li>
            </ul>
          </main>
        </SectionBody>
      </Navigating>,
    );
  };

  it('answers a link of the admin nav by taking the page away and keeping the nav', async () => {
    renderAdmin();

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Forms' }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('list', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument();
  });

  it('ignores a navigation aimed at the coven', async () => {
    renderAdmin();

    await press('Coven');

    expect(screen.getByRole('list', { name: 'Categories' })).toBeInTheDocument();
  });
});
