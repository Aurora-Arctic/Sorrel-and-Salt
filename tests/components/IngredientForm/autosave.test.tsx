import { act, fireEvent, screen } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormProps, IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { mirrorKey, readMirror, writeMirror } from '@/lib/autosave';
import { ViewerIdProvider } from '@/lib/viewer-id';
import { server } from '../../support/msw/server';
import { graphqlLink, mockGraphQLError } from '../../support/msw/graphql';
import { duplicateHref, renderWithClient, textbox, waitFor } from '../../support/ingredient-form';
import { renderInModal } from '../../support/discard-guard';
import { press, type } from '../../support/interact';
import {
  ENTRY_ID,
  WORKSPACE_ID,
  acceptCovenUpdate,
  acceptCreate,
  offerNothing,
  offerDuplicates,
} from '../../support/msw/ingredient-lookups';

// The ingredient form's autosave: what it sends, to whom, and what it keeps in the browser. The save
// machinery itself is the engine's, tests/lib/autosave/use-autosave.test.tsx.

const USER = 'u1';
const SAVED: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'none',
};
const OPENED = { id: ENTRY_ID, values: SAVED, revision: 3, updatedAt: '2026-10-27T14:00:00.000Z' };

function renderForm(props: Partial<IngredientFormProps> = {}) {
  offerNothing();
  const onSaved = vi.fn();
  const onCreated = vi.fn();
  renderWithClient(
    <ViewerIdProvider id={USER}>
      <IngredientForm
        duplicateHref={duplicateHref}
        workspaceId={WORKSPACE_ID}
        onSaved={onSaved}
        onCreated={onCreated}
        {...props}
      />
    </ViewerIdProvider>,
  );
  return { onSaved, onCreated };
}

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('a new ingredient', () => {
  it('is created once, three seconds after it has a name, and later changes update it', async () => {
    const created = acceptCreate();
    const updated = acceptCovenUpdate();
    const { onCreated } = renderForm();

    type('Name', 'Testwort');
    await wait(2900);
    expect(created).toHaveLength(0);
    for (let tick = 0; tick < 10 && created.length === 0; tick += 1) await wait(1500);
    expect(created).toHaveLength(1);

    await waitFor(() => expect(created).toHaveLength(1));
    expect(onCreated).toHaveBeenCalledOnce();

    type('Name', 'Testworts');
    await wait(3100);

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(created).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: 'saved-1', expectedRevision: 1 });
    expect(updated[0].input.name).toBe('Testworts');
  });

  it('is created once when Save is pressed, and the autosave then has nothing to create', async () => {
    const created = acceptCreate();
    const { onSaved } = renderForm();

    type('Name', 'Testwort');
    press('Save Ingredient');
    // The button goes busy and loses focus to nothing, which the autosave reads as leaving the form.
    fireEvent.focusOut(screen.getByRole('textbox', { name: 'Name' }), { relatedTarget: null });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    await wait(4000);

    expect(created).toHaveLength(1);
  });

  it('is not created while it has no name', async () => {
    const created = acceptCreate();
    renderForm();

    type('Description', 'Only a description');
    await wait(3100);

    expect(created).toHaveLength(0);
  });
});

describe('an ingredient opened for editing', () => {
  it('updates itself at the revision it opened at, then at the one it was answered', async () => {
    const updated = acceptCovenUpdate();
    renderForm({ entry: OPENED });

    type('Name', 'Mockwort');
    await wait(3100);
    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]).toMatchObject({ id: ENTRY_ID, expectedRevision: 3 });

    type('Name', 'Mockworts');
    await wait(3100);
    await waitFor(() => expect(updated).toHaveLength(2));
    expect(updated[1]).toMatchObject({ expectedRevision: 4 });
  });

  it('saves a renamed entry while Did You Mean shows, and leaves the list showing', async () => {
    const updated = acceptCovenUpdate();
    renderForm({ entry: OPENED });
    offerDuplicates([{ id: 'claw-1', name: 'Mockleaf', canonicalName: null, slug: 'mockleaf' }]);

    type('Name', 'Mockleaf');
    await wait(600);
    await screen.findByText('Did you mean one of these?');
    await wait(3100);

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0].input.name).toBe('Mockleaf');
    expect(screen.getByText('Did you mean one of these?')).toBeInTheDocument();
  });

  it('offers no Cancel, and saves an unsaved change as the modal closes, asking nothing', async () => {
    const updated = acceptCovenUpdate();
    offerNothing();
    const onClose = renderInModal(() => (
      <ViewerIdProvider id={USER}>
        <IngredientForm duplicateHref={duplicateHref} workspaceId={WORKSPACE_ID} entry={OPENED} />
      </ViewerIdProvider>
    ));
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    type('Name', 'Mockwort');
    press('Close');

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(updated).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Discard Changes' })).toBeNull();
  });
});

describe('a save that does not get through', () => {
  it('says so with Retry, keeps the form in the browser, and a retry saves and clears the copy', async () => {
    server.use(graphqlLink.mutation('UpdateWorkspaceIngredient', () => HttpResponse.error()));
    renderForm({ entry: OPENED });

    type('Name', 'Mockwort');
    await wait(30000);

    expect(await screen.findByText(/Could not save\./)).toBeInTheDocument();
    expect(
      readMirror(mirrorKey({ entity: 'ingredient', id: ENTRY_ID, userId: USER })),
    ).not.toBeNull();

    const updated = acceptCovenUpdate();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(updated).toHaveLength(1));
    await waitFor(() =>
      expect(
        readMirror(mirrorKey({ entity: 'ingredient', id: ENTRY_ID, userId: USER })),
      ).toBeNull(),
    );
    expect(screen.queryByText(/Could not save\./)).toBeNull();
  });
});

describe('a save someone else got in first', () => {
  async function conflict(onReload = vi.fn()) {
    const updated = acceptCovenUpdate();
    mockGraphQLError('UpdateWorkspaceIngredient', { code: 'STALE_WRITE', currentRevision: 5 });
    renderForm({ entry: OPENED, onReload });
    type('Name', 'Mine');
    await wait(3100);
    expect(await screen.findByText('This ingredient was changed elsewhere.')).toBeInTheDocument();
    return { updated, onReload };
  }

  it('Keep My Version sends the form again at the revision the server is at', async () => {
    const { updated } = await conflict();
    // The refusal was the last handler added; an acceptance added now answers instead.
    const sent = acceptCovenUpdate();

    fireEvent.click(screen.getByRole('button', { name: 'Keep My Version' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(updated).toHaveLength(0);
    expect(sent[0]).toMatchObject({ id: ENTRY_ID, expectedRevision: 5 });
    expect(sent[0].input.name).toBe('Mine');
    await waitFor(() =>
      expect(screen.queryByText('This ingredient was changed elsewhere.')).toBeNull(),
    );
  });

  it('Reload Latest hands the page the reload and forgets the copy kept here', async () => {
    const { onReload } = await conflict();

    fireEvent.click(screen.getByRole('button', { name: 'Reload Latest' }));

    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(readMirror(mirrorKey({ entity: 'ingredient', id: ENTRY_ID, userId: USER }))).toBeNull();
  });
});

describe('the recovery banner', () => {
  const key = mirrorKey({ entity: 'ingredient', id: ENTRY_ID, userId: USER });
  const kept = { fields: { ...SAVED, name: 'From the mirror' }, reviewed: false };

  it('offers a copy newer than the saved ingredient, and Keep loads it', async () => {
    writeMirror(key, kept, new Date());
    renderForm({ entry: OPENED });

    expect(await screen.findByText(/^Restored unsaved changes from/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(textbox('Name')).toHaveValue('From the mirror');
    expect(screen.queryByText(/^Restored unsaved changes from/)).toBeNull();
  });

  it('forgets the copy on Discard and leaves the form as the server has it', async () => {
    writeMirror(key, kept, new Date());
    renderForm({ entry: OPENED });

    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));

    expect(readMirror(key)).toBeNull();
    expect(textbox('Name')).toHaveValue('Testwort');
  });

  it('says nothing of a copy older than the saved ingredient, and removes it', async () => {
    writeMirror(key, kept, new Date('2026-10-27T13:00:00.000Z'));
    renderForm({ entry: OPENED });

    await waitFor(() => expect(readMirror(key)).toBeNull());
    expect(screen.queryByText(/^Restored unsaved changes from/)).toBeNull();
  });
});
