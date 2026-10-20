import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { default: DetailsDialog } = await import('@/components/IngredientEntry/details-dialog');
const { detailsHeading } = await import('@/components/IngredientEntry/details');
const { editHeading } = await import('@/components/CompendiumList/heading');

// The details modal over a list (M12.5): a summary of the entry, a way through
// to its full page, and, for whoever may edit it, an Edit that opens the edit
// modal over it (claude-docs/components/ingredient-entry.md, "The details
// modal").

const LIST: Route = '/admin/compendium';
const PAGE = '/compendium/ingredients/testwort' as Route;
const EDIT: Route = '/admin/compendium?entry=testwort&edit=testwort';
const ENTRY = { name: 'Testwort', canonicalName: 'Fixtura testalis', nomenclature: 'binomial' };
const DETAILS_NAME = 'Ingredient, Testwort, Fixtura testalis';

const dialog = () => screen.getByRole('dialog', { name: DETAILS_NAME });

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

describe('DetailsDialog', () => {
  it('opens nothing while its address asks for nothing', () => {
    render(<DetailsDialog closeHref={LIST} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("shows the entry's summary under its name, with a link to its full page", () => {
    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE, children: <p>A summary</p> }}
      />,
    );

    expect(within(dialog()).getByText('A summary')).toBeInTheDocument();
    expect(within(dialog()).getByRole('link', { name: 'Open Full Page' })).toHaveAttribute(
      'href',
      PAGE,
    );
    // Edit is offered only when the page gives one.
    expect(within(dialog()).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('closes back to the list it opened over', async () => {
    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE }}
      />,
    );

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));
    });

    expect(router.replace).toHaveBeenCalledWith(LIST);
  });

  it('opens the edit modal at once over the details on a press of Edit, in the edit place', async () => {
    const editing = editHeading(ENTRY);
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <DetailsDialog
            closeHref={LIST}
            opened={{
              heading: detailsHeading(ENTRY),
              pageHref: PAGE,
              editAction: { href: EDIT, heading: editing },
            }}
          />
          <RouteModal closeHref={LIST} />
        </RouteModalProvider>
      </Navigating>,
    );
    const edit = within(dialog()).getByRole('link', { name: 'Edit' });
    expect(edit).toHaveAttribute('href', EDIT);

    await act(async () => {
      fireEvent.click(edit);
    });

    expect(router.push).toHaveBeenCalledWith(EDIT);
    // The details stay open beneath the edit modal's skeleton.
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(
      screen.getByRole('dialog', { name: 'Edit Ingredient, Testwort, Fixtura testalis' }),
    ).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
  });
});
