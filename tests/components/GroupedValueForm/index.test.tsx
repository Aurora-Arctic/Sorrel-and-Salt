import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormIcon from '@/components/FormIcon';
import GroupedValueForm from '@/components/GroupedValueForm';
import type { GroupedValueFormProps } from '@/components/GroupedValueForm/types';
import type {
  CreateCategoryMutation,
  CreateCategoryMutationVariables,
  CreateDeityMutation,
  CreateDeityMutationVariables,
  CreateIngredientFormValueMutation,
  CreateIngredientFormValueMutationVariables,
  DeleteCategoryMutation,
  UpdateCategoryMutation,
  UpdateCategoryMutationVariables,
  UpdateDeityMutation,
  UpdateDeityMutationVariables,
  UpdateIngredientFormValueMutation,
  UpdateIngredientFormValueMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { ADDING, DELETING, EDITING } from '../../support/grouped-value-form';
import { choose, press, redo, typeIn, undo } from '../../support/interact';
import type { GroupedValueFormSubject } from '../../support/types';
import {
  expectAnswered,
  expectAskingOver,
  expectGuardedWaysOut,
  renderInModal,
} from '../../support/discard-guard';

// The admin's form for a grouped curated value, one per kind: a category
// (M5.6), an ingredient form (M5.6a) or a deity (MB.132) — a name, a description and a group,
// saved through the kind's mutations, and on an existing value a delete
// behind a confirmation. A form's rename says it carries onto the
// compendium. The mutations are answered by MSW in the route's own shape
// (claude-docs/components/grouped-value-form.md).

const CATEGORY_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Protection' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Healing' },
];

const CATEGORY = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testcraft',
  description: 'A category the test holds',
  groupId: CATEGORY_GROUPS[1].id,
};

const FORM_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
];

const FORM = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Shard',
  description: 'A form the test holds',
  groupId: FORM_GROUPS[1].id,
};

const TRADITIONS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixtural' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Mockish' },
];

const DEITY = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testra',
  description: 'A god the test holds',
  groupId: TRADITIONS[1].id,
};

// The shared tests' subject (tests/support/grouped-value-form.tsx): the
// behaviour every kind shares runs on the category alone, and each kind's
// describe below holds only what it changes.
const SUBJECT: GroupedValueFormSubject = {
  kind: 'category',
  noun: 'Category',
  groupLabel: 'Group',
  groups: [CATEGORY_GROUPS[0], CATEGORY_GROUPS[1]],
  value: CATEGORY,
  create: {
    operation: 'CreateCategory',
    data: {
      createCategory: { id: CATEGORY.id, slug: 'testcraft' },
    } satisfies CreateCategoryMutation,
  },
  remove: {
    operation: 'DeleteCategory',
    data: { deleteCategory: CATEGORY.id } satisfies DeleteCategoryMutation,
  },
  slugClash: {
    name: 'Testcraft-Ward',
    message: '"Testcraft Ward" already has the address "testcraft-ward" — choose another name',
  },
};

function renderForm(props: Pick<GroupedValueFormProps, 'kind'> & Partial<GroupedValueFormProps>) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <GroupedValueForm onDone={onDone} {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const group = () => screen.getByRole('combobox', { name: 'Group' });
const chooseGroup = (label: string) => choose('Group', label);

describe('GroupedValueForm, what every kind shares', () => {
  describe('adding', () => {
    it.each(ADDING)('%s', (_, run) => run(SUBJECT));
  });

  describe('editing', () => {
    it.each(EDITING)('%s', (_, run) => run(SUBJECT));
  });

  describe('deleting', () => {
    it.each(DELETING)('%s', (_, run) => run(SUBJECT));
  });
});

// Every way out asks first while the form has changes (MB.115): the
// guard's shape is tests/components/Modal's, and this its wiring.
describe('GroupedValueForm, its unsaved changes', () => {
  it('asks before Cancel or Escape discards a change, and closes on Discard Changes', () => {
    const onClose = renderInModal((done) => (
      <GroupedValueForm kind="category" value={CATEGORY} groups={CATEGORY_GROUPS} onDone={done} />
    ));

    expectGuardedWaysOut(onClose, () => typeIn(description(), 'A change'));
  });
});

// The delete's question is asked over the form, as the unsaved changes' is
// (MB.115, the owner's call): the form inert behind it until it is answered.
describe('GroupedValueForm, its delete question in a modal', () => {
  const renderEdit = () =>
    renderInModal((done) => (
      <GroupedValueForm kind="category" value={CATEGORY} groups={CATEGORY_GROUPS} onDone={done} />
    ));

  it('holds the form while asking, the focus on Keep It, and gives both back on Keep It', () => {
    const onClose = renderEdit();
    expect(name().closest('[inert]')).toBeNull();

    press('Delete Category');

    expect(
      expectAskingOver(name(), screen.getByRole('button', { name: 'Keep It' })),
    ).toContainElement(screen.getByRole('button', { name: 'Delete' }));
    press('Keep It');
    expectAnswered(name(), 'Keep It');
    expect(screen.getByRole('button', { name: 'Delete Category' })).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('deletes on Delete, from over the form', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(SUBJECT.remove.operation, (variables) => {
      calls.push(variables);
      return SUBJECT.remove.data;
    });
    const onClose = renderEdit();

    press('Delete Category');
    press('Delete');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: CATEGORY.id }]);
  });

  // Escape keeps what it did when the question stood in place of the
  // buttons: with nothing changed it closes the modal; with a change the
  // unsaved changes' question takes the delete's place, and Keep Editing
  // brings the delete's back.
  it('closes on Escape with nothing changed, and asks about a change first', () => {
    const onClose = renderEdit();
    const escape = () =>
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

    typeIn(description(), 'A change');
    press('Delete Category');
    escape();
    expect(screen.getByRole('button', { name: 'Keep Editing' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Keep It' })).not.toBeInTheDocument();
    press('Keep Editing');
    expectAskingOver(name(), screen.getByRole('button', { name: 'Keep It' }));
    expect(onClose).not.toHaveBeenCalled();

    typeIn(description(), CATEGORY.description);
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('GroupedValueForm, a category', () => {
  const renderCategory = (props: Partial<GroupedValueFormProps> = {}) =>
    renderForm({ kind: 'category', groups: CATEGORY_GROUPS, ...props });

  describe('adding', () => {
    it('creates the category from what was entered, then is done', async () => {
      const calls: CreateCategoryMutationVariables[] = [];
      mockGraphQLMutation<CreateCategoryMutation, CreateCategoryMutationVariables>(
        'CreateCategory',
        (variables) => {
          calls.push(variables);
          return { createCategory: { id: CATEGORY.id, slug: 'testcraft' } };
        },
      );
      const onDone = renderCategory();

      typeIn(name(), 'Testcraft');
      typeIn(description(), 'A category the test made');
      chooseGroup('Fixture Healing');
      press('Save Category');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          input: {
            name: 'Testcraft',
            description: 'A category the test made',
            groupId: CATEGORY_GROUPS[1].id,
          },
        },
      ]);
    });
  });

  describe('editing', () => {
    it('saves the whole category under its id, then is done', async () => {
      const calls: UpdateCategoryMutationVariables[] = [];
      mockGraphQLMutation<UpdateCategoryMutation, UpdateCategoryMutationVariables>(
        'UpdateCategory',
        (variables) => {
          calls.push(variables);
          return { updateCategory: { id: CATEGORY.id, slug: 'testcraft-renamed' } };
        },
      );
      const onDone = renderCategory({ value: CATEGORY });

      typeIn(name(), 'Testcraft Renamed');
      press('Save Category');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          id: CATEGORY.id,
          input: {
            name: 'Testcraft Renamed',
            description: 'A category the test holds',
            groupId: CATEGORY_GROUPS[1].id,
          },
        },
      ]);
    });
  });

  describe('deleting', () => {
    it('asks first, naming the category, and deletes nothing on Keep It', () => {
      const onDone = renderCategory({ value: CATEGORY });

      press('Delete Category');

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
      expect(screen.getByText(/Testcraft/)).toBeInTheDocument();
      press('Keep It');
      // The question gone, not merely the form's own button there beneath it.
      expect(screen.queryByRole('button', { name: 'Keep It' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Category' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('shows the refusal of a category still in the compendium, and stays open', async () => {
      mockGraphQLError('DeleteCategory', {
        code: 'FORBIDDEN',
        message: '"Testcraft" is filed on 1 compendium entry — Testwort. Take it off it first.',
      });
      const onDone = renderCategory({ value: CATEGORY });

      press('Delete Category');
      press('Delete');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Keep It' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Category' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});

describe('GroupedValueForm, a form', () => {
  const renderFormKind = (props: Partial<GroupedValueFormProps> = {}) =>
    renderForm({ kind: 'form', groups: FORM_GROUPS, ...props });
  const save = () => screen.getByRole('button', { name: 'Save Form' });

  it('draws the icon of each group in the group choices, the generic where it has none', () => {
    renderFormKind({
      groups: [
        { id: FORM_GROUPS[0].id, name: 'Fixture Mineral', icon: 'mineral' },
        { id: FORM_GROUPS[1].id, name: 'Fixture Substance', icon: null },
      ],
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'Group' }));

    const drawn = (label: string) =>
      screen.getByRole('option', { name: label }).querySelector('[aria-hidden="true"] svg')!
        .innerHTML;
    expect(drawn('Fixture Mineral')).toBe(
      render(<FormIcon name="mineral" />).container.querySelector('svg')!.innerHTML,
    );
    expect(drawn('Fixture Substance')).toBe(
      render(<FormIcon name={null} />).container.querySelector('svg')!.innerHTML,
    );
  });

  describe('adding', () => {
    it('creates the form from what was entered, then is done', async () => {
      const calls: CreateIngredientFormValueMutationVariables[] = [];
      mockGraphQLMutation<
        CreateIngredientFormValueMutation,
        CreateIngredientFormValueMutationVariables
      >('CreateIngredientFormValue', (variables) => {
        calls.push(variables);
        return {
          createIngredientFormValue: { id: FORM.id, slug: 'testwort-shard-fixture-mineral' },
        };
      });
      const onDone = renderFormKind();

      typeIn(name(), 'Testwort Shard');
      typeIn(description(), 'A form the test made');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          input: {
            name: 'Testwort Shard',
            description: 'A form the test made',
            groupId: FORM_GROUPS[0].id,
          },
        },
      ]);
    });

    it('notes no rename on a new form', () => {
      renderFormKind();

      typeIn(name(), 'Testwort Shard');

      expect(save()).toHaveAccessibleDescription('');
    });

    it("lands the server's group refusal beside Group, and a pathless one above the fields", async () => {
      mockGraphQLError('CreateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [
          { path: ['groupId'], message: 'No live group has that id' },
          { path: [], message: 'Something about the whole form' },
        ],
      });
      renderFormKind();

      typeIn(name(), 'Testwort Shard');
      typeIn(description(), 'Grouped');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(group()).toHaveAttribute('aria-invalid', 'true');
      expect(group()).toHaveAccessibleDescription(/\S/);
    });
  });

  describe('editing', () => {
    it('saves the whole form under its id, then is done', async () => {
      const calls: UpdateIngredientFormValueMutationVariables[] = [];
      mockGraphQLMutation<
        UpdateIngredientFormValueMutation,
        UpdateIngredientFormValueMutationVariables
      >('UpdateIngredientFormValue', (variables) => {
        calls.push(variables);
        return { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } };
      });
      const onDone = renderFormKind({ value: FORM });

      typeIn(name(), 'Testwort Sliver');
      press('Save Form');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          id: FORM.id,
          input: {
            name: 'Testwort Sliver',
            description: 'A form the test holds',
            groupId: FORM_GROUPS[1].id,
          },
        },
      ]);
    });

    // MB.162: a rename carries onto every compendium entry that picked the form.
    it('describes Save by the rename note once the name changes, and only then', () => {
      renderFormKind({ value: FORM });

      expect(save()).toHaveAccessibleDescription('');
      typeIn(description(), 'Described again');
      expect(save()).toHaveAccessibleDescription('');

      typeIn(name(), 'Testwort Sliver');
      expect(save()).toHaveAccessibleDescription(/\S/);

      typeIn(name(), 'Testwort Shard');
      expect(save()).toHaveAccessibleDescription('');
    });
  });

  describe('deleting', () => {
    it('asks first, naming the form, and deletes nothing on Keep It', () => {
      const onDone = renderFormKind({ value: FORM });

      press('Delete Form');

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
      expect(screen.getByText(/Testwort Shard/)).toBeInTheDocument();
      press('Keep It');
      // The question gone, not merely the form's own button there beneath it.
      expect(screen.queryByRole('button', { name: 'Keep It' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Form' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('shows the refusal of a form a compendium entry picks, and stays open', async () => {
      mockGraphQLError('DeleteIngredientFormValue', {
        code: 'FORBIDDEN',
        message:
          '"Testwort Shard" is the form of 1 compendium entry — Testwort. Change its form first.',
      });
      const onDone = renderFormKind({ value: FORM });

      press('Delete Form');
      press('Delete');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Keep It' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Form' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});

// MB.132: a deity's input names its group `traditionId`, so the form sends
// that and lands a refusal pathed to it beside Tradition.
describe('GroupedValueForm, a deity', () => {
  const renderDeity = (props: Partial<GroupedValueFormProps> = {}) =>
    renderForm({ kind: 'deity', groups: TRADITIONS, ...props });
  const tradition = () => screen.getByRole('combobox', { name: 'Tradition' });
  const save = () => screen.getByRole('button', { name: 'Save Deity' });

  it('draws no icon in the tradition choices', () => {
    renderDeity();

    fireEvent.click(tradition());

    const options = within(screen.getByRole('listbox', { name: 'Tradition choices' })).getAllByRole(
      'option',
    );
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option.querySelector('svg')).toBeNull();
  });

  it('creates the deity with its tradition as `traditionId`, then is done', async () => {
    const calls: CreateDeityMutationVariables[] = [];
    mockGraphQLMutation<CreateDeityMutation, CreateDeityMutationVariables>(
      'CreateDeity',
      (variables) => {
        calls.push(variables);
        return { createDeity: { id: DEITY.id, slug: 'testra-fixtural' } };
      },
    );
    const onDone = renderDeity();

    typeIn(name(), 'Testra');
    typeIn(description(), 'A god the test made');
    fireEvent.click(tradition());
    fireEvent.click(
      within(screen.getByRole('listbox', { name: 'Tradition choices' })).getByRole('option', {
        name: 'Fixtural',
      }),
    );
    press('Save Deity');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      {
        input: {
          name: 'Testra',
          description: 'A god the test made',
          traditionId: TRADITIONS[0].id,
        },
      },
    ]);
  });

  it('saves a rename under its id, Save first described by the rename note', async () => {
    const calls: UpdateDeityMutationVariables[] = [];
    mockGraphQLMutation<UpdateDeityMutation, UpdateDeityMutationVariables>(
      'UpdateDeity',
      (variables) => {
        calls.push(variables);
        return { updateDeity: { id: DEITY.id, slug: 'mockra-mockish' } };
      },
    );
    const onDone = renderDeity({ value: DEITY });

    expect(tradition()).toHaveValue('Mockish');
    expect(save()).toHaveAccessibleDescription('');
    typeIn(name(), 'Mockra');
    expect(save()).toHaveAccessibleDescription(/\S/);
    press('Save Deity');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      {
        id: DEITY.id,
        input: {
          name: 'Mockra',
          description: 'A god the test holds',
          traditionId: TRADITIONS[1].id,
        },
      },
    ]);
  });

  it("lands the server's `traditionId` refusal beside Tradition", async () => {
    mockGraphQLError('UpdateDeity', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['traditionId'], message: 'Choose a tradition' }],
    });
    renderDeity({ value: DEITY });

    typeIn(name(), 'Mockra');
    press('Save Deity');

    await waitFor(() => expect(tradition()).toHaveAttribute('aria-invalid', 'true'));
    expect(tradition()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the refusal of a deity a compendium entry picks, and stays open', async () => {
    mockGraphQLError('DeleteDeity', {
      code: 'FORBIDDEN',
      message:
        '"Testra" is among the deities of 1 compendium entry — Testwort. Take it off its deities first.',
    });
    const onDone = renderDeity({ value: DEITY });

    press('Delete Deity');
    expect(screen.getByText(/Testra/)).toBeInTheDocument();
    press('Delete');

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(onDone).not.toHaveBeenCalled();
  });
});

// MB.95's flat kinds, folded in at MB.115: a celestial body or a zodiac sign has no
// group, so the form asks for none and sends none. What every kind shares
// runs on the category above; each flat kind gets only what it changes, its
// three mutations (claude-docs/testing/layer-ownership.md, rule 5).
const FLAT = [
  { kind: 'celestialBody', type: 'CelestialBody', noun: 'Celestial Body' },
  { kind: 'zodiacSign', type: 'ZodiacSign', noun: 'Zodiac Sign' },
] as const;

const FLAT_VALUE = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Star',
  description: 'A value the test holds',
};

describe.each(FLAT)('GroupedValueForm, the flat kind $kind', ({ kind, type: mutation, noun }) => {
  it(`creates through create${mutation}, with no group asked for or sent, then is done`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Create${mutation}`, (variables) => {
      calls.push(variables);
      return { [`create${mutation}`]: { id: FLAT_VALUE.id } };
    });
    const onDone = renderForm({ kind });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    typeIn(name(), ' Testwort Star ');
    typeIn(description(), 'A value the test made');
    press(`Save ${noun}`);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      { input: { name: 'Testwort Star', description: 'A value the test made' } },
    ]);
  });

  it(`saves an edit whole under its id through update${mutation}`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Update${mutation}`, (variables) => {
      calls.push(variables);
      return { [`update${mutation}`]: { id: FLAT_VALUE.id } };
    });
    const onDone = renderForm({ kind, value: FLAT_VALUE });

    typeIn(name(), 'Testwort Comet');
    press(`Save ${noun}`);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      {
        id: FLAT_VALUE.id,
        input: { name: 'Testwort Comet', description: 'A value the test holds' },
      },
    ]);
  });

  it(`deletes on confirmation through delete${mutation}, then is done`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Delete${mutation}`, (variables) => {
      calls.push(variables);
      return { [`delete${mutation}`]: FLAT_VALUE.id };
    });
    const onDone = renderForm({ kind, value: FLAT_VALUE });

    press(`Delete ${noun}`);
    press('Delete');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: FLAT_VALUE.id }]);
  });
});

// Undo and redo (M12.9): the hook is tested in tests/components/Field; this
// is its wiring, and where it is switched off.
describe('GroupedValueForm, its undo and redo', () => {
  const save = () => screen.getByRole('button', { name: 'Save Category' });

  it('undoes a group pick back to the saved one, and Save goes off with it', () => {
    renderForm({ kind: 'category', value: CATEGORY, groups: CATEGORY_GROUPS });
    expect(save()).toBeDisabled();
    chooseGroup(CATEGORY_GROUPS[0].name);
    expect(group()).toHaveValue(CATEGORY_GROUPS[0].name);
    expect(save()).toBeEnabled();

    undo();

    expect(group()).toHaveValue(CATEGORY_GROUPS[1].name);
    expect(save()).toBeDisabled();
  });

  it('undoes typing and redoes it', () => {
    renderForm({ kind: 'category', value: CATEGORY, groups: CATEGORY_GROUPS });
    act(() => name().focus());
    typeIn(name(), 'Testcraft Two');

    undo();
    expect(name()).toHaveValue(CATEGORY.name);

    redo();
    expect(name()).toHaveValue('Testcraft Two');
  });

  it('has Undo and Redo buttons, off with nothing to do, that act on a click', () => {
    renderForm({ kind: 'category', value: CATEGORY, groups: CATEGORY_GROUPS });
    const undoButton = () => screen.getByRole('button', { name: 'Undo' });
    const redoButton = () => screen.getByRole('button', { name: 'Redo' });
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();
    typeIn(name(), 'Testcraft Two');
    expect(undoButton()).toBeEnabled();

    press(undoButton());
    expect(name()).toHaveValue(CATEGORY.name);
    expect(redoButton()).toBeEnabled();

    press(redoButton());
    expect(name()).toHaveValue('Testcraft Two');
  });

  it('undoes nothing while the unsaved changes question is up', () => {
    renderInModal((done) => (
      <GroupedValueForm kind="category" value={CATEGORY} groups={CATEGORY_GROUPS} onDone={done} />
    ));
    typeIn(name(), 'Testcraft Two');
    press('Cancel');
    expectAskingOver(name(), screen.getByRole('button', { name: 'Keep Editing' }));

    undo();

    expect(name()).toHaveValue('Testcraft Two');
    press('Keep Editing');
    undo();
    expect(name()).toHaveValue(CATEGORY.name);
  });

  it('undoes nothing while the delete question is up', () => {
    renderInModal((done) => (
      <GroupedValueForm kind="category" value={CATEGORY} groups={CATEGORY_GROUPS} onDone={done} />
    ));
    typeIn(name(), 'Testcraft Two');
    press('Delete Category');
    expectAskingOver(name(), screen.getByRole('button', { name: 'Keep It' }));

    undo();

    expect(name()).toHaveValue('Testcraft Two');
  });

  it('puts its buttons in the modal header', () => {
    renderInModal((done) => (
      <GroupedValueForm kind="category" value={CATEGORY} groups={CATEGORY_GROUPS} onDone={done} />
    ));

    expect(screen.getByRole('button', { name: 'Undo' }).closest('form')).toBeNull();
  });
});
