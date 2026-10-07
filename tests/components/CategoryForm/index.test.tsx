import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoryForm from '@/components/CategoryForm';
import type { CategoryFormProps } from '@/components/CategoryForm/types';
import type {
  CreateCategoryMutation,
  CreateCategoryMutationVariables,
  DeleteCategoryMutation,
  DeleteCategoryMutationVariables,
  UpdateCategoryMutation,
  UpdateCategoryMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

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
    it('starts empty, the group unchosen', () => {
      renderForm();

      expect(name()).toHaveValue('');
      expect(description()).toHaveValue('');
      expect(group()).toHaveTextContent('Choose a group');
      expect(screen.queryByRole('button', { name: 'Delete Category' })).not.toBeInTheDocument();
    });

    // A field named "name" reads to Chrome as a person's name: it flags it in
    // the Issues panel and offers the user's own name to fill it.
    it('turns autofill off on the name, which names no person', () => {
      renderForm();

      expect(name()).toHaveAttribute('autocomplete', 'off');
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

    it('marks every field required', () => {
      renderForm();

      // The asterisk is for the eye; the name stays the label alone.
      expect(name()).toHaveAttribute('aria-required', 'true');
      expect(description()).toHaveAttribute('aria-required', 'true');
      expect(group()).toBeRequired();
    });

    // The owner's rule for every form: Save is offered only when there is
    // something to save.
    it('keeps Save off until something is entered', () => {
      renderForm();

      expect(screen.getByRole('button', { name: 'Save Category' })).toBeDisabled();
      type(name(), 'T');
      expect(screen.getByRole('button', { name: 'Save Category' })).toBeEnabled();
      type(name(), '');
      expect(screen.getByRole('button', { name: 'Save Category' })).toBeDisabled();
    });

    it('refuses a blank description and group before asking the server', async () => {
      const onDone = renderForm();

      type(name(), 'Testcraft');
      press('Save Category');

      expect(await screen.findByText('Describe the category')).toBeInTheDocument();
      expect(description()).toHaveAccessibleDescription('Describe the category');
      expect(group()).toHaveAccessibleDescription('Choose a group');
      expect(onDone).not.toHaveBeenCalled();
    });

    it('says it is saving, busy and held down, until the answer', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation('CreateCategory', async () => {
          await held;
          return HttpResponse.json({
            data: { createCategory: { id: CATEGORY.id, slug: 'testcraft' } },
          });
        }),
      );
      const onDone = renderForm();
      type(name(), 'Testcraft');
      type(description(), 'Held');
      chooseGroup('Fixture Healing');
      press('Save Category');

      const busy = await screen.findByRole('button', { name: 'Saving Category' });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });

    it("lands the server's slug refusal beside Name", async () => {
      const message =
        '"Testcraft Ward" already has the address "testcraft-ward" — choose another name';
      mockGraphQLError('CreateCategory', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message }],
      });
      const onDone = renderForm();

      type(name(), 'Testcraft-Ward');
      type(description(), 'A clash');
      chooseGroup('Fixture Protection');
      press('Save Category');

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(name()).toHaveAccessibleDescription(message);
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
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

    it('keeps Save off until something changes, and off again once it is put back', () => {
      renderForm({ category: CATEGORY });
      const save = () => screen.getByRole('button', { name: 'Save Category' });

      expect(save()).toBeDisabled();
      chooseGroup('Fixture Protection');
      expect(save()).toBeEnabled();
      chooseGroup('Fixture Healing');
      expect(save()).toBeDisabled();
    });

    it('is done without saving on Cancel', () => {
      const onDone = renderForm({ category: CATEGORY });

      press('Cancel');

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleting', () => {
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

    it('deletes on confirmation, then is done', async () => {
      const calls: DeleteCategoryMutationVariables[] = [];
      mockGraphQLMutation<DeleteCategoryMutation, DeleteCategoryMutationVariables>(
        'DeleteCategory',
        (variables) => {
          calls.push(variables);
          return { deleteCategory: CATEGORY.id };
        },
      );
      const onDone = renderForm({ category: CATEGORY });

      press('Delete Category');
      press('Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: CATEGORY.id }]);
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
