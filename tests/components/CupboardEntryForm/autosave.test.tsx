import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardEntryForm from '@/components/CupboardEntryForm';
import type {
  CompendiumValues,
  CupboardEntryFormProps,
  CupboardOverrides,
} from '@/components/CupboardEntryForm/types';
import type {
  AnnotateCupboardEntryMutation,
  AnnotateCupboardEntryMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { typeIn } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The annotation form's autosave: what it sends and against which revision. The save machinery itself
// is the engine's, tests/lib/autosave/use-autosave.test.tsx.

type Variables = AnnotateCupboardEntryMutationVariables;

const COMPENDIUM: CompendiumValues = {
  name: 'Testwort',
  description: 'A plant the fixtures grow.',
  safetyNotes: null,
  elements: ['water'],
  celestialBodies: [],
  zodiacSigns: [],
  colors: [],
};
const NONE: CupboardOverrides = {
  label: null,
  description: null,
  safetyNotes: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
};

function renderForm(props: Partial<CupboardEntryFormProps> = {}) {
  const onDone = vi.fn();
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <CupboardEntryForm
        workspaceId="00000000-0000-4000-8000-000000000001"
        ingredientId="00000000-0000-4000-8000-000000000002"
        compendium={COMPENDIUM}
        overrides={NONE}
        revision={3}
        onDone={onDone}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onDone, ...view };
}

/** Accepts each save, answering the revision after the one it was written against. */
function acceptSaves(): Variables[] {
  const calls: Variables[] = [];
  mockGraphQLMutation<AnnotateCupboardEntryMutation, Variables>(
    'AnnotateCupboardEntry',
    (variables) => {
      calls.push(variables);
      return {
        annotateCupboardEntry: { id: 'fixture', revision: (variables.expectedRevision ?? 0) + 1 },
      };
    },
  );
  return calls;
}

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const label = () => screen.getByRole('textbox', { name: 'Label' });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the annotation form saves as it is edited', () => {
  it('saves a change three seconds on, with Save never pressed, and stays open', async () => {
    const calls = acceptSaves();
    const { onDone } = renderForm();

    typeIn(label(), 'Fixture Wort');
    await wait(2900);
    expect(calls).toHaveLength(0);
    await wait(300);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ input: { label: 'Fixture Wort' }, expectedRevision: 3 });
    expect(onDone).not.toHaveBeenCalled();
    expect((await screen.findAllByText(/^Saved /)).length).toBeGreaterThan(0);
  });

  it('writes the next save against the revision the last one answered with, and sends only what changed since', async () => {
    const calls = acceptSaves();
    renderForm();

    typeIn(label(), 'Fixture Wort');
    await wait(3100);
    await waitFor(() => expect(calls).toHaveLength(1));
    typeIn(screen.getByRole('textbox', { name: 'Safety Notes' }), 'Mind the thorns');
    await wait(3100);

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toMatchObject({
      input: { safetyNotes: 'Mind the thorns' },
      expectedRevision: 4,
    });
  });

  it('opens at the saved annotation, so a reload shows the edit', async () => {
    const calls = acceptSaves();
    const first = renderForm();
    typeIn(label(), 'Fixture Wort');
    await wait(3100);
    await waitFor(() => expect(calls).toHaveLength(1));
    first.unmount();

    // A reload reads the row the save wrote: the label, at the revision it answered.
    renderForm({ overrides: { ...NONE, label: 'Fixture Wort' }, revision: 4 });

    expect(label()).toHaveValue('Fixture Wort');
    expect(screen.getByRole('button', { name: 'Save Annotation' })).toBeDisabled();
  });

  it('offers Keep My Version after a save someone else got in first, and sends it at their revision', async () => {
    mockGraphQLError('AnnotateCupboardEntry', { code: 'STALE_WRITE', currentRevision: 7 });
    renderForm();
    typeIn(label(), 'Mine');
    await wait(3100);
    expect(await screen.findByText('This entry was changed elsewhere.')).toBeInTheDocument();

    const sent = acceptSaves();
    fireEvent.click(screen.getByRole('button', { name: 'Keep My Version' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ input: { label: 'Mine' }, expectedRevision: 7 });
  });
});
