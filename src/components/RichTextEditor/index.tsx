'use client';

import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import type { ReactElement } from 'react';
import { editorPlugins } from './elements';
import { editorValueToMarkdown, markdownToEditorValue } from './markdown';
import Toolbar from './toolbar';
import '../DocumentPage/index.scss';
import './index.scss';

// Markdown edited as the public page draws it, in a bordered box under a formatting toolbar. Its caller holds the editor, from
// `useRichTextEditor`, so it can read or replace the text; the library is large, so a caller loads its form with `next/dynamic`.

/** The editor for `markdown`, read once when it is made. */
export function useRichTextEditor(markdown: string) {
  return usePlateEditor({ plugins: editorPlugins, value: () => markdownToEditorValue(markdown) });
}

export type RichTextEditorInstance = ReturnType<typeof useRichTextEditor>;

/** The editor's text as Markdown, as a save would store it. */
export function markdownOf(editor: RichTextEditorInstance): string {
  return editorValueToMarkdown(editor.children as never);
}

const RichTextEditor = ({
  editor,
  label,
  onMarkdownChange,
  required,
  invalid,
  describedBy,
}: {
  editor: RichTextEditorInstance;
  /** The text box's accessible name; the toolbar is "<label> Formatting". */
  label: string;
  onMarkdownChange: (markdown: string) => void;
  required?: boolean;
  invalid?: boolean;
  /** The ids of the lines that describe the text box: its error, for a form's field. */
  describedBy?: string;
}): ReactElement => (
  <div className="document-page__body rich-text-editor">
    <Plate
      editor={editor}
      onValueChange={({ value }) => onMarkdownChange(editorValueToMarkdown(value as never))}
    >
      <Toolbar label={label} />
      <PlateContent
        aria-label={label}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
      />
    </Plate>
  </div>
);

export default RichTextEditor;
