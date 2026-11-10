'use client';

import { FootnoteReferencePlugin } from '@platejs/footnote/react';
import { insertTable } from '@platejs/table';
import { upsertLink } from '@platejs/link';
import { someList, toggleList } from '@platejs/list';
import { KEYS, type TRange } from 'platejs';
import { useEditorRef, useEditorSelection, useEditorVersion } from 'platejs/react';
import { type KeyboardEvent, type MouseEvent, type ReactElement, useRef, useState } from 'react';
import IconTip, {
  BoldIcon,
  BulletListIcon,
  FootnoteIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  NumberListIcon,
  PullQuoteIcon,
  RedoIcon,
  TableIcon,
  UndoIcon,
} from '../IconTip';
import LinkDialog from './link-dialog';

// The editor's toolbar: one button for each thing the public page draws that a person can add. It is a single tab stop
// (the WAI-ARIA toolbar pattern), and a press keeps the editor's selection, so a button acts on what was selected.

type EditorRef = ReturnType<typeof useEditorRef>;

interface ToolbarButton {
  label: string;
  icon: ReactElement;
  pressed?: (editor: EditorRef) => boolean;
  available?: (editor: EditorRef) => boolean;
  run: (editor: EditorRef) => void;
}

const inBlock = (type: string) => (editor: EditorRef) =>
  Boolean(editor.selection) && editor.api.some({ match: { type } });

// A quote wraps its paragraph, so taking it back is an unwrap; toggleBlock would only wrap again.
function toggleQuote(editor: EditorRef): void {
  if (inBlock(KEYS.blockquote)(editor))
    editor.tf.unwrapNodes({ match: { type: KEYS.blockquote }, split: true });
  else editor.tf.toggleBlock(KEYS.blockquote);
}

// Wrapping or unwrapping a block leaves the selection null or pointing at a path that no longer holds text, which
// stops the pressed state and a second press; the caret goes back to the end of the same top-level block.
function keepSelection(editor: EditorRef, change: () => void): void {
  const index = editor.selection?.focus.path[0];
  change();
  if (index === undefined || index >= editor.children.length) return;
  const end = editor.api.end([index]);
  editor.tf.select(end);
  // The remounted block has no browser selection yet, and the browser would report none back.
  setTimeout(() => editor.tf.focus({ at: end }), 0);
}

function nextBlockPath(editor: EditorRef): [number] {
  const index = editor.selection?.focus.path[0] ?? editor.children.length - 1;
  return [index + 1];
}

const GROUPS: { label: string; buttons: ToolbarButton[] }[] = [
  {
    label: 'Blocks',
    buttons: [
      {
        label: 'Heading 2',
        icon: <Heading2Icon />,
        pressed: inBlock(KEYS.h2),
        run: (editor) => editor.tf.toggleBlock(KEYS.h2),
      },
      {
        label: 'Heading 3',
        icon: <Heading3Icon />,
        pressed: inBlock(KEYS.h3),
        run: (editor) => editor.tf.toggleBlock(KEYS.h3),
      },
      {
        label: 'Pull Quote',
        icon: <PullQuoteIcon />,
        pressed: inBlock(KEYS.blockquote),
        run: (editor) => keepSelection(editor, () => toggleQuote(editor)),
      },
    ],
  },
  {
    label: 'Text',
    buttons: [
      {
        label: 'Bold',
        icon: <BoldIcon />,
        pressed: (editor) => Boolean(editor.api.hasMark(KEYS.bold)),
        run: (editor) => editor.tf.toggleMark(KEYS.bold),
      },
      {
        label: 'Italic',
        icon: <ItalicIcon />,
        pressed: (editor) => Boolean(editor.api.hasMark(KEYS.italic)),
        run: (editor) => editor.tf.toggleMark(KEYS.italic),
      },
      { label: 'Link', icon: <LinkIcon />, run: () => undefined },
    ],
  },
  {
    label: 'Lists',
    buttons: [
      {
        label: 'Bulleted List',
        icon: <BulletListIcon />,
        pressed: (editor) => Boolean(editor.selection) && someList(editor, 'disc'),
        run: (editor) => toggleList(editor, { listStyleType: 'disc' }),
      },
      {
        label: 'Numbered List',
        icon: <NumberListIcon />,
        pressed: (editor) => Boolean(editor.selection) && someList(editor, 'decimal'),
        run: (editor) => toggleList(editor, { listStyleType: 'decimal' }),
      },
    ],
  },
  {
    label: 'Insert',
    buttons: [
      {
        label: 'Table',
        icon: <TableIcon />,
        run: (editor) =>
          insertTable(
            editor,
            { colCount: 2, rowCount: 2, header: true },
            { at: nextBlockPath(editor) },
          ),
      },
      {
        label: 'Footnote',
        icon: <FootnoteIcon />,
        run: (editor) => editor.getTransforms(FootnoteReferencePlugin).insert.footnote(),
      },
    ],
  },
  {
    label: 'History',
    buttons: [
      {
        label: 'Undo',
        icon: <UndoIcon />,
        available: (editor) => editor.history.undos.length > 0,
        run: (editor) => editor.tf.undo(),
      },
      {
        label: 'Redo',
        icon: <RedoIcon />,
        available: (editor) => editor.history.redos.length > 0,
        run: (editor) => editor.tf.redo(),
      },
    ],
  },
];

const BUTTONS = GROUPS.flatMap((group) => group.buttons);

/** `label` names the text the toolbar formats; the toolbar is "<label> Formatting". */
const Toolbar = ({ label }: { label: string }): ReactElement => {
  const editor = useEditorRef();
  // Read so the pressed and available states follow the selection and every edit.
  useEditorSelection();
  useEditorVersion();
  const [stop, setStop] = useState(0);
  const [linking, setLinking] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const linkSelection = useRef<TRange | null>(null);

  function press(button: ToolbarButton) {
    if (button.available?.(editor) === false) return;
    if (button.label === 'Link') {
      linkSelection.current = editor.selection ? { ...editor.selection } : null;
      setLinking(true);
      return;
    }
    button.run(editor);
  }

  function addLink(url: string): boolean {
    // An editor never clicked into has no selection, and upsertLink adds nothing without one: the address goes at the end.
    if (linkSelection.current) editor.tf.select(linkSelection.current);
    else if (!editor.selection) editor.tf.select(editor.api.end([]));
    return upsertLink(editor, { url }) === true;
  }

  function closeLink() {
    setLinking(false);
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
      aria-label={`${label} Formatting`}
      className="rich-text-editor__toolbar"
      // Focusable by script only: the arrow-key handler sits here, and the buttons hold the one tab stop.
      tabIndex={-1}
      onKeyDown={move}
    >
      {GROUPS.map((group) => (
        <div
          key={group.label}
          role="group"
          aria-label={group.label}
          className="rich-text-editor__group"
        >
          {group.buttons.map((button) => {
            const index = BUTTONS.indexOf(button);
            const pressed = button.pressed?.(editor);
            const unavailable = button.available ? !button.available(editor) : undefined;
            return (
              <IconTip key={button.label} tip={button.label} placement="below">
                <button
                  ref={(node) => {
                    buttons.current[index] = node;
                  }}
                  type="button"
                  className="btn btn--quiet btn--icon"
                  aria-label={button.label}
                  tabIndex={index === stop ? 0 : -1}
                  aria-pressed={pressed}
                  // aria-disabled, not disabled, so the button keeps its place in the arrow-key order.
                  aria-disabled={unavailable}
                  // A press must not move the focus out of the text, or the selection it acts on is lost.
                  onMouseDown={(event: MouseEvent) => event.preventDefault()}
                  onFocus={() => setStop(index)}
                  onClick={() => press(button)}
                >
                  {button.icon}
                </button>
              </IconTip>
            );
          })}
        </div>
      ))}
      {linking && (
        <LinkDialog
          onAdd={addLink}
          onClose={closeLink}
          returnTo={() => editor.api.toDOMNode(editor) ?? null}
        />
      )}
    </div>
  );
};

export default Toolbar;
