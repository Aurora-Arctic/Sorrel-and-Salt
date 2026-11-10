import { BaseBasicBlocksPlugin, BaseBasicMarksPlugin } from '@platejs/basic-nodes';
import { BaseFootnoteDefinitionPlugin, BaseFootnoteReferencePlugin } from '@platejs/footnote';
import { BaseLinkPlugin } from '@platejs/link';
import { LINK_SCHEMES } from '../../lib/link-address';
import { BaseListPlugin } from '@platejs/list';
import { MarkdownPlugin } from '@platejs/markdown';
import {
  BaseTableCellHeaderPlugin,
  BaseTableCellPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
} from '@platejs/table';
import { createSlateEditor, type Value } from 'platejs';
import remarkGfm from 'remark-gfm';

export const markdownPlugins = [
  BaseBasicBlocksPlugin,
  BaseBasicMarksPlugin,
  BaseLinkPlugin.configure({ options: { allowedSchemes: LINK_SCHEMES } }),
  BaseListPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
  BaseTableCellPlugin,
  BaseTableCellHeaderPlugin,
  BaseFootnoteDefinitionPlugin,
  BaseFootnoteReferencePlugin,
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
];

// Bullets are written as "-", and emphasis as "*", as the shipped documents are.
const stringifyOptions = {
  bullet: '-',
  emphasis: '_',
  strong: '*',
  rule: '-',
  listItemIndent: 'one',
} as const;

function markdownEditor() {
  return createSlateEditor({ plugins: markdownPlugins });
}

export function markdownToEditorValue(markdown: string): Value {
  return markdownEditor().getApi(MarkdownPlugin).markdown.deserialize(markdown) as Value;
}

// The serialiser writes an empty table cell or footnote definition as a lone zero-width space.
const emptyCell = /(\| )\u200B(?= \|)/g;
const emptyDefinition = /^(\[\^[^\]]+\]:) \u200B$/gm;
// The serialiser escapes a "[" that might open a link. A help body's `[[Term]]` mark and `::widget[name]` tag are checked on save
// against the raw text (src/modules/help/services/marks.ts), so they keep their brackets; with no link definition neither is a link.
const escapedMark = /\\\[\\\[/g;
const escapedWidget = /::widget\\\[/g;

export function editorValueToMarkdown(value: Value): string {
  const editor = markdownEditor();
  return editor
    .getApi(MarkdownPlugin)
    .markdown.serialize({ value, remarkStringifyOptions: stringifyOptions })
    .replace(emptyCell, '$1')
    .replace(emptyDefinition, '$1')
    .replace(escapedMark, '[[')
    .replace(escapedWidget, '::widget[')
    .trimEnd();
}
