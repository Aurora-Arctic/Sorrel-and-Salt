import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/coven/fixture-coven/ingredients',
}));

// M12.33 scaffold: lane A builds `@/lib/navigation` and lane C
// `@/components/CovenBody`. Until both have, the modules are loaded by
// specifiers neither the type checker nor Vite resolves, so this file
// compiles and its suite is skipped. Lane C makes each import a plain
// `await import('…')` of the path below and unskips the
// `describe.skip` here (grep "M12.33 scaffold").
const scaffoldNavigation: string = '@/lib/navigation';
const { usePendingNavigation } = await import(/* @vite-ignore */ scaffoldNavigation).catch(
  () => ({}),
);
const scaffoldBody: string = '@/components/CovenBody';
const { default: CovenBody } = await import(/* @vite-ignore */ scaffoldBody).catch(() => ({}));

// The coven's page under its context row (M12.33): while a navigation whose
// target is the coven region is on its way, the old coven's page is taken
// away at once and the destination's skeleton, with its one status, stands
// in its place, so nobody acts on the wrong coven's data. A navigation aimed
// elsewhere leaves the page as it is. The skeleton's shape is the
// stylesheet's, so it is not read here.

/** A control that starts a navigation with the given target, as the switcher and section nav do. */
function Go({ name, target }: { name: string; target?: Record<string, string> }) {
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
      <CovenBody>
        <main>
          <ul aria-label="Ingredients">
            <li>Testwort</li>
          </ul>
        </main>
      </CovenBody>
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

describe.skip('CovenBody', () => {
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
