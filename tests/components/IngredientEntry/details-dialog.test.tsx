import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
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
    expect(within(dialog()).getByRole('link', { name: 'View Page' })).toHaveAttribute('href', PAGE);
    // Edit is offered only when the page gives one.
    expect(within(dialog()).queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument();
    // Only to read, with its links in the header: the body takes its own Tab stop.
    expect(within(dialog()).getByText('A summary').parentElement!.tabIndex).toBe(0);
  });

  it('puts View Page after the summary and outside the body that scrolls', () => {
    render(
      <DetailsDialog
        closeHref={LIST}
        opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE, children: <p>A summary</p> }}
      />,
    );

    const open = within(dialog()).getByRole('link', { name: 'View Page' });
    const summary = within(dialog()).getByText('A summary');
    // Why it could be inside: it was the body's last child, held at the foot by position: sticky,
    // so the body's scrollbar ran down past it. It is the modal's own foot now, under the body.
    const body = summary.closest('.modal-dialog__body');
    expect(body).not.toBeNull();
    expect(body).not.toContainElement(open);
    expect(open.closest('.modal-dialog__header')).toBeNull();
    expect(summary.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("goes to the entry's page on a press of View Page, as the site's link does", async () => {
    render(
      <Navigating push={router.push}>
        <DetailsDialog
          closeHref={LIST}
          opened={{ heading: detailsHeading(ENTRY), pageHref: PAGE, children: <p>A summary</p> }}
        />
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole('link', { name: 'View Page' }));
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
    // The cards' pencil, named for the entry, with its tip.
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
    expect(edit).toHaveAttribute('href', EDIT);
    fireEvent.mouseEnter(edit);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Edit');
    fireEvent.mouseLeave(edit);

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
    const show = (
      more: Record<string, unknown> = {},
      editAction?: { href: Route; heading: ReturnType<typeof editHeading> },
    ) =>
      render(
        <Navigating push={router.push}>
          <RouteModalProvider>
            <DetailsDialog
              closeHref={LIST}
              opened={{
                heading: detailsHeading(ENTRY),
                pageHref: PAGE,
                marks: marks(more),
                ...(editAction && { editAction }),
              }}
            />
          </RouteModalProvider>
        </Navigating>,
      );
    const follows = (first: Node, second: Node) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('shows Toxic alone for an entry that is both cautioned and toxic', () => {
      show({ toxic: true, safetyNotes: 'Keep from children.' });

      expect(within(dialog()).getByText('Toxic')).toBeInTheDocument();
      expect(within(dialog()).queryByText('Caution')).not.toBeInTheDocument();
    });

    it('shows Caution for notes alone, and no safety badge for neither', () => {
      const { unmount } = show({ safetyNotes: 'Keep from children.' });
      expect(within(dialog()).getByText('Caution')).toBeInTheDocument();
      unmount();

      show();
      expect(within(dialog()).queryByText('Caution')).not.toBeInTheDocument();
      expect(within(dialog()).queryByText('Toxic')).not.toBeInTheDocument();
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

    it('puts the formal name after the name, and New before the badges', () => {
      show({ kind: 'own', recency: 'new' });

      const name = within(dialog()).getByRole('heading', { name: /^Testwort/ });
      const formal = within(dialog()).getByText('Fixtura testalis');
      expect(follows(name, formal)).toBe(true);
      // Not inside the heading, so the heading stays the entry name alone.
      expect(name).not.toContainElement(formal);
      expect(follows(formal, within(dialog()).getByText('New'))).toBe(true);
      expect(follows(within(dialog()).getByText('New'), within(dialog()).getByText('Local'))).toBe(
        true,
      );
    });

    it('puts the safety badge beside the name and the Edit pencil after it', () => {
      show({ toxic: true }, { href: EDIT, heading: editHeading(ENTRY) });

      const name = within(dialog()).getByRole('heading', { name: /^Testwort/ });
      const badge = within(dialog()).getByText('Toxic');
      const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
      expect(follows(name, badge)).toBe(true);
      expect(follows(badge, edit)).toBe(true);
      // The pencil is in the header with the name, not down in the scrolling body.
      expect(edit.closest('.modal-dialog__header')).not.toBeNull();
    });

    it('keeps the pencil at the name line with no safety badge and no formal name', () => {
      render(
        <Navigating push={router.push}>
          <RouteModalProvider>
            <DetailsDialog
              closeHref={LIST}
              opened={{
                heading: detailsHeading({
                  name: 'Testwort',
                  canonicalName: null,
                  nomenclature: 'none',
                }),
                pageHref: PAGE,
                marks: marks(),
                editAction: { href: EDIT, heading: editHeading(ENTRY) },
              }}
            />
          </RouteModalProvider>
        </Navigating>,
      );

      const dlg = screen.getByRole('dialog', { name: 'Ingredient, Testwort' });
      const name = within(dlg).getByRole('heading', { name: /^Testwort/ });
      const edit = within(dlg).getByRole('link', { name: 'Edit Testwort' });
      expect(follows(name, edit)).toBe(true);
      expect(edit.closest('.modal-dialog__header')).not.toBeNull();
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

    const add = within(dialog()).getByRole('button', { name: 'Add to My Ingredients' });
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
    expect(before(add, edit)).toBe(true);
    // Why it could be the check: one coven already holds it, but not both.
    expect(within(dialog()).queryByRole('img', { name: 'In My Ingredients' })).toBeNull();
  });

  it("shows the card's check in the plus's place once every coven that may add holds it", () => {
    show({ covens: [ONE, TWO], heldIn: [ONE.id, TWO.id] });

    const held = within(dialog()).getByRole('img', { name: 'In My Ingredients' });
    const edit = within(dialog()).getByRole('link', { name: 'Edit Testwort' });
    expect(before(held, edit)).toBe(true);
    expect(within(dialog()).queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
  });

  it('shows neither where the page gave no plus, the pencil alone', () => {
    show();

    // Why neither could show: the page would have given one for a viewer who may add.
    expect(within(dialog()).getByRole('link', { name: 'Edit Testwort' })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
    expect(within(dialog()).queryByRole('img', { name: 'In My Ingredients' })).toBeNull();
  });
});
