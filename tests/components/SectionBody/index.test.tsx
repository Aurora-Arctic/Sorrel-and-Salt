import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
// The address the section is showing, set by each test before it renders.
const here = vi.hoisted(() => ({ pathname: '/coven/testwort-circle/ingredients' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => here.pathname,
}));
vi.mock('@/app/skeletons', async () => ({
  skeletons: (await import('../../support/skeleton-registry')).testSkeletons,
}));

const { usePendingNavigation } = await import('@/lib/navigation');
const { default: SectionBody } = await import('@/components/SectionBody');

// A section's page under its context row. While a navigation to another page of the section is on its way, the page is taken
// away at once and the destination's skeleton stands in its place; a coven's host answers only its own coven
// (claude-docs/design-decisions/m11.9-plan.md, Part 1).

/** A control that starts a navigation to `href`, as the switcher and section nav do; or a refresh. */
function Go({ name, href }: { name: string; href?: string }) {
  const { navigate, refresh } = usePendingNavigation();
  return (
    <button type="button" onClick={() => (href ? navigate(href) : refresh())}>
      {name}
    </button>
  );
}

let arrive = () => {};
function arrival() {
  return new Promise<void>((resolve) => {
    arrive = resolve;
  });
}

function renderCoven(controls: Record<string, string | undefined>, push = router.push) {
  here.pathname = '/coven/testwort-circle/ingredients';
  return render(
    <Navigating push={push} arrives={arrival()}>
      {Object.entries(controls).map(([name, href]) => (
        <Go key={name} name={name} href={href} />
      ))}
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

function renderAdmin(controls: Record<string, string>) {
  here.pathname = '/curator/categories';
  return render(
    <Navigating push={router.push} arrives={arrival()}>
      {Object.entries(controls).map(([name, href]) => (
        <Go key={name} name={name} href={href} />
      ))}
      <SectionBody region="admin" className="page-column">
        <main>
          <ul aria-label="Categories">
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

const skeleton = (name: string) => screen.queryByRole('region', { name });
const covenPage = () => screen.queryByRole('list', { name: 'Ingredients' });
const adminPage = () => screen.queryByRole('list', { name: 'Categories' });

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('SectionBody for a coven', () => {
  it('shows its page, and no status, while nothing is on its way', () => {
    renderCoven({ Home: '/coven/testwort-circle' });

    expect(covenPage()).toBeInTheDocument();
    expect(screen.queryAllByRole('region')).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it("takes the page away at once for a page of the same coven, drawing that page's skeleton with one status in a main landmark, until it renders", async () => {
    renderCoven({ Home: '/coven/testwort-circle' });

    await press('Home');

    // Why the swap is the navigation's: it is on its way.
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(covenPage()).not.toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('region', { name: 'Coven home skeleton' })).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    // The page's own landmark went with it; the skeleton keeps the page's one
    // `main`, and its status is the only announcement.
    expect(within(main).getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);

    await act(async () => arrive());

    expect(covenPage()).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // A switch to another coven keeps this host up, so the header and switcher stay usable and busy
  // while the new coven's page is drawn as its skeleton.
  it("takes the page away for another coven's page, drawing its skeleton", async () => {
    renderCoven({ Switch: '/coven/brambleroot-circle/ingredients' });

    await press('Switch');

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(covenPage()).not.toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  // Each is on its way to a page the registry knows, or a different address,
  // so only the host rule keeps this section from drawing.
  it.each([
    ['Leave', '/compendium', "a page drawn in the shell's body"],
    ['Curate', '/curator/forms', "the admin area's page"],
    [
      'Filter',
      '/coven/testwort-circle/ingredients?q=testwort',
      'the same page, whose list draws its own wait',
    ],
    ['Lost', '/coven/testwort-circle/nowhere', 'an address no page answers'],
  ])('leaves the page in place for %s (%s: %s)', async (name, href) => {
    renderCoven({ [name]: href });

    await press(name);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe(href);
    expect(covenPage()).toBeInTheDocument();
    expect(screen.queryAllByRole('region')).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('leaves the page in place for a refresh', async () => {
    renderCoven({ Refresh: undefined }, router.refresh);

    await press('Refresh');

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(covenPage()).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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

    const overlay = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]');

    it('shows the page at once and keeps the skeleton over it, hidden from assistive technology, until the fade is done', async () => {
      const { container } = renderCoven({ Home: '/coven/testwort-circle' });
      await press('Home');
      expect(skeleton('Coven home skeleton')).toBeInTheDocument();

      await act(async () => arrive());

      expect(covenPage()).toBeInTheDocument();
      expect(overlay(container)).not.toBeNull();
      // Nothing of it is announced or reachable as a second region, landmark or status.
      expect(skeleton('Coven home skeleton')).toBeNull();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getAllByRole('main')).toHaveLength(1);
    });
  });
});

// The admin area's body, under its own context row: a move between the pages of
// one area swaps the page and leaves the row standing.
describe('SectionBody for the admin area', () => {
  it("answers a page of the same area by drawing that page's skeleton", async () => {
    renderAdmin({ Forms: '/curator/forms' });

    await press('Forms');

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(adminPage()).not.toBeInTheDocument();
    expect(skeleton('Forms skeleton')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  // The keepers' pages are an admin host's too, but under another layout than this one.
  it.each([
    ['Users', '/keepers/users'],
    ['Coven', '/coven/testwort-circle'],
  ])('leaves the page in place for a page outside this area (%s)', async (name, href) => {
    renderAdmin({ [name]: href });

    await press(name);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(adminPage()).toBeInTheDocument();
    expect(screen.queryAllByRole('region')).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
