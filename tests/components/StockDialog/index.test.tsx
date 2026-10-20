import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StockDialog from '@/components/StockDialog';
import type { StockDialogProps } from '@/components/StockDialog/types';
import type { SaveStockMutation, SaveStockMutationVariables } from '@/gql/graphql';
import { choose, press, typeIn } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The Edit Stock dialog on a coven card (M9.9): one row per jar the coven
// holds of the ingredient, a form added or a jar removed in the same dialog,
// all of it saved as one `saveStock`. The service is the guard and is tested
// there; this proves what the dialog sends — only what changed — when it lets
// Save through, and where a refusal lands.

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const INGREDIENT = '00000000-0000-0000-0000-0000000000i1';
const FLOWER = '00000000-0000-0000-0000-0000000000v1';
const OIL = '00000000-0000-0000-0000-0000000000v2';
const RESIN = '00000000-0000-0000-0000-0000000000v3';
const FLOWER_JAR = '00000000-0000-0000-0000-0000000000j1';
const OIL_JAR = '00000000-0000-0000-0000-0000000000j2';

const PROPS: StockDialogProps = {
  workspaceId: WORKSPACE,
  ingredientId: INGREDIENT,
  ingredientName: 'Testwort',
  forms: [
    { variantId: FLOWER, label: 'Flower' },
    { variantId: OIL, label: 'Oil' },
    { variantId: RESIN, label: 'Resin' },
  ],
  jars: [
    { id: FLOWER_JAR, variantId: FLOWER, quantity: 250, unit: 'g', threshold: 30 },
    { id: OIL_JAR, variantId: OIL, quantity: 50, unit: 'ml', threshold: 10 },
  ],
};

beforeEach(() => {
  router.refresh.mockClear();
});

const trigger = () => screen.getByRole('button', { name: 'Edit Stock, Testwort' });
const dialog = () => screen.getByRole('dialog', { name: 'Edit Stock, Testwort' });
const inDialog = () => within(dialog());
const quantity = (form: string) =>
  inDialog().getByRole('spinbutton', { name: `Quantity, ${form}` });
const threshold = (form: string) =>
  inDialog().getByRole('spinbutton', { name: `Low Stock At, ${form}` });
const unit = (form: string) => inDialog().getByRole('combobox', { name: `Unit, ${form}` });
const save = () => inDialog().getByRole('button', { name: /^Sav(e|ing) Stock$/ });
const removeButton = (form: string) => inDialog().getByRole('button', { name: `Remove ${form}` });
const undo = (form: string) => inDialog().getByRole('button', { name: `Undo Remove ${form}` });
const addForm = () => inDialog().queryByRole('combobox', { name: 'Add Form' });

function open(props: Partial<StockDialogProps> = {}) {
  render(<StockDialog {...PROPS} {...props} />);
  fireEvent.click(trigger());
}

/** Answers as the service does for a saved batch, keeping what the dialog sent. */
function mockSaving() {
  const calls: SaveStockMutationVariables[] = [];
  mockGraphQLMutation<SaveStockMutation, SaveStockMutationVariables>('SaveStock', (variables) => {
    calls.push(variables);
    return { saveStock: [] };
  });
  return calls;
}

async function sent(calls: SaveStockMutationVariables[]) {
  press(save());
  await waitFor(() => expect(calls).toHaveLength(1));
  return calls[0]!;
}

describe('StockDialog', () => {
  it('is a button named for its ingredient, shut until pressed, that opens the dialog named the same', async () => {
    render(<StockDialog {...PROPS} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger());

    expect(dialog()).toBeInTheDocument();
    await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));
  });

  it('opens on one row per jar held, each as it is', () => {
    open();

    expect(quantity('Flower')).toHaveValue(250);
    expect(unit('Flower')).toHaveTextContent('g');
    expect(threshold('Flower')).toHaveValue(30);
    expect(quantity('Oil')).toHaveValue(50);
    expect(unit('Oil')).toHaveTextContent('ml');
    expect(threshold('Oil')).toHaveValue(10);
    // A form the coven holds no jar of has no row.
    expect(inDialog().queryByRole('spinbutton', { name: 'Quantity, Resin' })).toBeNull();
  });

  it('keeps Save off until something has changed, and off again when it is changed back', () => {
    open();
    expect(save()).toBeDisabled();

    typeIn(quantity('Oil'), '40');
    expect(save()).toBeEnabled();

    typeIn(quantity('Oil'), '50');
    expect(save()).toBeDisabled();
  });

  it('sends only the row that changed, its amounts as numbers', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity('Oil'), '40.5');
    choose('Unit, Oil', 'l');

    expect(await sent(calls)).toEqual({
      workspaceId: WORKSPACE,
      ingredientId: INGREDIENT,
      input: {
        create: [],
        update: [
          { id: OIL_JAR, input: { quantityOnHand: 40.5, unit: 'l', lowStockThreshold: 10 } },
        ],
        delete: [],
      },
    });
  });

  it('sends an emptied box as null and a zero as zero', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity('Flower'), '');
    typeIn(threshold('Flower'), '0');

    const { input } = await sent(calls);
    expect(input.update).toEqual([
      { id: FLOWER_JAR, input: { quantityOnHand: null, unit: 'g', lowStockThreshold: 0 } },
    ]);
  });

  it('offers only the forms with no jar to add, and sends an added one as a new jar', async () => {
    const calls = mockSaving();
    open();

    fireEvent.click(addForm()!);
    const offered = within(screen.getByRole('listbox', { name: 'Add Form choices' }))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offered).toEqual(['Resin']);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));

    // The new row, empty, and Save on: adding a jar is itself a change.
    expect(quantity('Resin')).toHaveValue(null);
    expect(save()).toBeEnabled();
    // Every form is held now, so there is nothing left to add.
    expect(addForm()).toBeNull();

    typeIn(quantity('Resin'), '12');
    choose('Unit, Resin', 'g');

    const { input } = await sent(calls);
    expect(input).toEqual({
      create: [
        {
          variantId: RESIN,
          input: { quantityOnHand: 12, unit: 'g', lowStockThreshold: null },
        },
      ],
      update: [],
      delete: [],
    });
  });

  it('has no Add Form when the coven holds a jar of every form', () => {
    open({
      forms: PROPS.forms.slice(0, 2),
    });

    expect(quantity('Flower')).toBeInTheDocument();
    expect(addForm()).toBeNull();
  });

  it('stages a removal, which Undo takes back, and sends a staged one as a delete', async () => {
    const calls = mockSaving();
    open();

    press(removeButton('Flower'));

    // Staged, not gone: its amounts are out of reach until it is undone.
    expect(inDialog().queryByRole('spinbutton', { name: 'Quantity, Flower' })).toBeNull();
    expect(save()).toBeEnabled();

    press(undo('Flower'));
    expect(quantity('Flower')).toHaveValue(250);
    expect(save()).toBeDisabled();

    press(removeButton('Flower'));
    const { input } = await sent(calls);
    expect(input).toEqual({ create: [], update: [], delete: [FLOWER_JAR] });
  });

  it('drops a row added and then removed, leaving nothing to save', () => {
    open();

    fireEvent.click(addForm()!);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));
    press(removeButton('Resin'));

    expect(inDialog().queryByRole('spinbutton', { name: 'Quantity, Resin' })).toBeNull();
    expect(inDialog().queryByRole('button', { name: 'Undo Remove Resin' })).toBeNull();
    expect(save()).toBeDisabled();
    // Its form is on offer again.
    expect(addForm()).toBeInTheDocument();
  });

  it('sends every kind of change together, each jar in one list only', async () => {
    const calls = mockSaving();
    open();

    typeIn(threshold('Flower'), '20');
    press(removeButton('Oil'));
    fireEvent.click(addForm()!);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));

    const { input } = await sent(calls);
    expect(input).toEqual({
      create: [
        {
          variantId: RESIN,
          input: { quantityOnHand: null, unit: null, lowStockThreshold: null },
        },
      ],
      update: [
        { id: FLOWER_JAR, input: { quantityOnHand: 250, unit: 'g', lowStockThreshold: 20 } },
      ],
      delete: [OIL_JAR],
    });
  });

  it('sends a jar both changed and removed as a delete only', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity('Oil'), '1');
    press(removeButton('Oil'));

    const { input } = await sent(calls);
    expect(input).toEqual({ create: [], update: [], delete: [OIL_JAR] });
  });

  it('closes after a save, gives the focus back to the button and refreshes the page behind it', async () => {
    mockSaving();
    open();

    typeIn(quantity('Oil'), '40');
    press(save());

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(trigger()).toHaveFocus();
  });

  it('shows Save busy while the save is in flight, and neither closes nor refreshes before it answers', async () => {
    let answer: () => void = () => {};
    const answered = new Promise<void>((resolve) => (answer = resolve));
    server.use(
      graphqlLink.mutation('SaveStock', async () => {
        await answered;
        return HttpResponse.json({ data: { saveStock: [] } });
      }),
    );
    open();

    typeIn(quantity('Oil'), '40');
    press(save());

    await waitFor(() => expect(save()).toHaveAttribute('aria-busy', 'true'));
    expect(save()).toBeDisabled();
    expect(router.refresh).not.toHaveBeenCalled();

    answer();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says a refusal in an alert, keeps what was typed and staged, and refreshes nothing', async () => {
    mockGraphQLError('SaveStock', { code: 'FORBIDDEN', message: 'You cannot change this coven.' });
    open();

    typeIn(quantity('Oil'), '40');
    press(removeButton('Flower'));
    press(save());

    const alert = await inDialog().findByRole('alert');
    expect(alert).toHaveTextContent('You cannot change this coven.');
    expect(quantity('Oil')).toHaveValue(40);
    expect(undo('Flower')).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(save()).toBeEnabled();
  });

  it('places each refused amount beside its own row’s field, several rows at once', async () => {
    // The batch's lists hold only what changed: Oil is update 0 and Resin
    // create 0, whatever their places among the dialog's rows.
    mockGraphQLError('SaveStock', {
      code: 'VALIDATION',
      message: 'Invalid input',
      fieldErrors: [
        { path: ['update', 0, 'input', 'quantityOnHand'], message: 'Quantity cannot be negative' },
        {
          path: ['create', 0, 'input', 'lowStockThreshold'],
          message: 'Threshold cannot be negative',
        },
      ],
    });
    open();

    typeIn(quantity('Oil'), '-1');
    fireEvent.click(addForm()!);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));
    typeIn(threshold('Resin'), '-2');
    press(save());

    await waitFor(() => expect(quantity('Oil')).toHaveAttribute('aria-invalid', 'true'));
    expect(quantity('Oil')).toHaveAccessibleDescription(/cannot be negative/);
    expect(threshold('Resin')).toHaveAttribute('aria-invalid', 'true');
    expect(threshold('Resin')).toHaveAccessibleDescription(/Threshold cannot be negative/);
    // Nothing on the rows the issues did not name.
    expect(quantity('Flower')).not.toHaveAttribute('aria-invalid');
    expect(quantity('Resin')).not.toHaveAttribute('aria-invalid');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('places a refused new form on its row as a whole', async () => {
    mockGraphQLError('SaveStock', {
      code: 'VALIDATION',
      message: 'Invalid input',
      fieldErrors: [
        { path: ['create', 0, 'variantId'], message: 'The coven already holds a jar of this form' },
      ],
    });
    open();

    fireEvent.click(addForm()!);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));
    press(save());

    const row = await inDialog().findByRole('group', {
      name: 'Resin',
      description: 'The coven already holds a jar of this form',
    });
    expect(row).toBeInTheDocument();
    expect(inDialog().queryByRole('alert')).toBeNull();
    expect(quantity('Resin')).toBeInTheDocument();
  });

  it('closes from Cancel with nothing changed, without asking', async () => {
    open();

    press(inDialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it('asks before Cancel throws a staged removal away, and keeps it if told to keep editing', async () => {
    open();
    press(removeButton('Oil'));

    press(inDialog().getByRole('button', { name: 'Cancel' }));

    const keep = await screen.findByRole('button', { name: 'Keep Editing' });
    press(keep);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep Editing' })).toBeNull());
    expect(undo('Oil')).toBeInTheDocument();
  });

  it('opens on an ingredient with no jar held: no rows, and every form on offer', () => {
    open({ jars: [] });

    expect(inDialog().queryByRole('spinbutton')).toBeNull();
    fireEvent.click(addForm()!);
    const offered = within(screen.getByRole('listbox', { name: 'Add Form choices' }))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offered).toEqual(['Flower', 'Oil', 'Resin']);
  });
});
