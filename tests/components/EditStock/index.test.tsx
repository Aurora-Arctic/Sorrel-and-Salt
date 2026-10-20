import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditStock from '@/components/EditStock';
import type { EditStockJar } from '@/components/EditStock/types';
import type { UpdateStockMutation, UpdateStockMutationVariables } from '@/gql/graphql';
import { choose, press, typeIn } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The Edit Stock dialog on a jar line (M9.9): the jar's three amounts in a
// dialog, saved as `updateStock`. The service is the guard and is tested
// there; this proves what the dialog sends, when it lets Save through, and
// what it leaves behind on a refusal (claude-docs/components/edit-stock.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const JAR: EditStockJar = {
  id: '00000000-0000-0000-0000-0000000000j1',
  ingredient: 'Rosemary',
  form: 'oil',
  quantity: 250,
  unit: 'ml',
  threshold: 30,
};

beforeEach(() => {
  router.refresh.mockClear();
});

const trigger = () => screen.getByRole('button', { name: 'Edit Stock, Rosemary, Oil' });
const dialog = () => screen.getByRole('dialog', { name: 'Edit Stock, Rosemary, Oil' });
const quantity = () => within(dialog()).getByRole('spinbutton', { name: 'Quantity' });
const threshold = () => within(dialog()).getByRole('spinbutton', { name: 'Low Stock At' });
const unit = () => within(dialog()).getByRole('combobox', { name: 'Unit' });
const save = () => within(dialog()).getByRole('button', { name: /^Sav(e|ing) Stock$/ });

function open(jar: EditStockJar = JAR) {
  render(<EditStock workspaceId={WORKSPACE} jar={jar} />);
  fireEvent.click(trigger());
}

/** Answers as the service does for a saved jar, counting what the dialog sent. */
function mockSaving() {
  const calls: UpdateStockMutationVariables[] = [];
  mockGraphQLMutation<UpdateStockMutation, UpdateStockMutationVariables>(
    'UpdateStock',
    (variables) => {
      calls.push(variables);
      return { updateStock: { id: String(variables.id) } };
    },
  );
  return calls;
}

describe('EditStock', () => {
  it('is a button named for its jar, shut until pressed, that opens the dialog named the same', async () => {
    render(<EditStock workspaceId={WORKSPACE} jar={JAR} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger());

    expect(dialog()).toBeInTheDocument();
    // The focus goes in, to the first field.
    await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));
  });

  it('opens on the jar as it is', () => {
    open();

    expect(quantity()).toHaveValue(250);
    expect(unit()).toHaveTextContent('ml');
    expect(threshold()).toHaveValue(30);
  });

  it('keeps Save off until something has changed, and off again when it is changed back', () => {
    open();
    expect(save()).toBeDisabled();

    typeIn(quantity(), '200');
    expect(save()).toBeEnabled();

    typeIn(quantity(), '250');
    expect(save()).toBeDisabled();
  });

  it('sends the jar and the three amounts as numbers, and says nothing of the other fields', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity(), '200.5');
    press(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      workspaceId: WORKSPACE,
      id: JAR.id,
      input: { quantityOnHand: 200.5, unit: 'ml', lowStockThreshold: 30 },
    });
  });

  it('sends a changed unit with the numbers as typed: nothing converts', async () => {
    const calls = mockSaving();
    open();

    choose('Unit', 'l');
    press(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toEqual({ quantityOnHand: 250, unit: 'l', lowStockThreshold: 30 });
  });

  it('sends an emptied box as null, which clears it, and a zero as zero', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity(), '');
    typeIn(threshold(), '0');
    press(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toEqual({ quantityOnHand: null, unit: 'ml', lowStockThreshold: 0 });
  });

  it('closes after a save, gives the focus back to the button and refreshes the page behind it', async () => {
    mockSaving();
    open();

    typeIn(quantity(), '200');
    press(save());

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(trigger()).toHaveFocus();
  });

  it('shows Save busy while the save is in flight, and neither closes nor refreshes before it answers', async () => {
    let answer: () => void = () => {};
    const answered = new Promise<void>((resolve) => (answer = resolve));
    server.use(
      graphqlLink.mutation('UpdateStock', async () => {
        await answered;
        return HttpResponse.json({ data: { updateStock: { id: JAR.id } } });
      }),
    );
    open();

    typeIn(quantity(), '200');
    press(save());

    await waitFor(() => expect(save()).toHaveAttribute('aria-busy', 'true'));
    expect(save()).toBeDisabled();
    expect(dialog()).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();

    answer();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says a refusal in an alert, keeps what was typed and refreshes nothing', async () => {
    mockGraphQLError('UpdateStock', {
      code: 'FORBIDDEN',
      message: 'You cannot change this coven.',
    });
    open();

    typeIn(quantity(), '200');
    choose('Unit', 'l');
    press(save());

    const alert = await within(dialog()).findByRole('alert');
    expect(alert).toHaveTextContent('You cannot change this coven.');
    expect(dialog()).toBeInTheDocument();
    expect(quantity()).toHaveValue(200);
    expect(unit()).toHaveTextContent('l');
    expect(threshold()).toHaveValue(30);
    expect(router.refresh).not.toHaveBeenCalled();
    // The form still holds changes, so it can be sent again.
    expect(save()).toBeEnabled();
  });

  it('places a refused amount beside its field and keeps the dialog open', async () => {
    mockGraphQLError('UpdateStock', {
      code: 'VALIDATION',
      message: 'Invalid input',
      fieldErrors: [{ path: ['quantityOnHand'], message: 'Quantity cannot be negative' }],
    });
    open();

    typeIn(quantity(), '-1');
    press(save());

    await waitFor(() => expect(quantity()).toHaveAttribute('aria-invalid', 'true'));
    expect(quantity()).toHaveAccessibleDescription(/cannot be negative/);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('closes from Cancel with nothing changed, without asking', async () => {
    open();

    press(within(dialog()).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it('asks before Cancel throws changes away, and keeps them if told to keep editing', async () => {
    open();
    typeIn(quantity(), '200');

    press(within(dialog()).getByRole('button', { name: 'Cancel' }));

    const keep = await screen.findByRole('button', { name: 'Keep Editing' });
    expect(router.refresh).not.toHaveBeenCalled();

    press(keep);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep Editing' })).toBeNull());
    expect(dialog()).toBeInTheDocument();
    expect(quantity()).toHaveValue(200);
  });

  it('opens on a jar held without an amount, every box empty', () => {
    open({ ...JAR, quantity: null, unit: null, threshold: null });

    expect(quantity()).toHaveValue(null);
    expect(threshold()).toHaveValue(null);
    expect(save()).toBeDisabled();
  });
});
