import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

// The App Router as a component test sees it (tests/support/navigating.tsx).
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

// M12.33 scaffold: lane A builds `@/lib/navigation`. Until it does, the module is
// loaded by a specifier neither the type checker nor Vite resolves, so this
// file compiles and its suites are skipped. That lane makes the import a
// plain `await import('…')` of the path below and unskips every
// `describe.skip` here (grep "M12.33 scaffold").
const scaffold: string = '@/lib/navigation';
const { PendingLink, useNavigationState } = await import(/* @vite-ignore */ scaffold).catch(
  () => ({}),
);

// The one link the site draws (M12.33): a plain press navigates through the
// shared hook, so the bar and the destination's skeleton follow; a press the
// browser means for a new tab or window is left to the browser.

const COVEN_TABLE = { region: 'coven', shape: 'table' } as const;

let state: { busy: boolean; target?: unknown } | undefined;
function Probe() {
  state = useNavigationState();
  return null;
}

let arrive = () => {};
function renderLink(props: Record<string, unknown> = {}) {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <PendingLink href="/coven/fixture-coven/members" {...props}>
        Members
      </PendingLink>
      <Probe />
    </Navigating>,
  );
}

const link = () => screen.getByRole('link', { name: 'Members' });

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
  state = undefined;
});

afterEach(async () => {
  await act(async () => arrive());
});

describe.skip('PendingLink', () => {
  it('is a link to its address, idle at rest', () => {
    renderLink();

    expect(link()).toHaveAttribute('href', '/coven/fixture-coven/members');
    expect(state?.busy).toBe(false);
  });

  it('navigates through the shared hook on a plain press, so the page is busy', async () => {
    renderLink();

    let unhandled = true;
    await act(async () => {
      unhandled = fireEvent.click(link(), { button: 0 });
    });

    // The link took the press: the browser does not also load the address.
    expect(unhandled).toBe(false);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe('/coven/fixture-coven/members');
    expect(state?.busy).toBe(true);

    await act(async () => arrive());

    expect(state?.busy).toBe(false);
  });

  it('carries the navigation target it is given into the site-wide state', async () => {
    renderLink({ target: COVEN_TABLE });

    await act(async () => {
      fireEvent.click(link(), { button: 0 });
    });

    expect(state).toEqual({ busy: true, target: COVEN_TABLE });
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
    ['shiftKey', { shiftKey: true }],
    ['the middle button', { button: 1 }],
  ] as const)('leaves a press with %s to the browser', async (_, init) => {
    renderLink();

    let unhandled = false;
    await act(async () => {
      unhandled = fireEvent.click(link(), init);
    });

    expect(unhandled).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    expect(state?.busy).toBe(false);
  });
});
