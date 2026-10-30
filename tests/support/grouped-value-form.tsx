import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw/http';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import GroupedValueForm from '@/components/GroupedValueForm';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from './msw/graphql';
import { server } from './msw/server';
import { choose, press, type } from './interact';
import type { GroupedValueFormCase, GroupedValueFormSubject } from './types';

// GroupedValueForm is one form for every grouped vocabulary. What every kind shares is written once as rows
// tests/components/GroupedValueForm runs with `it.each`; a kind gets its own describe only for what it changes.
// The group field is found by the subject's own label.

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const button = (label: string) => screen.getByRole('button', { name: label });
const group = (subject: GroupedValueFormSubject) =>
  screen.getByRole('combobox', { name: subject.groupLabel });

function renderSubject(subject: GroupedValueFormSubject, editing = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <GroupedValueForm
        kind={subject.kind}
        value={editing ? subject.value : undefined}
        groups={subject.groups}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
  return onDone;
}

export const ADDING: GroupedValueFormCase[] = [
  // The owner's rule for every form: Save is offered only when there is
  // something to save.
  [
    'keeps Save off until something is entered',
    (subject) => {
      renderSubject(subject);
      const save = () => button(`Save ${subject.noun}`);

      expect(save()).toBeDisabled();
      type('Name', 'T');
      expect(save()).toBeEnabled();
      type('Name', '');
      expect(save()).toBeDisabled();
    },
  ],
  [
    'refuses a blank description and group before asking the server',
    async (subject) => {
      const onDone = renderSubject(subject);

      type('Name', subject.value.name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(description()).toHaveAttribute('aria-invalid', 'true'));
      expect(description()).toHaveAccessibleDescription(/\S/);
      expect(group(subject)).toHaveAttribute('aria-invalid', 'true');
      expect(group(subject)).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
  [
    'is busy and held down until the answer',
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
      type('Name', subject.value.name);
      type('Description', 'Held');
      choose(subject.groupLabel, subject.groups[0].name);
      const busy = button(`Save ${subject.noun}`);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
      expect(busy).toBeDisabled();
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    },
  ],
  // The group is typed into, the list narrowing as it is, and only a listed group is ever the value.
  [
    'takes its group by typing, the list narrowing to the groups holding the text',
    async (subject) => {
      const calls: { input: object }[] = [];
      mockGraphQLMutation(subject.create.operation, (variables: { input: object }) => {
        calls.push(variables);
        return subject.create.data;
      });
      const onDone = renderSubject(subject);
      const [, chosen] = subject.groups;

      type('Name', subject.value.name);
      type('Description', 'Typed');
      type(subject.groupLabel, chosen.name.slice(-4).toUpperCase());
      const list = screen.getByRole('listbox', { name: `${subject.groupLabel} choices` });
      expect(within(list).getAllByRole('option')).toHaveLength(1);
      fireEvent.keyDown(group(subject), { key: 'Enter' });
      expect(group(subject)).toHaveValue(chosen.name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      // Under the kind's own key for its group, `groupId` or `traditionId`.
      expect(Object.values(calls[0]?.input ?? {})).toContain(chosen.id);
    },
  ],
  [
    "lands the server's slug refusal beside Name",
    async (subject) => {
      mockGraphQLError(subject.create.operation, {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: subject.slugClash.message }],
      });
      const onDone = renderSubject(subject);

      type('Name', subject.slugClash.name);
      type('Description', 'A clash');
      choose(subject.groupLabel, subject.groups[0].name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(name()).toHaveAttribute('aria-invalid', 'true'));
      expect(name()).toHaveAccessibleDescription(/\S/);
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
      choose(subject.groupLabel, subject.groups[0].name);
      expect(save()).toBeEnabled();
      choose(subject.groupLabel, subject.groups[1].name);
      expect(save()).toBeDisabled();
    },
  ],
  [
    'holds no group while the text names none, and refuses it on Save',
    async (subject) => {
      // No answer is set up: the form refuses it before asking the server.
      const onDone = renderSubject(subject, true);

      expect(group(subject)).not.toHaveAttribute('aria-invalid');
      type(subject.groupLabel, subject.groups[1].name.slice(0, -1));
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(group(subject)).toHaveAttribute('aria-invalid', 'true'));
      expect(group(subject)).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
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
