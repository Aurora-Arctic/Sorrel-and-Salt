import type { Route } from 'next';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

// The App Router as a component test sees it (tests/support/navigating.tsx).
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { PendingLink, useNavigationState } = await import('@/lib/navigation');
const { default: LinkHint } = await import('@/components/LinkHint');

// The one link the site draws (M12.33): a plain press navigates through the
// shared hook, so the bar and the destination's skeleton follow; a press the
// browser means for a new tab or window is left to the browser.

const MEMBERS = '/coven/fixture-coven/members' as Route;
const COVEN_TABLE = { region: 'coven', shape: 'table' } as const;

let state: { busy: boolean; target?: unknown } | undefined;
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
function renderLink(props: Record<string, unknown> = {}) {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <PendingLink href={MEMBERS} {...props}>
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

describe('PendingLink', () => {
  it('is a link to its address, idle at rest', () => {
    renderLink();

    expect(link()).toHaveAttribute('href', '/coven/fixture-coven/members');
    expect(state?.busy).toBe(false);
  });

  it('answers the press at once: busy while it waits, with the hint inside shown pending', async () => {
    const { container } = render(
      <Navigating push={router.push} arrives={new Promise<void>((resolve) => (arrive = resolve))}>
        <PendingLink href={MEMBERS}>
          Members <LinkHint />
        </PendingLink>
      </Navigating>,
    );
    const members = screen.getByRole('link', { name: 'Members' });
    expect(members).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('.link-hint')).not.toHaveClass('is-pending');

    await act(async () => {
      fireEvent.click(members, { button: 0 });
    });
    expect(members).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.link-hint')).toHaveClass('is-pending');

    await act(async () => arrive());
    expect(members).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('.link-hint')).not.toHaveClass('is-pending');
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
    renderLink({ navigationTarget: COVEN_TABLE });

    await act(async () => {
      fireEvent.click(link(), { button: 0 });
    });

    expect(state).toEqual({ busy: true, target: COVEN_TABLE });
  });

  // Which presses are left to the browser is opensElsewhere's (tests/lib/opens-elsewhere.test.ts);
  // one row proves the link asks it.
  it('leaves a press with Ctrl held to the browser', async () => {
    renderLink();

    let unhandled = false;
    await act(async () => {
      unhandled = fireEvent.click(link(), { ctrlKey: true });
    });

    expect(unhandled).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    expect(state?.busy).toBe(false);
  });
});
