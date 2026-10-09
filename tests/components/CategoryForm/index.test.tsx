import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoryForm from '@/components/CategoryForm';
import type { CategoryFormProps } from '@/components/CategoryForm/types';
import type {
  CreateCategoryMutation,
  CreateCategoryMutationVariables,
  DeleteCategoryMutation,
  UpdateCategoryMutation,
  UpdateCategoryMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { ADDING, DELETING, EDITING } from '../../support/grouped-value-form';
import type { GroupedValueFormSubject } from '../../support/types';

// The admin's category form (M5.6): a name, a description and a group, saved
// through the category mutations, and on an existing category a delete behind
// a confirmation. The mutations are answered by MSW in the route's own shape
// (claude-docs/components/category-form.md).

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Protection' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Healing' },
];

const CATEGORY = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testcraft',
  description: 'A category the test holds',
  groupId: GROUPS[1].id,
};

function renderForm(props: Partial<CategoryFormProps> = {}) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CategoryForm groups={GROUPS} onDone={onDone} {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

// The tests it shares with IngredientFormValueForm: tests/support/grouped-value-form.tsx.
const SUBJECT: GroupedValueFormSubject = {
  noun: 'Category',
  describeRefusal: 'Describe the category',
  groups: [GROUPS[0], GROUPS[1]],
  value: CATEGORY,
  render: ({ onDone, editing }) => (
    <CategoryForm groups={GROUPS} onDone={onDone} category={editing ? CATEGORY : undefined} />
  ),
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

describe('CategoryForm', () => {
  describe('adding', () => {
    it.each(ADDING)('%s', (_, run) => run(SUBJECT));

    it('starts empty, the group unchosen', () => {
      renderForm();

      expect(name()).toHaveValue('');
      expect(description()).toHaveValue('');
      expect(group()).toHaveTextContent('Choose a group');
      expect(screen.queryByRole('button', { name: 'Delete Category' })).not.toBeInTheDocument();
    });

    it('creates the category from what was entered, then is done', async () => {
      const calls: CreateCategoryMutationVariables[] = [];
      mockGraphQLMutation<CreateCategoryMutation, CreateCategoryMutationVariables>(
        'CreateCategory',
        (variables) => {
          calls.push(variables);
          return { createCategory: { id: CATEGORY.id, slug: 'testcraft' } };
        },
      );
      const onDone = renderForm();

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
            groupId: GROUPS[1].id,
          },
        },
      ]);
    });
  });

  describe('editing', () => {
    it.each(EDITING)('%s', (_, run) => run(SUBJECT));

    it('starts from the category as it is', () => {
      renderForm({ category: CATEGORY });

      expect(name()).toHaveValue('Testcraft');
      expect(description()).toHaveValue('A category the test holds');
      expect(group()).toHaveTextContent('Fixture Healing');
    });

    it('saves the whole category under its id, then is done', async () => {
      const calls: UpdateCategoryMutationVariables[] = [];
      mockGraphQLMutation<UpdateCategoryMutation, UpdateCategoryMutationVariables>(
        'UpdateCategory',
        (variables) => {
          calls.push(variables);
          return { updateCategory: { id: CATEGORY.id, slug: 'testcraft-renamed' } };
        },
      );
      const onDone = renderForm({ category: CATEGORY });

      type(name(), 'Testcraft Renamed');
      press('Save Category');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          id: CATEGORY.id,
          input: {
            name: 'Testcraft Renamed',
            description: 'A category the test holds',
            groupId: GROUPS[1].id,
          },
        },
      ]);
    });
  });

  describe('deleting', () => {
    it.each(DELETING)('%s', (_, run) => run(SUBJECT));

    it('asks first, saying what a coven loses, and deletes nothing on Keep It', () => {
      const onDone = renderForm({ category: CATEGORY });

      press('Delete Category');

      expect(
        screen.getByText(
          'Delete "Testcraft"? Covens\' ingredients and spells filed under it lose it too.',
        ),
      ).toBeInTheDocument();
      press('Keep It');
      expect(screen.getByRole('button', { name: 'Delete Category' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('shows the refusal of a category still in the compendium, and stays open', async () => {
      const message =
        '"Testcraft" is filed on 1 compendium entry — Testwort. Take it off it first.';
      mockGraphQLError('DeleteCategory', { code: 'FORBIDDEN', message });
      const onDone = renderForm({ category: CATEGORY });

      press('Delete Category');
      press('Delete');

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: 'Delete Category' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});
