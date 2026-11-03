import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PublishDocumentDraftMutation,
  PublishDocumentDraftMutationVariables,
  SaveDocumentDraftMutation,
  SaveDocumentDraftMutationVariables,
} from '@/gql/graphql';
import { HttpResponse } from 'msw/http';
import { graphqlLink, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { warmImport } from '../../support/warm-import';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');

// The editor is a lazy chunk: its first import is slow under coverage and would overrun findByRole's 1 s wait.
warmImport(() => import('@/components/DocumentEditor/editor'));
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// What the editor does around a write: a publish reads the page again, so what the page drew from the server (the version
// number, the mailing panel) describes the version just published; and typed text is not lost to a link, a tab close or a reload.

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
});

/** A link elsewhere on the page, as the site menu is. */
function Go() {
  const navigation = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigation.navigate('/compendium')}>
      Compendium
    </button>
  );
}

/** Renders the editor on its page, in the site's NavigationProvider, with an open draft at `revision`. */
async function renderOnPage({ revision = null }: { revision?: number | null } = {}) {
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
      <Go />
    </NavigationProvider>,
  );
  return screen.findByRole('textbox', { name: 'Document Text' });
}

/** Changes the text as a keeper does, by bolding a word, and waits until the editor reads it as unsaved. */
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
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  fireEvent.click(
    within(screen.getByRole('toolbar', { name: 'Document Text Formatting' })).getByRole('button', {
      name: 'Bold',
    }),
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled());
}

/** A tab close or reload as the browser raises it: true when something cancelled it. */
function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const link = () => screen.getByRole('button', { name: 'Compendium' });
const asking = () => screen.queryByRole('dialog', { name: 'Discard Changes?' });

describe('publishing', () => {
  it('reads the page again once the publish lands', async () => {
    const sent: PublishDocumentDraftMutationVariables[] = [];
    mockGraphQLMutation<PublishDocumentDraftMutation, PublishDocumentDraftMutationVariables>(
      'PublishDocumentDraft',
      (variables) => {
        sent.push(variables);
        return { publishDocumentDraft: { number: 2 } };
      },
    );
    await renderOnPage({ revision: 3 });

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const question = await screen.findByRole('dialog', { name: 'Publish Disclaimer' });
    fireEvent.click(within(question).getByRole('button', { name: 'Publish' }));

    // Precondition: the publish was sent, with the open draft's revision.
    await waitFor(() => expect(sent).toEqual([{ documentId: 'd1', expectedRevision: 3 }]));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });
});

// The guard's shape (Keep Editing, Discard Changes, a dialog outside the form) is proved once at
// tests/components/Modal/discard.test.tsx; this is the editor's wiring of it.
describe('leaving with unsaved changes', () => {
  it('holds a link and a tab close once the text is changed', async () => {
    const text = await renderOnPage();
    // Precondition: unchanged, a link goes at once and a tab close is let through.
    expect(unload()).toBe(false);

    await change(text);

    expect(unload()).toBe(true);
    fireEvent.click(link());
    // The question takes the focus from the editor, which updates after the click, so the question is awaited.
    expect(await screen.findByRole('dialog', { name: 'Discard Changes?' })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('lets a link and a tab close go once the change is saved', async () => {
    const saved: string[] = [];
    mockGraphQLMutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
      'SaveDocumentDraft',
      (variables) => {
        saved.push(variables.body);
        return { saveDocumentDraft: { id: 'd1', revision: 1 } };
      },
    );
    const text = await renderOnPage();
    await change(text);
    // Precondition: the change is held before it is saved.
    expect(unload()).toBe(true);

    const save = screen.getByRole('button', { name: 'Save Draft' });
    fireEvent.click(save);
    await waitFor(() => expect(saved).toHaveLength(1));
    // Found by name: while the save is in flight the button is named Saving Draft, so this waits for the save to land.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled());

    expect(unload()).toBe(false);
    fireEvent.click(link());
    expect(asking()).toBeNull();
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/compendium');
  });

  // A publish with changed text saves them first, so they are on their way to the server, as a save in flight is.
  it('lets a tab close go while a publish of the changed text is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saved: string[] = [];
    server.use(
      graphqlLink.mutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
        'SaveDocumentDraft',
        async ({ variables }) => {
          saved.push(variables.body);
          await gate;
          return HttpResponse.json({ data: { saveDocumentDraft: { id: 'd1', revision: 1 } } });
        },
      ),
    );
    mockGraphQLMutation<PublishDocumentDraftMutation, PublishDocumentDraftMutationVariables>(
      'PublishDocumentDraft',
      () => ({ publishDocumentDraft: { number: 2 } }),
    );
    const text = await renderOnPage();
    await change(text);
    // Precondition: the change is held before the publish starts.
    expect(unload()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const question = await screen.findByRole('dialog', { name: 'Publish Disclaimer' });
    fireEvent.click(within(question).getByRole('button', { name: 'Publish' }));
    // Precondition: the publish is in flight, its save sent and not yet answered.
    await waitFor(() => expect(saved).toHaveLength(1));

    // Released even when the check fails, so the request ends before the test does.
    try {
      expect(unload()).toBe(false);
    } finally {
      release();
    }
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });
});
