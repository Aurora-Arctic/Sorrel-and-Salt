import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from './msw/graphql';
import { server } from './msw/server';
import type { GroupedValueFormCase, GroupedValueFormSubject } from './types';

// CategoryForm and IngredientFormValueForm are one form twice: a name, a
// description and a group, saved through a create, an update and a delete
// mutation. The tests the two copies share are written once, here, as rows
// each file runs with `it.each` under its own describe, so a third copy is a
// subject rather than a file (MB.189). What only one of them does — the
// rename note, the redirect question, its own confirmation and refusals —
// stays in its own file.

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const group = () => screen.getByRole('combobox', { name: 'Group' });
const button = (label: string) => screen.getByRole('button', { name: label });
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const press = (label: string) => {
  button(label).focus();
  fireEvent.click(button(label));
};
const chooseGroup = (label: string) => {
  fireEvent.click(group());
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Group choices' })).getByRole('option', {
      name: label,
    }),
  );
};

function renderSubject(subject: GroupedValueFormSubject, editing = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      {subject.render({ onDone, editing })}
    </QueryClientProvider>,
  );
  return onDone;
}

export const ADDING: GroupedValueFormCase[] = [
  // A field named "name" reads to Chrome as a person's name: it flags it in
  // the Issues panel and offers the user's own name to fill it.
  [
    'turns autofill off on the name, which names no person',
    (subject) => {
      renderSubject(subject);

      expect(name()).toHaveAttribute('autocomplete', 'off');
    },
  ],
  [
    'marks every field required',
    (subject) => {
      renderSubject(subject);

      // The asterisk is for the eye; the name stays the label alone.
      expect(name()).toHaveAttribute('aria-required', 'true');
      expect(description()).toHaveAttribute('aria-required', 'true');
      expect(group()).toBeRequired();
    },
  ],
  // The owner's rule for every form: Save is offered only when there is
  // something to save.
  [
    'keeps Save off until something is entered',
    (subject) => {
      renderSubject(subject);
      const save = () => button(`Save ${subject.noun}`);

      expect(save()).toBeDisabled();
      type(name(), 'T');
      expect(save()).toBeEnabled();
      type(name(), '');
      expect(save()).toBeDisabled();
    },
  ],
  [
    'refuses a blank description and group before asking the server',
    async (subject) => {
      const onDone = renderSubject(subject);

      type(name(), subject.value.name);
      press(`Save ${subject.noun}`);

      expect(await screen.findByText(subject.describeRefusal)).toBeInTheDocument();
      expect(description()).toHaveAccessibleDescription(subject.describeRefusal);
      expect(group()).toHaveAccessibleDescription('Choose a group');
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
  [
    'says it is saving, busy and held down, until the answer',
    async (subject) => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation(subject.create.operation, async () => {
          await held;
          return HttpResponse.json({ data: subject.create.data });
        }),
      );
      const onDone = renderSubject(subject);
      type(name(), subject.value.name);
      type(description(), 'Held');
      chooseGroup(subject.groups[0].name);
      press(`Save ${subject.noun}`);

      const busy = await screen.findByRole('button', { name: `Saving ${subject.noun}` });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    },
  ],
  [
    "lands the server's slug refusal beside Name",
    async (subject) => {
      const { message } = subject.slugClash;
      mockGraphQLError(subject.create.operation, {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message }],
      });
      const onDone = renderSubject(subject);

      type(name(), subject.slugClash.name);
      type(description(), 'A clash');
      chooseGroup(subject.groups[0].name);
      press(`Save ${subject.noun}`);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(name()).toHaveAccessibleDescription(message);
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
];

export const EDITING: GroupedValueFormCase[] = [
  [
    'keeps Save off until something changes, and off again once it is put back',
    (subject) => {
      renderSubject(subject, true);
      const save = () => button(`Save ${subject.noun}`);

      expect(save()).toBeDisabled();
      chooseGroup(subject.groups[0].name);
      expect(save()).toBeEnabled();
      chooseGroup(subject.groups[1].name);
      expect(save()).toBeDisabled();
    },
  ],
  [
    'is done without saving on Cancel',
    (subject) => {
      const onDone = renderSubject(subject, true);

      press('Cancel');

      expect(onDone).toHaveBeenCalledTimes(1);
    },
  ],
];

export const DELETING: GroupedValueFormCase[] = [
  [
    'deletes on confirmation, then is done',
    async (subject) => {
      const calls: unknown[] = [];
      mockGraphQLMutation(subject.remove.operation, (variables) => {
        calls.push(variables);
        return subject.remove.data;
      });
      const onDone = renderSubject(subject, true);

      press(`Delete ${subject.noun}`);
      press('Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: subject.value.id }]);
    },
  ],
];
