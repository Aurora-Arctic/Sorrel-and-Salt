import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

// Add Ingredient opens its dialog frame, named and holding a loading status, before the form inside
// it arrives, so a press answers at once on a slow device; the form's code loads on first open
// (claude-docs/components/modal.md, "Add Ingredient"). Focus and Escape behave as they did when the
// form came with the frame.

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn() }),
}));
// The form is tested on its own: a stand-in with a first field to take the focus.
vi.mock('@/components/IngredientForm', () => ({
  default: () => (
    <form aria-label="Ingredient Form">
      <label>
        Name <input name="name" />
      </label>
    </form>
  ),
}));

const { default: AddIngredientButton } =
  await import('@/components/AppShell/add-ingredient-button');

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
  assignedSupport: 0,
  waitingSupport: 0,
};
const FIXTURE: ShellWorkspace = {
  id: 'id-fixture-coven',
  slug: 'fixture-coven',
  name: 'Fixture Coven',
  canReadMembers: true,
  canInvite: false,
  canWrite: true,
  paused: null,
};
const DIALOG = 'Add Ingredient to Fixture Coven';

let sync = () => {};
const draw = () => {
  const view = render(<AddIngredientButton viewer={MEMBER} workspaces={[FIXTURE]} />);
  sync = () => view.rerender(<AddIngredientButton viewer={MEMBER} workspaces={[FIXTURE]} />);
};
// The dialog opens by `?new` through the history API, which the test follows by drawing again.
const open = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }));
  sync();
};

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  window.history.replaceState(null, '', '/coven/fixture-coven');
});

describe('AddIngredientButton opening its dialog', () => {
  it('shows the named frame over a loading status first, then the form, the focus on its first field', async () => {
    draw();
    open();

    const dialog = screen.getByRole('dialog', { name: DIALOG });
    expect(within(dialog).getByRole('status')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: 'Name' })).toBeNull();

    const name = await within(dialog).findByRole('textbox', { name: 'Name' });
    // The same dialog, filled: the frame was not drawn again around the form.
    expect(screen.getByRole('dialog', { name: DIALOG })).toBe(dialog);
    expect(within(dialog).queryByRole('status')).toBeNull();
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('closes on Escape while the form is still on its way, the focus back on Add Ingredient', async () => {
    draw();
    open();
    const dialog = screen.getByRole('dialog', { name: DIALOG });
    // Why the close could have waited on the form: it has not arrived.
    expect(within(dialog).getByRole('status')).toBeInTheDocument();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => {
      sync();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(window.location.search).toBe('');
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toHaveFocus();
  });

  it('closes on Escape once the form has arrived, the focus back on Add Ingredient', async () => {
    draw();
    open();
    const dialog = screen.getByRole('dialog', { name: DIALOG });
    await within(dialog).findByRole('textbox', { name: 'Name' });

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => {
      sync();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(window.location.search).toBe('');
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toHaveFocus();
  });
});
