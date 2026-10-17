import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));
// The form is Lane B's and tested on its own: a stub that shows which coven it
// writes to and saves on request, in either way.
vi.mock('@/components/IngredientForm', () => ({
  default: ({
    workspaceId,
    onSaved,
  }: {
    workspaceId: string | null;
    onSaved: (
      saved: { name: string; slug: string; stock?: unknown[] },
      next: 'open' | 'another',
    ) => void;
  }) => (
    <form aria-label="Ingredient Form" data-workspace={workspaceId}>
      <button type="button" onClick={() => onSaved({ name: 'Testwort', slug: 'testwort' }, 'open')}>
        Save Ingredient
      </button>
      <button
        type="button"
        onClick={() =>
          onSaved(
            {
              name: 'Testwort',
              slug: 'testwort',
              stock: [
                { quantityOnHand: 5, unit: 'g', variant: { form: 'Dried' } },
                { quantityOnHand: null, unit: null, variant: { form: 'Fresh' } },
              ],
            },
            'open',
          )
        }
      >
        Save With Jars
      </button>
      <button
        type="button"
        onClick={() => onSaved({ name: 'Testwort', slug: 'testwort' }, 'another')}
      >
        Save & Add Another
      </button>
    </form>
  ),
}));

const { default: AddIngredientButton } =
  await import('@/components/AppShell/add-ingredient-button');

// The shell's one global action (MB.7, M8.16): where it leads follows the
// area the viewer is in.

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
};
const ADMIN: ShellViewer = { ...MEMBER, canCurate: true };
const coven = (slug: string, canWrite = true): ShellWorkspace => ({
  id: `id-${slug}`,
  slug,
  name: slug === 'fixture-coven' ? 'Fixture Coven' : 'Testwort Circle',
  canReadMembers: true,
  canWrite,
});
const FIXTURE = coven('fixture-coven');
const TESTWORT = coven('testwort-circle');
const VIEW_ONLY = coven('testwort-circle', false);

const draw = (viewer: ShellViewer, workspaces: ShellWorkspace[]) =>
  render(<AddIngredientButton viewer={viewer} workspaces={workspaces} />);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }));
const target = () => screen.getByRole('form', { name: 'Ingredient Form' }).dataset.workspace;

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
});

describe('AddIngredientButton', () => {
  it('links a curator on an admin page to the compendium’s add dialog', () => {
    pathname.mockReturnValue('/admin/users');
    draw(ADMIN, [FIXTURE]);

    expect(screen.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
      'href',
      '/admin/compendium?new',
    );
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).toBeNull();
  });

  it('treats a viewer who cannot curate on an admin path as on no coven page', () => {
    pathname.mockReturnValue('/admin/users');
    draw(MEMBER, [FIXTURE]);

    expect(screen.queryByRole('link', { name: 'Add Ingredient' })).toBeNull();
    open();
    expect(target()).toBe('id-fixture-coven');
  });

  it('targets the coven the address names', () => {
    pathname.mockReturnValue('/coven/testwort-circle/ingredients');
    draw(MEMBER, [FIXTURE, TESTWORT]);
    open();

    expect(target()).toBe('id-testwort-circle');
    expect(screen.getByRole('combobox', { name: 'Coven' })).toHaveValue('id-testwort-circle');
  });

  it('targets the only writable coven when the address names none', () => {
    pathname.mockReturnValue('/account');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(target()).toBe('id-fixture-coven');
  });

  it('falls back to the writable coven when the address names a view-only one', () => {
    pathname.mockReturnValue('/coven/testwort-circle');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(screen.getByRole('combobox', { name: 'Coven' })).toHaveValue('id-fixture-coven');
    expect(target()).toBe('id-fixture-coven');
  });

  it('offers a Coven choice among several, the view-only one disabled', () => {
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    const select = within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Coven' });
    expect(within(select).getByRole('option', { name: 'Fixture Coven' })).toBeEnabled();
    expect(within(select).getByRole('option', { name: 'Testwort Circle' })).toBeDisabled();
  });

  it('writes to the coven chosen, remounting the form', () => {
    draw(MEMBER, [FIXTURE, TESTWORT]);
    open();

    fireEvent.change(screen.getByRole('combobox', { name: 'Coven' }), {
      target: { value: 'id-testwort-circle' },
    });

    expect(target()).toBe('id-testwort-circle');
  });

  it('offers no Coven choice to a viewer of one coven', () => {
    draw(MEMBER, [FIXTURE]);
    open();

    expect(screen.queryByRole('combobox', { name: 'Coven' })).toBeNull();
  });

  it('renders nothing when no coven can be written to', () => {
    const { container } = draw(MEMBER, [VIEW_ONLY]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unverified viewer', () => {
    const { container } = draw({ ...MEMBER, verified: false }, [FIXTURE]);

    expect(container).toBeEmptyDOMElement();
  });

  it('closes the dialog after Save Ingredient and leaves a status behind', async () => {
    draw(MEMBER, [FIXTURE]);
    open();
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('names the jars that came with the new entry in its status', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save With Jars' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent(/Dried.*Fresh/);
  });

  it('keeps the dialog open after Save & Add Another', () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
