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

// A section's page under its context row, the coven's here: while a navigation whose
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
      <Go name="Filter" />
      <Go name="Home" target={{ region: 'coven', shape: 'page', frame: 'with-nav' }} />
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

  // Leave: the site nav's, whose skeleton fills the whole of the shell's body.
  // Filter: one within the page, whose own control and list show the wait.
  it.each(['Leave', 'Filter'])(
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
// swaps the page and leaves the row standing.
describe('SectionBody for the admin area', () => {
  const renderAdmin = () => {
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    return render(
      <Navigating push={router.push} arrives={arrives}>
        <Go name="Forms" target={{ region: 'admin', shape: 'table' }} />
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

  it('answers an admin-region navigation by taking the page away', async () => {
    renderAdmin();

    await press('Forms');

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('list', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  // The skeleton does not vanish when the page arrives: it stays over it, out of
  // the way of assistive technology and the pointer, for the length of the fade
  // (200ms, `arrived`), then goes; the timing is SkeletonFade's own proof.
  describe('when the page arrives', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    // Once the page is back, the one thing hidden from assistive technology is
    // the skeleton left over it for the fade.
    const overlay = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]');

    it('shows the page at once and keeps the skeleton over it, hidden from assistive technology, until the fade is done', async () => {
      const { container } = renderBody();
      await press('Home');
      expect(screen.getByRole('status')).toBeInTheDocument();

      await act(async () => arrive());

      expect(oldPage()).toBeInTheDocument();
      const fading = overlay(container);
      expect(fading).not.toBeNull();
      // Nothing of it is announced or reachable as a second heading, landmark or status.
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
      expect(screen.getAllByRole('main')).toHaveLength(1);
    });
  });
});
