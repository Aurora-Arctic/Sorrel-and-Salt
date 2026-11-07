import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables } from '@/gql/graphql';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { warmImport } from '../../support/warm-import';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');

// The editor is a lazy chunk: its first import is slow under coverage and would overrun findByRole's 1 s wait.
warmImport(() => import('@/components/DocumentEditor/editor'));
const { NavigationProvider } = await import('@/lib/navigation');

const PUBLISHED = 'Fixturewort grows here.';
const DRAFT = 'Fixturewort grows in the draft.';
const RESTORE = 'Restore Published Version';
/** Longer than the autosave waits after a change, so a save it would make has been sent. */
const PAST_AUTOSAVE_MS = 3100;

type DiscardVariables = { documentId: string; expectedRevision: number };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderEditor({ body, revision }: { body: string; revision: number | null }) {
  render(
    <NavigationProvider>
      <DocumentEditor
        documentId="d1"
        documentKey="disclaimer"
        title="Disclaimer"
        lede="What the site does not promise."
        body={body}
        publishedBody={PUBLISHED}
        revision={revision}
        nextNumber={2}
      />
    </NavigationProvider>,
  );
  return screen.findByRole('textbox', { name: 'Document Text' });
}

async function change(text: HTMLElement): Promise<void> {
  const node = document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode() as Text;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, 'Fixturewort'.length);
  await act(async () => {
    text.focus();
    fireEvent.focus(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await vi.advanceTimersByTimeAsync(150);
  });
  fireEvent.click(
    within(screen.getByRole('toolbar', { name: 'Document Text Formatting' })).getByRole('button', {
      name: 'Bold',
    }),
  );
  await waitFor(() => expect(saveDraft()).toBeEnabled());
}

function acceptDiscards(): DiscardVariables[] {
  const sent: DiscardVariables[] = [];
  mockGraphQLMutation<{ discardDocumentDraft: string }, DiscardVariables>(
    'DiscardDocumentDraft',
    (variables) => {
      sent.push(variables);
      return { discardDocumentDraft: 'v3' };
    },
  );
  return sent;
}

function recordSaves(): SaveDocumentDraftMutationVariables[] {
  const sent: SaveDocumentDraftMutationVariables[] = [];
  mockGraphQLMutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
    'SaveDocumentDraft',
    (variables) => {
      sent.push(variables);
      return { saveDocumentDraft: { id: 'v3', revision: 9 } };
    },
  );
  return sent;
}

const saveDraft = () => screen.getByRole('button', { name: 'Save Draft' });
const publish = () => screen.getByRole('button', { name: 'Publish' });
const restore = () => screen.queryByRole('button', { name: RESTORE });

function restoreUnavailable(): boolean {
  const button = restore();
  return button === null || (button as HTMLButtonElement).disabled;
}

function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Confirms the question, in `act`: the restore's updates follow the click by a few promise turns. */
async function confirm(question: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(within(question).getByRole('button', { name: RESTORE }));
  });
}

async function restoreAndConfirm(): Promise<void> {
  fireEvent.click(restore()!);
  await confirm(await screen.findByRole('dialog', { name: RESTORE }));
}

const waitPastAutosave = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(PAST_AUTOSAVE_MS);
  });

describe('Restore Published Version', () => {
  it('asks first, then discards the draft at its revision and shows the published text with nothing to save', async () => {
    const discards = acceptDiscards();
    const saves = recordSaves();
    const text = await renderEditor({ body: DRAFT, revision: 3 });
    // Preconditions: the editor shows the draft, and the draft can be published.
    expect(text).toHaveTextContent(DRAFT);
    expect(publish()).toBeEnabled();
    expect(restoreUnavailable()).toBe(false);

    fireEvent.click(restore()!);
    const question = await screen.findByRole('dialog', { name: RESTORE });
    expect(discards).toEqual([]);
    await confirm(question);

    await waitFor(() => expect(discards).toEqual([{ documentId: 'd1', expectedRevision: 3 }]));
    await waitFor(() => expect(text).toHaveTextContent(PUBLISHED));
    expect(text).not.toHaveTextContent(DRAFT);
    await waitFor(() => expect(saveDraft()).toBeDisabled());
    expect(publish()).toBeDisabled();
    expect(restoreUnavailable()).toBe(true);
    expect(unload()).toBe(false);
    await waitPastAutosave();
    expect(saves).toEqual([]);
  });

  it('sends nothing when the admin cancels the question', async () => {
    const discards = acceptDiscards();
    const text = await renderEditor({ body: DRAFT, revision: 3 });

    fireEvent.click(restore()!);
    const question = await screen.findByRole('dialog', { name: RESTORE });
    fireEvent.click(within(question).getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: RESTORE })).not.toBeInTheDocument(),
    );
    expect(discards).toEqual([]);
    expect(text).toHaveTextContent(DRAFT);
  });

  // No draft is open, so there is nothing on the server to delete: only the unsaved text goes. An unmocked discard would fail
  // the test, as MSW refuses an operation nothing answers.
  it('puts the published text back over unsaved changes with no draft open, sending nothing', async () => {
    const saves = recordSaves();
    const text = await renderEditor({ body: PUBLISHED, revision: null });
    // Precondition: unchanged, with no draft, there is nothing to restore.
    expect(restoreUnavailable()).toBe(true);
    await change(text);
    expect(restoreUnavailable()).toBe(false);

    await restoreAndConfirm();

    await waitFor(() => expect(saveDraft()).toBeDisabled());
    expect(text).toHaveTextContent(PUBLISHED);
    expect(text.querySelector('strong')).toBeNull();
    expect(publish()).toBeDisabled();
    expect(restoreUnavailable()).toBe(true);
    expect(unload()).toBe(false);
    await waitPastAutosave();
    expect(saves).toEqual([]);
  });

  it('is unavailable with no draft open and no changes', async () => {
    const text = await renderEditor({ body: PUBLISHED, revision: null });

    expect(text).toHaveTextContent(PUBLISHED);
    // Why it could have been offered: the editor is drawn and ready to change.
    expect(saveDraft()).toBeDisabled();
    expect(restoreUnavailable()).toBe(true);
  });
});
