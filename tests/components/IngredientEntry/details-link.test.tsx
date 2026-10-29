import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { default: DetailsLink } = await import('@/components/IngredientEntry/details-link');
const { DETAILS_PLACE, detailsHeading } = await import('@/components/IngredientEntry/details');

// An entry's Quick Look in a list: the icon beside its name, a link to
// the list's own address with `?entry=`, which a plain press opens at once as
// the details modal over the list, while a new tab or a press before the
// script loads opens that address (claude-docs/components/ingredient-entry.md,
// "The details modal").

const DETAILS: Route = '/admin/compendium?entry=testwort';
const heading = detailsHeading({
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
});

const link = () => screen.getByRole('link', { name: 'Quick Look Testwort, Fixtura testalis' });

beforeEach(() => {
  router.push.mockReset();
});

describe('DetailsLink', () => {
  const renderList = () =>
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <DetailsLink opens={{ href: DETAILS, heading }} name="Testwort, Fixtura testalis" />
          <RouteModal place={DETAILS_PLACE} closeHref="/admin/compendium" />
          <RouteModal closeHref="/admin/compendium" />
        </RouteModalProvider>
      </Navigating>,
    );

  it("is named Quick Look and the entry's name, and links to the list with the details open", () => {
    renderList();

    expect(link()).toHaveAttribute('href', DETAILS);
  });

  it('opens the details modal at once on a plain press, in its own place', async () => {
    renderList();

    let handled = true;
    await act(async () => {
      handled = fireEvent.click(link());
    });

    expect(handled).toBe(false);
    expect(router.push).toHaveBeenCalledWith(DETAILS);
    // One dialog: the press shows in the details place, not the edit modal's too.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Testwort' })).toBeInTheDocument();
  });

  it('leaves a press with a modifier to the browser', () => {
    renderList();

    expect(fireEvent.click(link(), { metaKey: true })).toBe(true);

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
