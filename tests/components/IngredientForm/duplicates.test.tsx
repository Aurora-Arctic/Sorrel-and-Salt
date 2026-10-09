import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NameField, useDuplicateWarning } from '@/components/IngredientForm/duplicates';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError } from '../../support/msw/graphql';
import { WORKSPACE_ID, offerDuplicates } from '../../support/msw/ingredient-lookups';
import type { DuplicateNode } from './types';

// Story 16's warning on its own (MB.181): `useDuplicateWarning` and the
// `NameField` that draws it, in a form whose save asks the warning's `check`
// before it sends, as the form's does. What only the whole form does with it
// — the focus on Create Anyway, Save busy while it checks, an error elsewhere
// first — is index.test.tsx's (claude-docs/components/ingredient-form.md,
// "Testing").

const TOMENTOSA: DuplicateNode = {
  id: 'claw-1',
  name: "Cat's Claw",
  canonicalName: 'Uncaria tomentosa',
  slug: 'cats-claw-uncaria-tomentosa',
};
const FELIS: DuplicateNode = {
  id: 'claw-2',
  name: "Cat's Claw",
  canonicalName: 'Felis catus',
  slug: 'cats-claw-felis-catus',
};
const MOCKLEAF: DuplicateNode = {
  id: 'mock-1',
  name: 'Mockleaf',
  canonicalName: null,
  slug: 'mockleaf',
};
const SENTENCE = "Did you mean Cat's Claw (Uncaria tomentosa)?";

/** The name field and its warning; a save that the warning does not hold calls `sent` with the name. */
function renderName() {
  const sent = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues>({ defaultValues: EMPTY_VALUES });
    const warning = useDuplicateWarning(
      WORKSPACE_ID,
      useWatch({ control: methods.control, name: 'name' }),
    );
    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(async ({ name }) => {
            if (!(await warning.check(name))) sent(name);
          })}
        >
          {/* No ref: moving the focus to Create Anyway is the form's. */}
          <NameField warning={warning} ref={null} />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return sent;
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const type = (value: string) => fireEvent.change(name(), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));
const warning = () => screen.getByRole('status', { name: 'Possible duplicates' });
const createAnyway = () => screen.queryByRole('button', { name: 'Create Anyway' });
/** Lets a save that may have started reach its end. */
const settleSave = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});
const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));

describe('NameField, with useDuplicateWarning', () => {
  it('asks once the name settles, with the whole name trimmed, about this coven', async () => {
    renderName();
    const calls = offerDuplicates([]);

    type('C');
    type('Cats Claw ');
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(calls).toHaveLength(0);

    settle();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, name: 'Cats Claw', first: 3 });
  });

  it('asks nothing for a blank name, and drops the warning the last name had', async () => {
    renderName();
    const calls = offerDuplicates([TOMENTOSA]);
    type('Cats Claw');
    settle();
    await within(warning()).findByRole('link');

    type('   ');
    settle();

    expect(warning()).toBeEmptyDOMElement();
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
    expect(calls).toHaveLength(1);
  });

  it('names each near match by its label and formal name, linked to the entry', async () => {
    renderName();
    offerDuplicates([TOMENTOSA, FELIS, MOCKLEAF]);

    type('Cats Claw');
    settle();

    const tomentosa = await within(warning()).findByRole('link', {
      name: "Cat's Claw (Uncaria tomentosa)",
    });
    expect(warning()).toHaveTextContent(
      "Did you mean Cat's Claw (Uncaria tomentosa), Cat's Claw (Felis catus) or Mockleaf?",
    );
    expect(tomentosa).toHaveAttribute('href', '/ingredients/claw-1');
    expect(screen.getByRole('link', { name: "Cat's Claw (Felis catus)" })).toHaveAttribute(
      'href',
      '/ingredients/claw-2',
    );
    expect(screen.getByRole('link', { name: 'Mockleaf' })).toHaveAttribute(
      'href',
      '/ingredients/mock-1',
    );
    // Read with the field, as its hint is, and not an error until a save meets it.
    expect(name()).toHaveAccessibleDescription(expect.stringContaining('Did you mean'));
    expect(name()).not.toBeInvalid();
  });

  it('warns of nothing when nothing is close, and lets the save through', async () => {
    const sent = renderName();
    const calls = offerDuplicates([]);

    type('Fixture Nothingalike');
    settle();
    await waitFor(() => expect(calls).toHaveLength(1));

    expect(warning()).toBeEmptyDOMElement();
    expect(createAnyway()).not.toBeInTheDocument();
    expect(name()).not.toHaveAccessibleDescription(expect.stringContaining('Did you mean'));
    save();
    await waitFor(() => expect(sent).toHaveBeenCalledWith('Fixture Nothingalike'));
  });

  it('holds a save while a match shows, as an error on the name, read with Create Anyway', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();

    await waitFor(() => expect(name()).toBeInvalid());
    expect(name()).toHaveAccessibleDescription(expect.stringContaining(SENTENCE));
    // The warning is read with the button, so the focus the form moves there says why.
    expect(createAnyway()).toHaveAccessibleDescription(SENTENCE);
    expect(sent).not.toHaveBeenCalled();

    // Again, and it holds again.
    save();
    await settleSave();
    expect(sent).not.toHaveBeenCalled();
  });

  it('checks a name saved before its typing settles, and holds on what it finds', async () => {
    const sent = renderName();
    const calls = offerDuplicates([TOMENTOSA]);

    type("Cat's Claw ");
    save();

    // No wait for the debounce: the save asks about the name it is sending.
    await waitFor(() => expect(name()).toBeInvalid());
    expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, name: "Cat's Claw", first: 3 }]);
    expect(warning()).toHaveTextContent(SENTENCE);
    expect(sent).not.toHaveBeenCalled();
  });

  it('lifts the hold when the name changes, a new match only warning', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);
    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();
    await waitFor(() => expect(name()).toBeInvalid());

    offerDuplicates([TOMENTOSA, FELIS]);
    type("Cat's Claws");
    settle();
    await within(warning()).findByRole('link', { name: "Cat's Claw (Felis catus)" });

    expect(name()).not.toBeInvalid();
    expect(sent).not.toHaveBeenCalled();
  });

  it('goes on Create Anyway, handing the focus back to the name, and the next save goes', async () => {
    const sent = renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    save();
    await waitFor(() => expect(name()).toBeInvalid());
    fireEvent.click(createAnyway() as HTMLElement);

    expect(warning()).toBeEmptyDOMElement();
    expect(name()).toHaveFocus();
    expect(name()).not.toBeInvalid();
    save();
    await waitFor(() => expect(sent).toHaveBeenCalledWith("Cat's Claw"));
  });

  it('stays gone for the matches set aside, and returns for a new one', async () => {
    renderName();
    offerDuplicates([TOMENTOSA]);

    type("Cat's Claw");
    settle();
    await within(warning()).findByRole('link');
    fireEvent.click(createAnyway() as HTMLElement);

    // A longer name finding the same entry: already answered.
    const again = offerDuplicates([TOMENTOSA]);
    type("Cat's Claws");
    settle();
    await waitFor(() => expect(again).toHaveLength(1));
    expect(warning()).toBeEmptyDOMElement();

    // One it has not been asked about.
    offerDuplicates([TOMENTOSA, FELIS]);
    type("Cat's Clawe");
    settle();
    const felis = await within(warning()).findByRole('link', {
      name: "Cat's Claw (Felis catus)",
    });
    expect(felis).toBeInTheDocument();
    expect(within(warning()).queryByRole('link', { name: /tomentosa/ })).not.toBeInTheDocument();
  });

  it('shows nothing, and lets the save through, when the lookup fails', async () => {
    const sent = renderName();
    mockGraphQLError('PossibleDuplicates', { code: 'FORBIDDEN' });

    type("Cat's Claw");
    settle();
    save();

    await waitFor(() => expect(sent).toHaveBeenCalledWith("Cat's Claw"));
    expect(warning()).toBeEmptyDOMElement();
  });
});
