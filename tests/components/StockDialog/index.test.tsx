import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import StockDialog, { StockDialogModal, StockJarButton } from '@/components/StockDialog';
import type { StockDialogProps } from '@/components/StockDialog/types';
import type { SaveStockMutation, SaveStockMutationVariables } from '@/gql/graphql';
import { choose, press, typeIn } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { stockFormModule } from '@/components/StockDialog/lazy-form';
import { router } from '../../support/next-navigation';

// The service is the guard and is tested there; this proves what the dialog sends (only what changed) when it lets Save through, and where a refusal lands.

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
const quantity = (form: string) => inDialog().getByRole('textbox', { name: `Quantity, ${form}` });
const noQuantity = (form: string) =>
  inDialog().queryByRole('textbox', { name: `Quantity, ${form}` });
const threshold = (form: string) =>
  inDialog().getByRole('textbox', { name: `Low Stock At, ${form}` });
const unit = (form: string) => inDialog().getByRole('combobox', { name: `Unit, ${form}` });
const saveStock = () => inDialog().getByRole('button', { name: /^Sav(e|ing) Stock$/ });
const removeButton = (form: string) => inDialog().getByRole('button', { name: `Remove ${form}` });
const undo = (form: string) => inDialog().getByRole('button', { name: `Undo Remove ${form}` });
const addForm = () => inDialog().queryByRole('combobox', { name: 'Add Form' });
const addButton = () => inDialog().queryByRole('button', { name: 'Add' });
const pick = (form: string) => inDialog().getByRole('button', { name: new RegExp(`^${form}\\b`) });
const queryPick = (form: string) =>
  inDialog().queryByRole('button', { name: new RegExp(`^${form}\\b`) });
const item = (form: string) =>
  within(
    inDialog()
      .getAllByRole('listitem')
      .find((li) => within(li).queryByRole('button', { name: new RegExp(`^${form}\\b`) }))!,
  );

function open(props: Partial<StockDialogProps> = {}) {
  render(<StockDialog {...PROPS} {...props} />);
  fireEvent.click(trigger());
}

const chooseJar = (form: string) => press(pick(form));

function addJar(form: string) {
  fireEvent.click(addForm()!);
  fireEvent.click(screen.getByRole('option', { name: form }));
  press(addButton()!);
}

const offered = () =>
  within(screen.getByRole('listbox', { name: 'Add Form choices' }))
    .getAllByRole('option')
    .map((option) => option.textContent);

function mockSaving() {
  const calls: SaveStockMutationVariables[] = [];
  mockGraphQLMutation<SaveStockMutation, SaveStockMutationVariables>('SaveStock', (variables) => {
    calls.push(variables);
    return { saveStock: [] };
  });
  return calls;
}

async function sent(calls: SaveStockMutationVariables[]) {
  press(saveStock());
  await waitFor(() => expect(calls).toHaveLength(1));
  return calls[0]!;
}

// The dialogs' forms load apart from their openers; they have arrived by the time a person opens one.
beforeAll(async () => {
  await stockFormModule.load();
});

describe('StockDialog', () => {
  // Opened from a page that is not a coven's, the dialog names the coven it writes to in
  // its accessible name; on a coven's own page it is left out.
  it('puts the coven it writes to in the eyebrow when given one, and only then', () => {
    const { unmount } = render(
      <StockDialogModal {...PROPS} onClose={() => {}} coven="Fixture Coven" />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Edit Stock for Fixture Coven, Testwort' }),
    ).toBeInTheDocument();
    unmount();

    render(<StockDialogModal {...PROPS} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Edit Stock, Testwort' })).toBeInTheDocument();
  });

  it('is a button named for its ingredient, shut until pressed, that opens the dialog named the same', () => {
    render(<StockDialog {...PROPS} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger());

    expect(dialog()).toBeInTheDocument();
  });

  it('lists one form per jar held and opens on the first, its fields as it is', () => {
    open();

    expect(pick('Flower')).toHaveAttribute('aria-current', 'true');
    expect(pick('Oil')).not.toHaveAttribute('aria-current');
    expect(queryPick('Resin')).toBeNull();

    expect(quantity('Flower')).toHaveValue('250');
    expect(unit('Flower')).toHaveTextContent('g');
    expect(threshold('Flower')).toHaveValue('30');
    expect(noQuantity('Oil')).toBeNull();
  });

  it('lists the jars by form from A to Z and opens on the first, whatever order they arrive in', () => {
    open({ jars: [...PROPS.jars].reverse() });

    expect(pick('Flower')).toHaveAttribute('aria-current', 'true');
    expect(quantity('Flower')).toHaveValue('250');
    const listed = inDialog().getAllByRole('button', { name: /^(Flower|Oil)\b/ });
    expect(listed).toEqual([pick('Flower'), pick('Oil')]);
  });

  it('shows a form’s fields once it is chosen, and keeps what was typed into the last', () => {
    open();
    typeIn(quantity('Flower'), '200');

    chooseJar('Oil');

    expect(pick('Oil')).toHaveAttribute('aria-current', 'true');
    expect(pick('Flower')).not.toHaveAttribute('aria-current');
    expect(quantity('Oil')).toHaveValue('50');
    expect(unit('Oil')).toHaveTextContent('ml');
    expect(threshold('Oil')).toHaveValue('10');
    expect(noQuantity('Flower')).toBeNull();

    chooseJar('Flower');
    expect(quantity('Flower')).toHaveValue('200');
  });

  it('marks a form Edited while its amounts differ from when the dialog opened', () => {
    open();
    expect(pick('Flower')).not.toHaveAccessibleName(/Edited/);

    typeIn(quantity('Flower'), '200');
    expect(pick('Flower')).toHaveAccessibleName(/Edited/);
    expect(pick('Oil')).not.toHaveAccessibleName(/Edited/);

    typeIn(quantity('Flower'), '250');
    expect(pick('Flower')).not.toHaveAccessibleName(/Edited/);
  });

  it('keeps Save off until something has changed, and off again when it is changed back', () => {
    open();
    expect(saveStock()).toBeDisabled();

    chooseJar('Oil');
    expect(saveStock()).toBeDisabled();

    typeIn(quantity('Oil'), '40');
    expect(saveStock()).toBeEnabled();

    typeIn(quantity('Oil'), '50');
    expect(saveStock()).toBeDisabled();
  });

  it('sends only the jar that changed, its amounts as numbers', async () => {
    const calls = mockSaving();
    open();

    chooseJar('Oil');
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

  it('refuses an unreadable amount at its field, sends nothing, and chooses the form that holds it', async () => {
    const calls = mockSaving();
    open();

    chooseJar('Oil');
    typeIn(quantity('Oil'), 'a lot');
    chooseJar('Flower');
    typeIn(quantity('Flower'), '251');
    press(saveStock());

    await waitFor(() => expect(pick('Oil')).toHaveAttribute('aria-current', 'true'));
    expect(quantity('Oil')).toHaveAccessibleDescription(/Enter an amount as a number, like 2.5/);
    expect(calls).toHaveLength(0);
  });

  it('sends a point amount as the number it means', async () => {
    const calls = mockSaving();
    open();

    typeIn(quantity('Flower'), '2.5');

    expect((await sent(calls)).input.update?.[0]?.input.quantityOnHand).toBe(2.5);
  });

  it('offers only the forms with no jar, with Add off until one is picked', () => {
    open();

    expect(addButton()).toBeDisabled();
    fireEvent.click(addForm()!);
    expect(offered()).toEqual(['Resin']);
    fireEvent.click(screen.getByRole('option', { name: 'Resin' }));

    expect(addButton()).toBeEnabled();
    expect(queryPick('Resin')).toBeNull();
    expect(saveStock()).toBeDisabled();
  });

  it('adds a form to the list, chooses it, focuses its Quantity, and sends it as a new jar', async () => {
    const calls = mockSaving();
    open();

    addJar('Resin');

    expect(pick('Resin')).toHaveAttribute('aria-current', 'true');
    expect(pick('Flower')).not.toHaveAttribute('aria-current');
    expect(pick('Resin')).toHaveAccessibleName(/Edited/);
    expect(saveStock()).toBeEnabled();
    await waitFor(() => expect(quantity('Resin')).toHaveFocus());
    expect(quantity('Resin')).toHaveValue('');

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

  it('takes the Add row away once every form is stocked', () => {
    open();
    expect(addForm()).toBeInTheDocument();

    addJar('Resin');

    expect(addForm()).toBeNull();
    expect(addButton()).toBeNull();
  });

  it('marks a removal from the bin, which Undo takes back, and sends a marked one as a delete', async () => {
    const calls = mockSaving();
    open({
      jars: [
        { id: FLOWER_JAR, variantId: FLOWER, quantity: 5, unit: 'g', threshold: 30 },
        PROPS.jars[1]!,
      ],
    });
    const flower = () => item('Flower');
    expect(flower().getByRole('button', { name: 'Low Stock' })).toBeInTheDocument();

    press(removeButton('Flower'));

    // Marked, not gone: still listed, its amounts out of reach and its badge
    // hidden until it is undone.
    expect(pick('Flower')).toHaveAttribute('aria-current', 'true');
    expect(noQuantity('Flower')).toBeNull();
    expect(flower().queryByRole('button', { name: 'Low Stock' })).toBeNull();
    expect(inDialog().queryByRole('button', { name: 'Remove Flower' })).toBeNull();
    expect(saveStock()).toBeEnabled();

    press(undo('Flower'));
    expect(quantity('Flower')).toHaveValue('5');
    expect(flower().getByRole('button', { name: 'Low Stock' })).toBeInTheDocument();
    expect(saveStock()).toBeDisabled();

    press(removeButton('Flower'));
    const { input } = await sent(calls);
    expect(input).toEqual({ create: [], update: [], delete: [FLOWER_JAR] });
  });

  it('drops a form added and then removed, which sends nothing', async () => {
    const calls = mockSaving();
    open();

    addJar('Resin');
    press(removeButton('Resin'));

    expect(queryPick('Resin')).toBeNull();
    expect(inDialog().queryByRole('button', { name: 'Undo Remove Resin' })).toBeNull();
    expect(saveStock()).toBeDisabled();
    expect(addForm()).toBeInTheDocument();
    expect(pick('Flower')).toHaveAttribute('aria-current', 'true');

    chooseJar('Oil');
    typeIn(quantity('Oil'), '40');
    const { input } = await sent(calls);
    expect(input).toEqual({
      create: [],
      update: [{ id: OIL_JAR, input: { quantityOnHand: 40, unit: 'ml', lowStockThreshold: 10 } }],
      delete: [],
    });
  });

  it('sends every kind of change together, each jar in one list only', async () => {
    const calls = mockSaving();
    open();

    typeIn(threshold('Flower'), '20');
    chooseJar('Oil');
    press(removeButton('Oil'));
    addJar('Resin');

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

    chooseJar('Oil');
    typeIn(quantity('Oil'), '1');
    press(removeButton('Oil'));

    const { input } = await sent(calls);
    expect(input).toEqual({ create: [], update: [], delete: [OIL_JAR] });
  });

  it('closes after a save and refreshes the page behind it', async () => {
    mockSaving();
    open();

    typeIn(quantity('Flower'), '40');
    press(saveStock());

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.refresh).toHaveBeenCalledTimes(1);
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

    typeIn(quantity('Flower'), '40');
    press(saveStock());

    await waitFor(() => expect(saveStock()).toHaveAttribute('aria-busy', 'true'));
    expect(saveStock()).toBeDisabled();
    expect(router.refresh).not.toHaveBeenCalled();

    answer();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says a refusal in an alert, keeps what was typed and marked, and refreshes nothing', async () => {
    mockGraphQLError('SaveStock', { code: 'FORBIDDEN', message: 'You cannot change this coven.' });
    open();

    chooseJar('Oil');
    typeIn(quantity('Oil'), '40');
    chooseJar('Flower');
    press(removeButton('Flower'));
    press(saveStock());

    const alert = await inDialog().findByRole('alert');
    expect(alert).toHaveTextContent('You cannot change this coven.');
    expect(undo('Flower')).toBeInTheDocument();
    expect(pick('Oil')).not.toHaveAccessibleName(/Needs a Fix/);
    chooseJar('Oil');
    expect(quantity('Oil')).toHaveValue('40');
    expect(router.refresh).not.toHaveBeenCalled();
    expect(saveStock()).toBeEnabled();
  });

  it('marks every form a refusal names, chooses the first, and places each issue beside its field', async () => {
    // The batch's lists hold only what changed: Oil is update 0 and Resin
    // create 0, whatever their places in the list.
    mockGraphQLError('SaveStock', {
      code: 'VALIDATION',
      message: 'Invalid input',
      fieldErrors: [
        { path: ['update', 0, 'input', 'quantityOnHand'], message: 'Quantity cannot be negative' },
        {
          path: ['create', 0, 'input', 'lowStockThreshold'],
          message: 'Low Stock At cannot be negative',
        },
      ],
    });
    open();

    chooseJar('Oil');
    typeIn(quantity('Oil'), '-1');
    addJar('Resin');
    typeIn(threshold('Resin'), '-2');
    chooseJar('Flower');
    press(saveStock());

    await waitFor(() => expect(pick('Oil')).toHaveAttribute('aria-current', 'true'));
    expect(pick('Oil')).toHaveAccessibleName(/Needs a Fix/);
    expect(pick('Resin')).toHaveAccessibleName(/Needs a Fix/);
    expect(pick('Flower')).not.toHaveAccessibleName(/Needs a Fix/);
    expect(quantity('Oil')).toHaveAttribute('aria-invalid', 'true');
    expect(quantity('Oil')).toHaveAccessibleDescription(/Quantity cannot be negative/);

    chooseJar('Resin');
    expect(threshold('Resin')).toHaveAttribute('aria-invalid', 'true');
    expect(threshold('Resin')).toHaveAccessibleDescription(/Low Stock At cannot be negative/);
    expect(quantity('Resin')).not.toHaveAttribute('aria-invalid');
    chooseJar('Flower');
    expect(quantity('Flower')).not.toHaveAttribute('aria-invalid');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('places a refused new form on its jar as a whole', async () => {
    mockGraphQLError('SaveStock', {
      code: 'VALIDATION',
      message: 'Invalid input',
      fieldErrors: [
        { path: ['create', 0, 'variantId'], message: 'The coven already holds a jar of this form' },
      ],
    });
    open();

    addJar('Resin');
    chooseJar('Flower');
    press(saveStock());

    const jar = await inDialog().findByRole('group', {
      name: 'Resin',
      description: 'Error: The coven already holds a jar of this form',
    });
    expect(jar).toBeInTheDocument();
    expect(pick('Resin')).toHaveAccessibleName(/Needs a Fix/);
    expect(inDialog().queryByRole('alert')).toBeNull();
    expect(quantity('Resin')).toBeInTheDocument();
  });

  it('asks before Cancel throws a marked removal away, and keeps it if told to keep editing', async () => {
    open();
    chooseJar('Oil');
    press(removeButton('Oil'));

    press(inDialog().getByRole('button', { name: 'Cancel' }));

    const keep = await screen.findByRole('button', { name: 'Keep Editing' });
    press(keep);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep Editing' })).toBeNull());
    expect(undo('Oil')).toBeInTheDocument();
  });

  it('opens on an ingredient with no jar held: no list, shut fields saying why, and every form on offer', () => {
    open({ jars: [] });

    expect(inDialog().queryByRole('list')).toBeNull();
    const blank = inDialog().getByRole('group', { name: 'No Form Chosen' });
    expect(blank).toHaveAccessibleDescription('Add a form to enter its stock.');
    expect(within(blank).getByRole('textbox', { name: 'Quantity' })).toBeDisabled();
    expect(within(blank).getByRole('textbox', { name: 'Low Stock At' })).toBeDisabled();
    expect(within(blank).getByRole('combobox', { name: 'Unit' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(blank).queryByRole('button', { name: /^Remove/ })).toBeNull();
    // The placeholder where the form's name will go is for the eye alone: the group is named and
    // described by its legend and hint, and no heading is announced.
    expect(within(blank).queryByRole('heading')).toBeNull();
    expect(saveStock()).toBeDisabled();
    fireEvent.click(addForm()!);
    expect(offered()).toEqual(['Flower', 'Oil', 'Resin']);
  });

  it('puts a form’s own fields in place of the shut ones once it is added', () => {
    open({ jars: [] });

    addJar('Oil');

    expect(inDialog().queryByRole('group', { name: 'No Form Chosen' })).toBeNull();
    expect(inDialog().queryByRole('textbox', { name: 'Quantity' })).toBeNull();
    expect(quantity('Oil')).toBeEnabled();
    expect(unit('Oil')).not.toHaveAttribute('aria-disabled');
    expect(removeButton('Oil')).toBeInTheDocument();
  });
});

describe('StockDialog openOn', () => {
  it('opens on the form it is given, a jar held, with the jars as they are', () => {
    open({ openOn: OIL });

    expect(pick('Oil')).toHaveAttribute('aria-current', 'true');
    expect(pick('Flower')).not.toHaveAttribute('aria-current');
    expect(quantity('Oil')).toHaveValue('50');
    expect(queryPick('Resin')).toBeNull();
    expect(saveStock()).toBeDisabled();
  });

  it('adds a form the coven holds no jar of as a new row and chooses it, with nothing to save until it is filled', async () => {
    const calls = mockSaving();
    open({ openOn: RESIN });

    expect(pick('Resin')).toHaveAttribute('aria-current', 'true');
    expect(pick('Flower')).not.toHaveAttribute('aria-current');
    expect(quantity('Resin')).toHaveValue('');
    await waitFor(() => expect(quantity('Resin')).toHaveFocus());
    // The one new row, not two, and the form is no longer on offer under Add Form.
    expect(inDialog().getAllByRole('button', { name: /^Resin\b/ })).toHaveLength(1);
    expect(saveStock()).toBeDisabled();

    typeIn(quantity('Resin'), '12');
    expect(saveStock()).toBeEnabled();
    choose('Unit, Resin', 'g');
    const { input } = await sent(calls);
    expect(input.create).toEqual([
      { variantId: RESIN, input: { quantityOnHand: 12, unit: 'g', lowStockThreshold: null } },
    ]);
    expect(input.update).toEqual([]);
    expect(input.delete).toEqual([]);
  });

  it('ignores a form the ingredient does not come in', () => {
    open({ openOn: '00000000-0000-0000-0000-0000000000v9' });

    expect(pick('Flower')).toHaveAttribute('aria-current', 'true');
    expect(saveStock()).toBeDisabled();
  });
});

describe('StockJarButton', () => {
  it('is a button of the given name that opens the same dialog on its form', () => {
    render(
      <StockJarButton {...PROPS} openOn={OIL} ariaLabel="Edit Stock, Testwort, Oil">
        Oil
      </StockJarButton>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Stock, Testwort, Oil' }));

    expect(dialog()).toBeInTheDocument();
    expect(pick('Oil')).toHaveAttribute('aria-current', 'true');
  });
});
