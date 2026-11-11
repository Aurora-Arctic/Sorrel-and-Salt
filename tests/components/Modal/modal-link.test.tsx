import type { Route } from 'next';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';
import { router } from '../../support/next-navigation';

// The App Router as a component test sees it (tests/support/navigating.tsx).
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => '/here',
}));

const { ModalLink } = await import('@/components/Modal');
const { useNavigationState } = await import('@/lib/navigation');

// A link that opens a route modal over the page it is on. The modal is a server render away, so a press
// answers at once, as every in-app link does: the link is busy, the site-wide wait carries its address,
// and the page keeps its scroll, since the modal opens over it.

const DETAILS = '/coven/fixture-coven/ingredients?details=testwort' as Route;

let state: { busy: boolean; href?: string } | undefined;
function Probe() {
  const current = useNavigationState();
  // Read from committed renders only: a transition that suspends re-runs
  // component bodies with the optimistic value already put back.
  useEffect(() => {
    state = current;
  });
  return null;
}

let arrive = () => {};

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
  state = undefined;
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('ModalLink', () => {
  it('navigates through the shared wait on a plain press, busy until the modal arrives, keeping the scroll', async () => {
    const arrives = new Promise<void>((resolve) => (arrive = resolve));
    render(
      <Navigating push={router.push} arrives={arrives}>
        <ModalLink href={DETAILS}>Testwort</ModalLink>
        <Probe />
      </Navigating>,
    );
    const link = screen.getByRole('link', { name: 'Testwort' });
    // Precondition: at rest the link and the site are idle.
    expect(link).not.toHaveAttribute('aria-busy');
    expect(state?.busy).toBe(false);

    let unhandled = true;
    await act(async () => {
      unhandled = fireEvent.click(link, { button: 0 });
    });

    // The link took the press: the browser does not also load the address.
    expect(unhandled).toBe(false);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe(DETAILS);
    expect(router.push.mock.calls[0]?.[1]).toMatchObject({ scroll: false });
    expect(link).toHaveAttribute('aria-busy', 'true');
    expect(state).toEqual({ busy: true, href: DETAILS });

    await act(async () => arrive());

    expect(link).not.toHaveAttribute('aria-busy');
    expect(state?.busy).toBe(false);
  });
});
