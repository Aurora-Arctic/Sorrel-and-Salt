import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { default: DetailsLink } = await import('@/components/IngredientEntry/details-link');
const { DETAILS_PLACE, detailsHeading } = await import('@/components/IngredientEntry/details');

// An ingredient's name in a list (M12.5): a link to the entry's page, which
// a plain press turns into its details modal over the list, `?entry=`, while
// a new tab, a press before the script loads, or a page with no modal
// provider still reaches the page (claude-docs/components/ingredient-entry.md,
// "The details modal").

const PAGE = '/compendium/ingredients/testwort' as Route;
const DETAILS: Route = '/admin/compendium?entry=testwort';
const heading = detailsHeading({
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'binomial',
});

const link = () => screen.getByRole('link', { name: 'Testwort' });

beforeEach(() => {
  router.push.mockReset();
});

describe('DetailsLink', () => {
  const renderList = () =>
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <DetailsLink href={PAGE} opens={{ href: DETAILS, heading }}>
            Testwort
          </DetailsLink>
          <RouteModal place={DETAILS_PLACE} closeHref="/admin/compendium" />
          <RouteModal closeHref="/admin/compendium" />
        </RouteModalProvider>
      </Navigating>,
    );

  it('links to the entry page, so a new tab or no script still reaches it', () => {
    renderList();

    expect(link()).toHaveAttribute('href', PAGE);
  });

  it('opens the details modal at once on a plain press, in its own place', async () => {
    renderList();

    let handled = true;
    await act(async () => {
      handled = fireEvent.click(link());
    });

    expect(handled).toBe(false);
    expect(router.push).toHaveBeenCalledWith(DETAILS);
    expect(router.push).not.toHaveBeenCalledWith(PAGE);
    // One dialog: the press shows in the details place, not the edit modal's too.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(
      screen.getByRole('dialog', { name: 'Ingredient, Testwort, Fixtura testalis' }),
    ).toBeInTheDocument();
  });

  it('leaves a press with a modifier to the browser', () => {
    renderList();

    expect(fireEvent.click(link(), { metaKey: true })).toBe(true);

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('goes to the entry page outside a modal provider', async () => {
    render(
      <Navigating push={router.push}>
        <DetailsLink href={PAGE} opens={{ href: DETAILS, heading }}>
          Testwort
        </DetailsLink>
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(link());
    });

    expect(router.push).toHaveBeenCalledWith(PAGE);
  });
});
