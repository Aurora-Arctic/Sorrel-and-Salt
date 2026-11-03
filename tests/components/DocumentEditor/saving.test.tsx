import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PublishDocumentDraftMutation,
  PublishDocumentDraftMutationVariables,
  SaveDocumentDraftMutation,
  SaveDocumentDraftMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');
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
        revision={revision}
        nextNumber={2}
      />
      <Go />
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
    expect(asking()).toBeInTheDocument();
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
    await waitFor(() => expect(save).toBeDisabled());

    expect(unload()).toBe(false);
    fireEvent.click(link());
    expect(asking()).toBeNull();
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/compendium');
  });
});
