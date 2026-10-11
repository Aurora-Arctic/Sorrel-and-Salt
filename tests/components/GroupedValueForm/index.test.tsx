import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { ADDING, DELETING, EDITING } from '../../support/grouped-value-form';
import type { GroupedValueFormSubject } from '../../support/types';

// The admin's form for a grouped curated value, one per kind: a category
// (M5.6), an ingredient form (M5.6a) or a deity (MB.132) — a name, a description and a group,
// saved through the kind's mutations, and on an existing value a delete
// behind a confirmation. A form's rename says it carries onto the
// compendium, and one that would end another entry's redirect asks before it
// is sent again (MB.82). The mutations are answered by MSW in the route's own
// shape (claude-docs/components/grouped-value-form.md).

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

function renderForm(
  props: Pick<GroupedValueFormProps, 'kind' | 'groups'> & Partial<GroupedValueFormProps>,
) {
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
const chooseGroup = (label: string) => {
  fireEvent.click(group());
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Group choices' })).getByRole('option', {
      name: label,
    }),
  );
};
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const press = (label: string) => {
  const button = screen.getByRole('button', { name: label });
  button.focus();
  fireEvent.click(button);
};

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

      type(name(), 'Testcraft');
      type(description(), 'A category the test made');
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

      type(name(), 'Testcraft Renamed');
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
      expect(screen.getByRole('button', { name: 'Delete Category' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});

describe('GroupedValueForm, a form', () => {
  const renderFormKind = (props: Partial<GroupedValueFormProps> = {}) =>
    renderForm({ kind: 'form', groups: FORM_GROUPS, ...props });
  const save = () => screen.getByRole('button', { name: 'Save Form' });

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

      type(name(), 'Testwort Shard');
      type(description(), 'A form the test made');
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

      type(name(), 'Testwort Shard');

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

      type(name(), 'Testwort Shard');
      type(description(), 'Grouped');
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

      type(name(), 'Testwort Sliver');
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

    // MB.162: a rename carries onto every compendium entry that picked the
    // form, and a form is part of an entry's slug.
    it('describes Save by the rename note once the name changes, and only then', () => {
      renderFormKind({ value: FORM });

      expect(save()).toHaveAccessibleDescription('');
      type(description(), 'Described again');
      expect(save()).toHaveAccessibleDescription('');

      type(name(), 'Testwort Sliver');
      expect(save()).toHaveAccessibleDescription(/\S/);

      type(name(), 'Testwort Shard');
      expect(save()).toHaveAccessibleDescription('');
    });
  });

  // MB.82: a rename re-slugs the entries that picked the form, and taking a
  // slug another entry redirects from asks first.
  describe('a rename that would end a redirect', () => {
    const REDIRECT =
      '"testwort-sliver" redirects to Testwort (Fixtura testalis), sliver until 28 August 2026, 00:00 UTC — confirm to end that redirect';

    it('asks, then sends the same input again with endRedirect', async () => {
      const calls: UpdateIngredientFormValueMutationVariables[] = [];
      server.use(
        graphqlLink.mutation<
          UpdateIngredientFormValueMutation,
          UpdateIngredientFormValueMutationVariables
        >('UpdateIngredientFormValue', ({ variables }) => {
          calls.push(variables);
          if (variables.input.endRedirect) {
            return HttpResponse.json({
              data: { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } },
            });
          }
          return HttpResponse.json({
            data: null,
            errors: [
              {
                message: 'Validation failed',
                extensions: {
                  code: 'VALIDATION',
                  fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
                },
              },
            ],
          });
        }),
      );
      const onDone = renderFormKind({ value: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Save Form' })).not.toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();

      press('Rename Anyway');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      const input = {
        name: 'Testwort Sliver',
        description: 'A form the test holds',
        groupId: FORM_GROUPS[1].id,
      };
      expect(calls).toEqual([
        { id: FORM.id, input },
        { id: FORM.id, input: { ...input, endRedirect: true } },
      ]);
    });

    it('is busy in the question until the confirmed answer', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation<
          UpdateIngredientFormValueMutation,
          UpdateIngredientFormValueMutationVariables
        >('UpdateIngredientFormValue', async ({ variables }) => {
          if (!variables.input.endRedirect) {
            return HttpResponse.json({
              data: null,
              errors: [
                {
                  message: 'Validation failed',
                  extensions: {
                    code: 'VALIDATION',
                    fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
                  },
                },
              ],
            });
          }
          await held;
          return HttpResponse.json({
            data: { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } },
          });
        }),
      );
      const onDone = renderFormKind({ value: FORM });
      type(name(), 'Testwort Sliver');
      press('Save Form');
      const busy = await screen.findByRole('button', { name: 'Rename Anyway' });

      press('Rename Anyway');

      await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
      expect(busy).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Save Form' })).not.toBeInTheDocument();
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });

    it('withdraws the question when the form is edited again', async () => {
      mockGraphQLError('UpdateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
      });
      renderFormKind({ value: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');
      await screen.findByRole('button', { name: 'Rename Anyway' });

      type(name(), 'Testwort Splinter');

      expect(screen.queryByRole('button', { name: 'Rename Anyway' })).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(save()).toBeEnabled();
    });

    it('withdraws the question on Keep Editing, sending nothing', async () => {
      mockGraphQLError('UpdateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
      });
      const onDone = renderFormKind({ value: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');
      await screen.findByRole('button', { name: 'Rename Anyway' });

      press('Keep Editing');

      expect(screen.queryByRole('button', { name: 'Rename Anyway' })).not.toBeInTheDocument();
      expect(save()).toBeEnabled();
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('asks first, naming the form, and deletes nothing on Keep It', () => {
      const onDone = renderFormKind({ value: FORM });

      press('Delete Form');

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
      expect(screen.getByText(/Testwort Shard/)).toBeInTheDocument();
      press('Keep It');
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

    type(name(), 'Testra');
    type(description(), 'A god the test made');
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

    expect(tradition()).toHaveTextContent('Mockish');
    expect(save()).toHaveAccessibleDescription('');
    type(name(), 'Mockra');
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

    type(name(), 'Mockra');
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
