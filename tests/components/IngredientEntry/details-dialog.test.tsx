import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DeleteOwnIngredientMutation,
  DeleteOwnIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { RouteModal, RouteModalProvider } = await import('@/components/Modal');
const { default: DetailsDialog } = await import('@/components/IngredientEntry/details-dialog');
const { detailsHeading } = await import('@/components/IngredientEntry/details');
const { editHeading } = await import('@/components/CompendiumList/heading');
const { covenCardActions } = await import('@/components/CovenCards/actions');

// The details modal over a list (M12.5): a summary of the entry, a way through
// to its full page, and, for whoever may edit it, an Edit that opens the edit
// modal over it (claude-docs/components/ingredient-entry.md, "The details
// modal").

const LIST: Route = '/admin/compendium';
const PAGE = '/compendium/ingredients/testwort' as Route;
const EDIT: Route = '/admin/compendium?entry=testwort&edit=testwort';
const ENTRY = {
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
};
const DETAILS_NAME = 'Testwort';

const dialog = () => screen.getByRole('dialog', { name: DETAILS_NAME });

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

describe('DetailsDialog', () => {
  it('draws the latest edit in the window when given one, and none when not', () => {
    const { unmount } = render(
      <DetailsDialog
        closeHref={LIST}
        opened={{
          heading: detailsHeading(ENTRY),
          pageHref: PAGE,
          lastEdit: { by: 'Fixture A', at: '2026-09-01T10:30:00.000Z' },
        }}
      />,
    );
    expect(within(dialog()).getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      /Fixture A/,
    );
    unmount();

    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE }}
      />,
    );
    expect(within(dialog()).queryByRole('button', { name: /^Edited/ })).not.toBeInTheDocument();
  });

  it('draws the Reviewed badge once: the marks leave it out beside a review row', () => {
    const marks = { kind: 'compendium' as const, reviewedAt: '2026-10-01T09:30:00.000Z' };
    const { unmount } = render(
      <DetailsDialog
        closeHref={LIST}
        opened={{
          heading: detailsHeading(ENTRY),
          pageHref: PAGE,
          marks,
          reviewLine: <p>Review row</p>,
        }}
      />,
    );
    expect(within(dialog()).queryByText(/Reviewed By Curator/)).not.toBeInTheDocument();
    unmount();

    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE, marks }}
      />,
    );
    expect(within(dialog()).getByText(/Reviewed By Curator/)).toBeInTheDocument();
  });

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
    expect(within(dialog()).getByRole('link', { name: 'See in Compendium' })).toHaveAttribute(
      'href',
      PAGE,
    );
    // Edit is offered only when the page gives one.
    expect(within(dialog()).queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument();
    // Only to read, with its links in the header: the body takes its own Tab stop.
    expect(within(dialog()).getByText('A summary').parentElement!.tabIndex).toBe(0);
  });

  it.each([
    [{ canonicalName: null, nomenclature: 'none' as const }, 'None', 'Formal Name'],
    [
      { canonicalName: null, nomenclature: 'botanical' as const },
      'Not yet looked up',
      'Botanical Name',
    ],
    [
      { canonicalName: 'Testium', nomenclature: 'unknown' as const },
      '(unconfirmed)',
      'Formal Name',
    ],
  ])(
    "draws the page's formal name over the title with its states, and its tip (%j)",
    (formal, said, label) => {
      render(
        <DetailsDialog
          closeHref={LIST}
          opened={{ heading: detailsHeading({ name: 'Testwort', ...formal }), pageHref: PAGE }}
        />,
      );

      const dlg = screen.getByRole('dialog', { name: 'Testwort' });
      expect(within(dlg).getByText(said, { exact: false })).toBeInTheDocument();
      // A tip says what the name is, the term being read by a screen reader only.
      expect(within(dlg).getByRole('button', { name: `About ${label}` })).toBeInTheDocument();
      // No kicker: the title is the dialog's first heading, and nothing says "Ingredient".
      expect(within(dlg).queryByText('Ingredient')).not.toBeInTheDocument();
    },
  );

  it("names the link for where it goes: the compendium's page, or the coven's own", () => {
    const COVEN_PAGE = '/coven/fixture-coven/ingredients/a1' as Route;
    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{
          heading: detailsHeading(ENTRY),
          pageHref: COVEN_PAGE,
          children: <p>A summary</p>,
        }}
      />,
    );

    const link = within(dialog()).getByRole('link', { name: 'See in Your Cupboard' });
    expect(link).toHaveAttribute('href', COVEN_PAGE);
    expect(
      within(dialog()).queryByRole('link', { name: 'See in Compendium' }),
    ).not.toBeInTheDocument();
  });

  it("goes to the entry's page on a press of See in Compendium, as the site's link does", async () => {
    render(
      <Navigating push={router.push}>
        <DetailsDialog
          closeHref={LIST}
          opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE, children: <p>A summary</p> }}
        />
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole('link', { name: 'See in Compendium' }));
    });

    expect(router.push).toHaveBeenCalledWith(PAGE);
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
    // The cards' pencil, named for the entry; IconTip's own tests own its tip.
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
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

  // The head (the owner's calls, 2026-10-20): the entry's badges are the card's and the
  // entry page's own components, the safety badge beside the name, the formal name on its
  // own line below it, the other badges in a row under that, and the Edit pencil last of
  // what stands beside the name.
  describe('head', () => {
    const marks = (more: Record<string, unknown> = {}) => ({
      kind: 'compendium' as const,
      inCoven: true,
      ...more,
    });
    const show = (more: Record<string, unknown> = {}) =>
      render(
        <Navigating push={router.push}>
          <RouteModalProvider>
            <DetailsDialog
              closeHref={LIST}
              opened={{
                heading: detailsHeading(ENTRY),
                pageHref: PAGE,
                marks: marks(more),
              }}
            />
          </RouteModalProvider>
        </Navigating>,
      );

    it('shows Toxic alone for an entry that is both cautioned and toxic', () => {
      show({ toxic: true, safetyNotes: 'Keep from children.' });

      expect(within(dialog()).getByText('Toxic')).toBeInTheDocument();
      expect(within(dialog()).queryByText('Caution')).not.toBeInTheDocument();
    });

    it('draws the provenance badges the entry page does', () => {
      const { unmount } = show({ kind: 'own' });
      expect(within(dialog()).getByText('Local')).toBeInTheDocument();
      unmount();

      const held = show({ kind: 'cupboard' });
      expect(within(dialog()).getByText('Compendium')).toBeInTheDocument();
      held.unmount();

      const annotated = show({ kind: 'cupboard', annotated: true });
      expect(within(dialog()).getByRole('button', { name: 'Annotated' })).toBeInTheDocument();
      annotated.unmount();

      show({ kind: 'cupboard', retired: true });
      expect(within(dialog()).getByRole('button', { name: 'Retired' })).toBeInTheDocument();
    });
  });
});

// The plus beside the pencil, and the check once every coven the viewer may add in holds the
// entry (M9.12; the owner's calls, 2026-10-20), as the entry page has them.
describe('DetailsDialog plus', () => {
  const ID = '00000000-0000-4000-8000-0000000000aa';
  const ONE = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
  const TWO = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };

  const show = (plus?: { covens: (typeof ONE)[]; heldIn: string[] }) =>
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <Navigating push={router.push}>
          <RouteModalProvider>
            <DetailsDialog
              closeHref={LIST}
              opened={{
                heading: detailsHeading(ENTRY),
                pageHref: PAGE,
                editAction: { href: EDIT, heading: editHeading(ENTRY) },
                ...(plus && { plus: { workspaceId: ONE.id, ...plus }, ingredientId: ID }),
              }}
            />
          </RouteModalProvider>
        </Navigating>
      </QueryClientProvider>,
    );
  const before = (first: Node, second: Node) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('puts the plus before the pencil while a coven that may add lacks the entry', () => {
    show({ covens: [ONE, TWO], heldIn: [ONE.id] });

    const add = within(dialog()).getByRole('button', { name: /^Add to My Ingredients: / });
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
    expect(before(add, edit)).toBe(true);
    // Why it could be the check: one coven already holds it, but not both.
    expect(within(dialog()).queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
  });

  it("shows the card's check in the plus's place once every coven that may add holds it", () => {
    show({ covens: [ONE, TWO], heldIn: [ONE.id, TWO.id] });

    const held = within(dialog()).getByRole('button', { name: /^In Every Cupboard: / });
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
    expect(before(held, edit)).toBe(true);
    expect(within(dialog()).queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
  });

  it('shows neither where the page gave no plus, the pencil alone', () => {
    show();

    // Why neither could show: the page would have given one for a viewer who may add.
    expect(within(dialog()).getByRole('link', { name: 'Edit Testwort' })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
  });
});

// The window opened from a compendium card follows it (the owner's call, 2026-10-20): the pencil
// is Edit in Compendium, and the page's three dots come last, after the plus and the pencil.
describe('DetailsDialog from a compendium card', () => {
  const show = (inCompendium: boolean) =>
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <DetailsDialog
            closeHref={LIST}
            opened={{
              heading: detailsHeading(ENTRY),
              pageHref: PAGE,
              editAction: { href: EDIT, heading: editHeading(ENTRY), inCompendium },
              more: <button type="button">More for Testwort</button>,
            }}
          />
        </RouteModalProvider>
      </Navigating>,
    );

  it('names the pencil Edit in Compendium and puts the dots after it', () => {
    show(true);
    const edit = within(dialog()).getByRole('link', { name: 'Edit in Compendium Testwort' });
    const more = within(dialog()).getByRole('button', { name: 'More for Testwort' });
    expect(Boolean(edit.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );
    // Why the name is the compendium's: the same props without the flag name a plain Edit.
    expect(within(dialog()).queryByRole('link', { name: 'Edit Testwort' })).toBeNull();
  });

  it('names the pencil a plain Edit where the window is not the compendium card', () => {
    show(false);
    expect(within(dialog()).getByRole('link', { name: 'Edit Testwort' })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('link', { name: /^Edit in Compendium/ })).toBeNull();
  });
});

// The window's icons are the coven card's, drawn by the same `covenCardActions` the list's cards
// use (the owner's call, 2026-10-20), so what the card shows for this entry and role is what the
// window shows: Edit and the bin on the coven's own entry, Annotate and More on a compendium
// entry the cupboard holds.
describe('DetailsDialog coven card controls', () => {
  const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
  const ID = '00000000-0000-4000-8000-0000000000bb';
  const COVEN_LIST = '/coven/fixture-coven/ingredients' as Route;
  const OWN_EDIT = `${COVEN_LIST}?entry=${ID}&edit=${ID}` as Route;
  const ANNOTATE = `${COVEN_LIST}?annotate=${ID}` as Route;
  const CARD_NAME = 'Testwort, Fixtura testalis';
  const entry = { id: ID, label: ENTRY.name, canonicalName: ENTRY.canonicalName };

  const view = (opened: boolean, extra: object) => (
    <QueryClientProvider client={makeQueryClient()}>
      <Navigating push={router.push}>
        <RouteModalProvider>
          <DetailsDialog
            closeHref={COVEN_LIST}
            opened={
              opened ? { heading: detailsHeading(ENTRY), pageHref: PAGE, ...extra } : undefined
            }
          />
        </RouteModalProvider>
      </Navigating>
    </QueryClientProvider>
  );
  const actions = (fields: object) =>
    covenCardActions({ ...entry, ...fields }, WORKSPACE_ID, 'fixture-coven', COVEN_LIST);

  it("draws Edit at its address and the Delete Ingredient bin for a coven's own entry, and no menu", () => {
    render(
      view(true, {
        actions: actions({
          editHref: OWN_EDIT,
          editHeading: editHeading(ENTRY),
          mayDelete: true,
        }),
      }),
    );

    expect(within(dialog()).getByRole('link', { name: `Edit ${CARD_NAME}` })).toHaveAttribute(
      'href',
      OWN_EDIT,
    );
    expect(
      within(dialog()).getByRole('button', { name: `Delete Ingredient ${CARD_NAME}` }),
    ).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: /^More/ })).toBeNull();
  });

  it('draws Annotate and More, holding Make It Ours and Remove, for a held compendium entry', () => {
    render(
      view(true, {
        actions: actions({ annotateHref: ANNOTATE, mayMakeOurs: true, mayRemove: true }),
      }),
    );

    expect(within(dialog()).getByRole('link', { name: `Annotate ${CARD_NAME}` })).toHaveAttribute(
      'href',
      ANNOTATE,
    );
    expect(within(dialog()).queryByRole('link', { name: /^Edit/ })).toBeNull();
    fireEvent.click(within(dialog()).getByRole('button', { name: `More for ${CARD_NAME}` }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Make It Ours', 'Remove']);
  });

  it('draws nothing for a role that may do nothing to the entry', () => {
    render(view(true, { actions: actions({}) }));

    // Why something could show: the entry is the coven's, with its card's name.
    expect(within(dialog()).getByRole('heading', { name: /^Testwort/ })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('link', { name: /^(Edit|Annotate)/ })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: /^(Delete|Remove|More)/ })).toBeNull();
  });

  it("names a compendium list's Edit as its card does, with the formal name", () => {
    render(
      view(true, {
        editAction: { href: EDIT, name: CARD_NAME, heading: editHeading(ENTRY) },
      }),
    );

    expect(within(dialog()).getByRole('link', { name: `Edit ${CARD_NAME}` })).toBeInTheDocument();
  });

  it('offers no Edit at all where the page gave neither', () => {
    render(view(true, {}));

    expect(within(dialog()).queryByRole('link', { name: /^Edit/ })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: /^Edit/ })).toBeNull();
  });

  it('deletes after asking, and leads to the list without the details, which closes them', async () => {
    const calls: DeleteOwnIngredientMutationVariables[] = [];
    mockGraphQLMutation<DeleteOwnIngredientMutation, DeleteOwnIngredientMutationVariables>(
      'DeleteOwnIngredient',
      (variables) => {
        calls.push(variables);
        return { deleteIngredient: String(variables.id) };
      },
    );
    const { rerender } = render(
      view(true, {
        actions: actions({ editHref: OWN_EDIT, editHeading: editHeading(ENTRY), mayDelete: true }),
      }),
    );

    press(within(dialog()).getByRole('button', { name: `Delete Ingredient ${CARD_NAME}` }));
    const ask = screen.getByRole('dialog', { name: 'Delete Ingredient' });
    // Asked first: nothing is deleted until it is confirmed.
    expect(calls).toEqual([]);
    press(within(ask).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(COVEN_LIST));
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    // The list's address no longer names the entry, so the page opens no details.
    rerender(view(false, {}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
