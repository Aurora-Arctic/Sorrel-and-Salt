'use client';

import { insertTable } from '@platejs/table';
import { upsertLink } from '@platejs/link';
import { someList, toggleList } from '@platejs/list';
import { KEYS, type TRange } from 'platejs';
import { useEditorRef, useEditorSelection } from 'platejs/react';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useId,
  useRef,
  useState,
} from 'react';
import Modal from '../Modal';

// The editor's toolbar: one button for each thing the public page draws that a person can add. It is a single tab stop
// (the WAI-ARIA toolbar pattern), and a press keeps the editor's selection, so a button acts on what was selected.

type EditorRef = ReturnType<typeof useEditorRef>;

interface ToolbarButton {
  label: string;
  /** Whether the selection already has what the button applies; absent for a button that only adds. */
  pressed?: (editor: EditorRef) => boolean;
  run: (editor: EditorRef) => void;
}

const inBlock = (type: string) => (editor: EditorRef) =>
  Boolean(editor.selection) && editor.api.some({ match: { type } });

/** The top-level block holding the selection's end, or the document's end when nothing is selected. */
function nextBlockPath(editor: EditorRef): [number] {
  const index = editor.selection?.focus.path[0] ?? editor.children.length - 1;
  return [index + 1];
}

const BUTTONS: ToolbarButton[] = [
  {
    label: 'Heading 2',
    pressed: inBlock(KEYS.h2),
    run: (editor) => editor.tf.toggleBlock(KEYS.h2),
  },
  {
    label: 'Heading 3',
    pressed: inBlock(KEYS.h3),
    run: (editor) => editor.tf.toggleBlock(KEYS.h3),
  },
  {
    label: 'Bold',
    pressed: (editor) => Boolean(editor.api.hasMark(KEYS.bold)),
    run: (editor) => editor.tf.toggleMark(KEYS.bold),
  },
  {
    label: 'Italic',
    pressed: (editor) => Boolean(editor.api.hasMark(KEYS.italic)),
    run: (editor) => editor.tf.toggleMark(KEYS.italic),
  },
  // Link opens its own dialog, so `run` is not used.
  { label: 'Link', run: () => undefined },
  {
    label: 'Bulleted List',
    pressed: (editor) => Boolean(editor.selection) && someList(editor, 'disc'),
    run: (editor) => toggleList(editor, { listStyleType: 'disc' }),
  },
  {
    label: 'Numbered List',
    pressed: (editor) => Boolean(editor.selection) && someList(editor, 'decimal'),
    run: (editor) => toggleList(editor, { listStyleType: 'decimal' }),
  },
  {
    label: 'Table',
    run: (editor) =>
      insertTable(editor, { colCount: 2, rowCount: 2, header: true }, { at: nextBlockPath(editor) }),
  },
  { label: 'Footnote', run: (editor) => editor.tf.insert.footnote() },
];

/** The dialog that asks for a link's address, and links the words that were selected when it opened. */
function LinkDialog({ onAdd, onClose }: { onAdd: (url: string) => boolean; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const inputId = useId();
  const errorId = useId();

  function add() {
    if (onAdd(url.trim())) onClose();
    else setFailed(true);
  }

  return (
    <Modal title="Add Link" onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor={inputId}>
          Address
        </label>
        <input
          id={inputId}
          className="input"
          type="url"
          value={url}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? errorId : undefined}
          onChange={(event) => {
            setUrl(event.target.value);
            setFailed(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        {failed && (
          <p id={errorId} role="alert">
            Enter a full web address, such as https://example.com.
          </p>
        )}
      </div>
      <div className="form__actions">
        <button type="button" className="btn btn--solid" onClick={add}>
          Add Link
        </button>
        <button type="button" className="btn btn--quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

const Toolbar = (): ReactElement => {
  const editor = useEditorRef();
  // Read so the pressed states follow the selection and every edit.
  useEditorSelection();
  const [stop, setStop] = useState(0);
  const [linking, setLinking] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const linkSelection = useRef<TRange | null>(null);

  function press(button: ToolbarButton) {
    if (button.label === 'Link') {
      linkSelection.current = editor.selection ? { ...editor.selection } : null;
      setLinking(true);
      return;
    }
    button.run(editor);
  }

  function addLink(url: string): boolean {
    if (linkSelection.current) editor.tf.select(linkSelection.current);
    return upsertLink(editor, { url }) === true;
  }

  function closeLink() {
    setLinking(false);
    editor.tf.focus();
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const last = BUTTONS.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? Math.min(stop + 1, last)
        : event.key === 'ArrowLeft'
          ? Math.max(stop - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    setStop(target);
    buttons.current[target]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Document Text Formatting"
      className="document-editor__toolbar"
      onKeyDown={move}
    >
      {BUTTONS.map((button, index) => {
        const pressed = button.pressed?.(editor);
        return (
          <button
            key={button.label}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            className="btn btn--quiet btn--small"
            tabIndex={index === stop ? 0 : -1}
            aria-pressed={pressed}
            // A press must not move the focus out of the text, or the selection it acts on is lost.
            onMouseDown={(event: MouseEvent) => event.preventDefault()}
            onFocus={() => setStop(index)}
            onClick={() => press(button)}
          >
            {button.label}
          </button>
        );
      })}
      {linking && <LinkDialog onAdd={addLink} onClose={closeLink} />}
    </div>
  );
};

export default Toolbar;
