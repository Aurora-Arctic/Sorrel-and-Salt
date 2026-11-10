import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it } from 'vitest';
import { Navigating } from '../../support/navigating';
import { router } from '../../support/next-navigation';

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { default: DetailsLink } = await import('@/components/IngredientEntry/details-link');
const { DETAILS_PLACE, detailsHeading } = await import('@/components/IngredientEntry/details');

// claude-docs/components/ingredient-entry.md, "The details modal"

const DETAILS: Route = '/curator/compendium?entry=testwort';
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
          <RouteModal place={DETAILS_PLACE} closeHref="/curator/compendium" />
          <RouteModal closeHref="/curator/compendium" />
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
    expect(router.push).toHaveBeenCalledWith(DETAILS, { scroll: false });
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
