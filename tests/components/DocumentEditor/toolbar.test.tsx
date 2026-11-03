import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables } from '@/gql/graphql';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');

// The editor's toolbar offers only what the public page draws, and each button changes the document as its markdown shows:
// what is proved is the text a Save Draft sends, since that markdown is what a reader is shown once it is published.

/** The buttons the toolbar holds: everything the renderer draws that a toolbar can add, and nothing it cannot. */
const BUTTONS = [
  'Heading 2',
  'Heading 3',
  'Bold',
  'Italic',
  'Link',
  'Bulleted List',
  'Numbered List',
  'Table',
  'Footnote',
  'Undo',
  'Redo',
];

/** Renders the editor on `body`, and records the markdown each Save Draft sends. */
async function renderEditor(body: string) {
  const saved: string[] = [];
  mockGraphQLMutation<SaveDocumentDraftMutation, SaveDocumentDraftMutationVariables>(
    'SaveDocumentDraft',
    (variables) => {
      saved.push(variables.body);
      return { saveDocumentDraft: { id: 'd1', revision: saved.length } };
    },
  );
  render(
    <DocumentEditor
      documentId="d1"
      documentKey="disclaimer"
      title="Disclaimer"
      lede="What the site does not promise."
      body={body}
      publishedBody={body}
      revision={null}
      nextNumber={2}
    />,
  );
  const text = await screen.findByRole('textbox', { name: 'Document Text' });
  return { saved, text };
}

const toolbar = () => screen.getByRole('toolbar', { name: 'Document Text Formatting' });
const button = (name: string) => within(toolbar()).getByRole('button', { name });

/** Waits out the editor's throttled selection handler, inside `act`, so its state update lands before the next step. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

/** Clicks a toolbar button, as a pointer does, and lets the editor settle. */
async function press(name: string): Promise<void> {
  fireEvent.click(button(name));
  await settle();
}

/** The text node of the editor that holds `words`. */
function textNodeHolding(text: HTMLElement, words: string): Text {
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.includes(words)) return node as Text;
  }
  throw new Error(`No text node holds ${words}`);
}

/**
 * Selects `words` in the editor, as a drag over them would; with `caret`, puts the caret inside them instead.
 * The editor reads a selection on `selectionchange`, throttled, so the wait lets it land.
 */
async function select(text: HTMLElement, words: string, { caret = false } = {}): Promise<void> {
  const node = textNodeHolding(text, words);
  const start = node.textContent!.indexOf(words);
  const range = document.createRange();
  range.setStart(node, caret ? start + 1 : start);
  range.setEnd(node, caret ? start + 1 : start + words.length);
  await act(async () => {
    text.focus();
    fireEvent.focus(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
}

/** Clicks Save Draft and returns the markdown it sent. */
async function saveDraft(saved: string[]): Promise<string> {
  const save = screen.getByRole('button', { name: 'Save Draft' });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(save);
  await waitFor(() => expect(saved).toHaveLength(1));
  await waitFor(() => expect(save).toBeDisabled());
  return saved[0]!;
}

describe('the document editor’s toolbar', () => {
  it('holds exactly the buttons for what the public page draws', async () => {
    await renderEditor('Fixturewort grows here.');

    for (const name of BUTTONS) expect(button(name)).toBeEnabled();
    // Undo and Redo stay in the tab order with nothing to undo or redo, so they say so rather than being disabled.
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'true');
    expect(button('Redo')).toHaveAttribute('aria-disabled', 'true');
    // Nothing else: no image, underline, raw HTML or any other button the page could not draw.
    expect(within(toolbar()).getAllByRole('button')).toHaveLength(BUTTONS.length);
    for (const name of BUTTONS) expect(button(name).querySelector('svg')).not.toBeNull();
  });

  // Each block button turns the paragraph holding the caret into its block.
  it.each([
    ['Heading 2', '## Fixturewort grows here.'],
    ['Heading 3', '### Fixturewort grows here.'],
    ['Bulleted List', '- Fixturewort grows here.'],
    ['Numbered List', '1. Fixturewort grows here.'],
  ])('%s turns the paragraph holding the caret into %j', async (name, expected) => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'grows', { caret: true });

    await press(name);

    expect(await saveDraft(saved)).toBe(expected);
  });

  // Each mark button marks the selected words and nothing else.
  it.each([
    ['Bold', '**Fixturewort** grows here.'],
    ['Italic', '_Fixturewort_ grows here.'],
  ])('%s marks the selected words, saving %j', async (name, expected) => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');

    await press(name);

    expect(await saveDraft(saved)).toBe(expected);
  });

  it('Link asks for an address and links the selected words to it', async () => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');

    await press('Link');
    const dialog = await screen.findByRole('dialog', { name: 'Add Link' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Address' }), {
      target: { value: 'https://example.test/fixturewort' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Link' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add Link' })).toBeNull());

    expect(await saveDraft(saved)).toBe(
      '[Fixturewort](https://example.test/fixturewort) grows here.',
    );
  });

  it('Table inserts a table the markdown writes with a header row', async () => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'here', { caret: true });

    await press('Table');

    const markdown = await saveDraft(saved);
    expect(markdown).toMatch(/^Fixturewort grows here\.$/m);
    // A GFM table: a header row, then the delimiter row under it.
    expect(markdown).toMatch(/^\|.*\|\n\|(\s*:?-+:?\s*\|)+$/m);
  });

  // The next number after those in use, so a new note never takes an existing note's place.
  it('Footnote inserts the next note’s reference at the caret, and its definition', async () => {
    const { saved, text } = await renderEditor(
      'Fixturewort grows here.[^1] Testwort grows there.\n\n[^1]: A cited source.',
    );
    await select(text, 'there', { caret: true });

    await press('Footnote');

    const markdown = await saveDraft(saved);
    expect(markdown).toContain('Fixturewort grows here.[^1]');
    expect(markdown).toMatch(/\[\^2\]/);
    expect(markdown).toMatch(/^\[\^2\]:/m);
    expect(markdown).toMatch(/^\[\^1\]: A cited source\.$/m);
  });

  it('Undo takes back the last change and Redo makes it again', async () => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');
    await press('Bold');
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'false');

    await press('Undo');
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'true');
    expect(button('Redo')).toHaveAttribute('aria-disabled', 'false');
    await press('Redo');

    expect(await saveDraft(saved)).toBe('**Fixturewort** grows here.');
  });

  // Undoing back to the text last loaded or saved leaves nothing to save or publish.
  it('Undo back to the opened text leaves nothing to save or publish', async () => {
    const { text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');
    await press('Bold');
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled();

    await press('Undo');

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('Undo back to the saved draft leaves nothing to save', async () => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');
    await press('Bold');
    await saveDraft(saved);
    await select(text, 'grows');
    await press('Italic');
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled();

    await press('Undo');

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    // The saved draft is still there to publish.
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('Undo with nothing to undo changes nothing', async () => {
    const { saved, text } = await renderEditor('Fixturewort grows here.');
    await select(text, 'Fixturewort');
    await press('Bold');
    await press('Undo');
    await press('Undo');
    await press('Redo');
    await press('Redo');

    expect(await saveDraft(saved)).toBe('**Fixturewort** grows here.');
  });

  describe('reports whether the selection already has what a toggle button applies', () => {
    it('Bold, for the marked words, and again once it marks or unmarks them', async () => {
      const { text } = await renderEditor('**Fixturewort** grows here.');

      await select(text, 'Fixturewort', { caret: true });
      expect(button('Bold')).toHaveAttribute('aria-pressed', 'true');
      expect(button('Italic')).toHaveAttribute('aria-pressed', 'false');

      await select(text, 'grows');
      expect(button('Bold')).toHaveAttribute('aria-pressed', 'false');
      await press('Bold');
      await waitFor(() => expect(button('Bold')).toHaveAttribute('aria-pressed', 'true'));
    });

    it('a heading button, for the block holding the caret', async () => {
      const { text } = await renderEditor('## Fixturewort\n\nTestwort grows here.');

      await select(text, 'Fixturewort', { caret: true });
      expect(button('Heading 2')).toHaveAttribute('aria-pressed', 'true');
      expect(button('Heading 3')).toHaveAttribute('aria-pressed', 'false');

      await select(text, 'Testwort', { caret: true });
      expect(button('Heading 2')).toHaveAttribute('aria-pressed', 'false');
    });

    it('a list button, for the list item holding the caret', async () => {
      const { text } = await renderEditor('1. Fixturewort\n\nTestwort grows here.');

      await select(text, 'Fixturewort', { caret: true });
      expect(button('Numbered List')).toHaveAttribute('aria-pressed', 'true');
      expect(button('Bulleted List')).toHaveAttribute('aria-pressed', 'false');

      await select(text, 'Testwort', { caret: true });
      expect(button('Numbered List')).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
