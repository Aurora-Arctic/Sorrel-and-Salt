import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables } from '@/gql/graphql';
import { HttpResponse } from 'msw/http';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');
const { NavigationProvider } = await import('@/lib/navigation');

// The editor saves its draft as the other autosaving forms do, through the shared hook at its own timing (3 s after the last
// change, src/lib/autosave/use-autosave.ts); Save Draft still saves at once, and Publish waits while any save is in flight, so
// it never publishes a draft that a save is still writing.

/** The hook's wait after the last change, as the spell builder runs it: no new number for this form. */
const AUTOSAVE_DELAY_MS = 3000;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Renders the editor with no draft open unless `revision` says otherwise, on the published text. */
async function renderEditor({ revision = null }: { revision?: number | null } = {}) {
  render(
    <NavigationProvider>
      <DocumentEditor
        documentId="d1"
        documentKey="disclaimer"
        title="Disclaimer"
        lede="What the site does not promise."
        body="Fixturewort grows here."
        publishedBody="Fixturewort grows here."
        revision={revision}
        nextNumber={2}
      />
    </NavigationProvider>,
  );
  return screen.findByRole('textbox', { name: 'Document Text' });
}

/** Changes the text as an admin does, by bolding a word, and waits until the editor reads it as unsaved. */
async function change(text: HTMLElement): Promise<void> {
  const node = document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode() as Text;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, 'Fixturewort'.length);
  // The editor reads a selection on `selectionchange`, throttled, so the wait lets it land.
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

/** Records each draft save, answering the next revision at once. */
function acceptSaves(): SaveDocumentDraftMutationVariables[] {
  const sent: SaveDocumentDraftMutationVariables[] = [];
  mockGraphQLMutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
    'SaveDocumentDraft',
    (variables) => {
      sent.push(variables);
      return { saveDocumentDraft: { id: 'v2', revision: sent.length } };
    },
  );
  return sent;
}

/** Records each draft save and holds its answer until `release` is called. */
function holdSaves() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sent: SaveDocumentDraftMutationVariables[] = [];
  server.use(
    graphqlLink.mutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
      'SaveDocumentDraft',
      async ({ variables }) => {
        sent.push(variables);
        await gate;
        return HttpResponse.json({ data: { saveDocumentDraft: { id: 'v2', revision: 1 } } });
      },
    ),
  );
  return { sent, release };
}

const saveDraft = () => screen.getByRole('button', { name: 'Save Draft' });
const publish = () => screen.getByRole('button', { name: 'Publish' });

/** Lets the hook's timers and the answers they wait on run, as `ms` of time passing. */
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('autosave', () => {
  it('saves the draft once typing has stopped for the hook’s delay, and not before', async () => {
    const sent = acceptSaves();
    const text = await renderEditor();
    await change(text);

    await wait(AUTOSAVE_DELAY_MS - 100);
    expect(sent).toEqual([]);

    await wait(200);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ documentId: 'd1', expectedRevision: null });
    expect(sent[0]?.body).toContain('*Fixturewort*');
    // The draft is saved, so nothing is left for Save Draft.
    await waitFor(() => expect(saveDraft()).toBeDisabled());
  });

  it('sends the revision the last save answered with the next one', async () => {
    const sent = acceptSaves();
    const text = await renderEditor({ revision: 4 });
    await change(text);

    await wait(AUTOSAVE_DELAY_MS + 100);

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ expectedRevision: 4 });
  });

  // Another admin saved the draft since this editor read it: the save is refused, and the editor says why rather than
  // writing over it or trying again.
  it('shows the explaining failure on a stale revision, and sends no more', async () => {
    mockGraphQLError('SaveDocumentDraft', { code: 'STALE_WRITE', currentRevision: 5 });
    const text = await renderEditor({ revision: 4 });
    await change(text);

    await wait(AUTOSAVE_DELAY_MS + 100);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const sent = acceptSaves();
    await wait(AUTOSAVE_DELAY_MS * 2);
    expect(sent).toEqual([]);
  });
});

describe('Save Draft', () => {
  it('saves at once, without waiting for the autosave, and only once', async () => {
    const sent = acceptSaves();
    const text = await renderEditor();
    await change(text);

    fireEvent.click(saveDraft());

    // Well inside the autosave's delay: this save is the button's.
    await waitFor(() => expect(sent).toHaveLength(1), { timeout: AUTOSAVE_DELAY_MS / 3 });
    await waitFor(() => expect(saveDraft()).toBeDisabled());
    await wait(AUTOSAVE_DELAY_MS + 100);
    expect(sent).toHaveLength(1);
  });
});

describe('Publish while a save is in flight', () => {
  it('is disabled while an autosave is in flight, and enabled once it lands', async () => {
    const { sent, release } = holdSaves();
    const text = await renderEditor();
    await change(text);
    // Precondition: with the text changed, Publish is offered.
    expect(publish()).toBeEnabled();

    try {
      await wait(AUTOSAVE_DELAY_MS + 100);
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(publish()).toBeDisabled();
    } finally {
      release();
    }
    await waitFor(() => expect(publish()).toBeEnabled());
  });

  it('is disabled while Save Draft is in flight, and enabled once it lands', async () => {
    const { sent, release } = holdSaves();
    const text = await renderEditor();
    await change(text);
    expect(publish()).toBeEnabled();

    try {
      fireEvent.click(saveDraft());
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(publish()).toBeDisabled();
    } finally {
      release();
    }
    await waitFor(() => expect(publish()).toBeEnabled());
  });
});
